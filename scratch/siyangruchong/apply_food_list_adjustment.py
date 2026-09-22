import os
import sys
import struct
import shutil
import UnityPy
from UnityPy.files import ObjectReader

sys.stdout.reconfigure(encoding='utf-8')

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

target_data_unity3d = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
print('=== 1. 加载 data.unity3d ===')
env = UnityPy.load(target_data_unity3d)
level1_asset = [a for a in env.assets if a.name == 'level1'][0]

print('\n=== 2. 调整 FoodShopPanel 位置 (使其严格对齐木框内部红框区域) ===')
# FoodShopPanel RectTransform PID: 3147
f_rt = level1_asset.objects[3147].read()
print(f'  [调整前] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y})')
f_rt.m_AnchoredPosition.x = -238.0
f_rt.save()
print(f'  ✓ [调整后] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y}) -> 向左平移 109 单位，对齐红框中心')

print('\n=== 3. 调整 FoodScrollView 尺寸与位置 (完美贴合红色方框) ===')
# FoodScrollView RectTransform PID: 2869
sv_rt = level1_asset.objects[2869].read()
print(f'  [调整前] FoodScrollView Pos: ({sv_rt.m_AnchoredPosition.x}, {sv_rt.m_AnchoredPosition.y}), Size: ({sv_rt.m_SizeDelta.x}, {sv_rt.m_SizeDelta.y})')
sv_rt.m_SizeDelta.x = 400.0
sv_rt.m_SizeDelta.y = 680.0
sv_rt.m_AnchoredPosition.x = 0.0
sv_rt.save()
print(f'  ✓ [调整后] FoodScrollView Pos: ({sv_rt.m_AnchoredPosition.x}, {sv_rt.m_AnchoredPosition.y}), Size: ({sv_rt.m_SizeDelta.x}, {sv_rt.m_SizeDelta.y})')

print('\n=== 4. 调整 FoodText (标题文字) 居中对齐在红框正上方 ===')
# FoodText RectTransform PID: 3005
ft_rt = level1_asset.objects[3005].read()
print(f'  [调整前] FoodText Pos: ({ft_rt.m_AnchoredPosition.x}, {ft_rt.m_AnchoredPosition.y})')
ft_rt.m_AnchoredPosition.x = 0.0
ft_rt.save()
print(f'  ✓ [调整后] FoodText Pos: ({ft_rt.m_AnchoredPosition.x}, {ft_rt.m_AnchoredPosition.y}) -> 居中对齐食物列表')

print('\n=== 5. 同步微调其他商店面板 (Worm, Room, Helpers) 对齐 ===')
for pid, name in [(2797, 'WormShopPanel'), (2714, 'RoomShopPanel'), (2858, 'HelpersShopPanel')]:
    rt = level1_asset.objects[pid].read()
    rt.m_AnchoredPosition.x = -238.0
    rt.save()
    print(f'  ✓ 同步对齐 {name} (PID={pid}) Pos.x -> -238.0')

print('\n=== 6. 保存并持久化 data.unity3d ===')
saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 保存成功，文件大小: {len(saved_bundle)} 字节')

print('\n=== 7. 重新打包核心数据包 siyangruchong.data ===')
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

print(f"✓ 已成功打包 siyangruchong.data: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)")
