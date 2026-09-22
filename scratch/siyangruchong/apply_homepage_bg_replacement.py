import os
import sys
import struct
import UnityPy
from UnityPy.files import ObjectReader
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 24字节校验限制
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

target_data_unity3d = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
bg_path = r'reverse/siyangruchong-tt-minigame/bg.png'

print('=== 1. 加载新背景图与 Unity 核心数据包 ===')
if not os.path.exists(bg_path):
    raise FileNotFoundError(f'未找到新背景图: {bg_path}')

bg_img = Image.open(bg_path).convert('RGB')
print(f'✓ 新背景图加载成功: {bg_path}, 尺寸: {bg_img.size}, 模式: {bg_img.mode}')

env = UnityPy.load(target_data_unity3d)
sa0 = [a for a in env.assets if a.name == 'sharedassets0.assets'][0]
tex_obj = sa0.objects[12].read()
print(f'✓ 找到目标首页背景 Texture2D (PID=12): {tex_obj.m_Name}, 当前尺寸: {tex_obj.m_Width}x{tex_obj.m_Height}')

print('\n=== 2. 替换 Texture2D 图像数据 ===')
tex_obj.image = bg_img
tex_obj.save()
print('✓ Texture2D (PID=12) 像素数据已成功更新为 bg.png')

print('\n=== 3. 保存并持久化 data.unity3d ===')
saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 保存成功，文件大小: {len(saved_bundle)} 字节')

print('\n=== 4. 重新打包核心数据包 siyangruchong.data ===')
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

print('\n=== 5. 验证更新后的数据包 ===')
env_verify = UnityPy.load(target_data_unity3d)
sa0_verify = [a for a in env_verify.assets if a.name == 'sharedassets0.assets'][0]
tex_verify = sa0_verify.objects[12].read()
verify_img = tex_verify.image
print(f'✓ 验证读取新贴图尺寸: {verify_img.size}')
diff_count = 0
for x in range(verify_img.width):
    for y in range(verify_img.height):
        if bg_img.getpixel((x, y))[:3] != verify_img.getpixel((x, y))[:3]:
            diff_count += 1
print(f'✓ 像素比对差异: {diff_count} (完全一致: {diff_count == 0})')
