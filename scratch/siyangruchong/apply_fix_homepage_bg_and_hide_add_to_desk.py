import os
import sys
import gzip
import struct
from PIL import Image
import UnityPy
from UnityPy.files import ObjectReader

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 校验
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

target_data_unity3d = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
bg_path = r'reverse/siyangruchong-tt-minigame/bg.png'

print('================================================================')
print('=== 1. 读取原始干净 bundle 提取标准的 124 字节头与 42 字节尾 ===')
print('================================================================')
with gzip.open('extracted/siyangruchong_package/Build/siyangruchong.data.unityweb', 'rb') as f:
    buf = f.read()

header_len = struct.unpack('<I', buf[16:20])[0]
pos = 20
while pos < header_len:
    offset, length, path_len = struct.unpack('<III', buf[pos:pos+12])
    pos += 12
    rel_path = buf[pos:pos+path_len].decode('utf-8', errors='replace')
    pos += path_len
    if rel_path == 'data.unity3d':
        orig_unity3d_bytes = buf[offset:offset+length]
        break

env_orig = UnityPy.load(orig_unity3d_bytes)
sa0_orig = [a for a in env_orig.assets if a.name == 'sharedassets0.assets'][0]
raw_clean = sa0_orig.objects[12].get_raw_data()
assert len(raw_clean) == 498244, f"原始大小异常: {len(raw_clean)}"
header_124 = raw_clean[:124]
tail_42 = raw_clean[124 + 498078:]
assert len(tail_42) == 42
print('✓ 原始 124 字节头部（含 MipCount=9 等所有元数据）及 42 字节尾部提取完毕')

print('================================================================')
print('=== 2. 由 bg.png 生成 9 级完整 Mipmap 链并原位构建二进制块 ===')
print('================================================================')
base_img = Image.open(bg_path).convert('RGB')
assert base_img.size == (511, 244), f"背景图尺寸异常: {base_img.size}"

w, h = 511, 244
mip_bytes = bytearray()
for i in range(9):
    mw = max(1, w >> i)
    mh = max(1, h >> i)
    mip_img = base_img if i == 0 else base_img.resize((mw, mh), Image.Resampling.LANCZOS)
    # Unity 规范：纵向翻转为底到顶排布
    flipped = mip_img.transpose(Image.FLIP_TOP_BOTTOM)
    b = flipped.tobytes()
    assert len(b) == mw * mh * 3
    mip_bytes.extend(b)
    print(f'  ✓ Mip {i}: {mw}x{mh} ({len(b)} 字节)')

assert len(mip_bytes) == 498078
new_raw = header_124 + bytes(mip_bytes) + tail_42
assert len(new_raw) == 498244
print(f'✓ 新二进制数据组装成功，总长度精确维持 498244 字节')

print('================================================================')
print('=== 3. 加载当前 data.unity3d 执行原位注入与隐藏桌面图标 ===')
print('================================================================')
env = UnityPy.load(target_data_unity3d)

# 1. 替换首页背景贴图
sa0 = [a for a in env.assets if a.name == 'sharedassets0.assets'][0]
sa0.objects[12].set_raw_data(new_raw)
print('✓ [原位替换成功] sharedassets0.assets 中的 Texture2D (PID=12) 已更新')

# 2. 隐藏添加到桌面按钮 (addicon)
level0 = [a for a in env.assets if a.name == 'level0'][0]
go6 = level0.objects[6].read() # addicon GameObject
go6.m_IsActive = False
go6.save()

rt62 = level0.objects[62].read() # addicon RectTransform
rt62.m_LocalScale.x = 0.0
rt62.m_LocalScale.y = 0.0
rt62.m_LocalScale.z = 0.0
rt62.m_AnchoredPosition.x = -9999.0
rt62.m_AnchoredPosition.y = -9999.0
rt62.save()
print('✓ [隐藏成功] level0 中的 addicon 按钮 (GameObject PID=6 & RectTransform PID=62) 已设为非激活并移出视野')

# 3. 保存 bundle
saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 保存成功，文件大小: {len(saved_bundle)} 字节')

print('================================================================')
print('=== 4. 严格全量反序列化与自检校验 ===')
print('================================================================')
env_check = UnityPy.load(target_data_unity3d)
sa0_check = [a for a in env_check.assets if a.name == 'sharedassets0.assets'][0]
tex_check_obj = sa0_check.objects[12]
assert tex_check_obj.byte_size == 498244, f"byte_size 异常: {tex_check_obj.byte_size}"
tex_check = tex_check_obj.read()
img_read = tex_check.image
assert img_read.size == (511, 244)
diff_pixels = 0
for x in range(511):
    for y in range(244):
        if img_read.getpixel((x, y)) != base_img.getpixel((x, y)):
            diff_pixels += 1
assert diff_pixels == 0, f"像素差异数: {diff_pixels}"
print(f'✓ 贴图反序列化自检 100% 通过: byte_size=498244 恒定, 像素差异=0')

level0_check = [a for a in env_check.assets if a.name == 'level0'][0]
go6_check = level0_check.objects[6].read()
assert go6_check.m_IsActive == False
print('✓ addicon 状态自检通过: m_IsActive=False')

print('================================================================')
print('=== 5. 重新打包核心数据包 siyangruchong.data ===')
print('================================================================')
unpacked_dir = r'extracted/siyangruchong_package/unpacked_unityweb'
target_data_path = r'cdn_assets/Build/siyangruchong.data'

file_list = []
for root, dirs, files in os.walk(unpacked_dir):
    for f in sorted(files):
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, unpacked_dir).replace('\\', '/')
        file_list.append((rel_path, full_path))

file_list.sort(key=lambda x: x[0])

header_len = 20
for rel_path, full_path in file_list:
    p_bytes = rel_path.encode('utf-8')
    header_len += 12 + len(p_bytes)

current_offset = header_len
entries_meta = []
file_blobs = []

for rel_path, full_path in file_list:
    with open(full_path, 'rb') as f:
        blob = f.read()
    p_bytes = rel_path.encode('utf-8')
    entries_meta.append((current_offset, len(blob), len(p_bytes), p_bytes))
    current_offset += len(blob)
    file_blobs.append(blob)

packed_bytes = bytearray()
packed_bytes.extend(b'UnityWebData1.0\x00')
packed_bytes.extend(struct.pack('<I', header_len))

for off, length, path_len, p_bytes in entries_meta:
    packed_bytes.extend(struct.pack('<III', off, length, path_len))
    packed_bytes.extend(p_bytes)

for blob in file_blobs:
    packed_bytes.extend(blob)

with open(target_data_path, 'wb') as f:
    f.write(packed_bytes)

print(f'✓ 已成功打包 siyangruchong.data: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)')
print('🎉 所有处理全部成功完成！')
