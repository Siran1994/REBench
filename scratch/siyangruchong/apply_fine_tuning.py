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

print('\n=== 2. 设置按钮再上移 20px (Canvas +53 单位) ===')
# SettingsButton GO PID: 718
s_go = level1_asset.objects[718].read()
s_rt = None
for c in s_go.m_Components:
    if c.deref().type.name == 'RectTransform':
        s_rt = c.deref().read()
        break

print(f'  [微调前] SettingsButton Pos: ({s_rt.m_AnchoredPosition.x}, {s_rt.m_AnchoredPosition.y})')
# 当前 Y = 410.0，上移 20px (对应 Canvas +53 单位) -> 463.0
s_rt.m_AnchoredPosition.y = 463.0
s_rt.save()
print(f'  ✓ [微调后] SettingsButton Pos: ({s_rt.m_AnchoredPosition.x}, {s_rt.m_AnchoredPosition.y})')

print('\n=== 3. 食物等道具滑动列表向左平移 10~15px (Canvas -32 单位) 居中展示 ===')
# FoodShopPanel PID: 3147
f_rt = level1_asset.objects[3147].read()
print(f'  [微调前] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y})')
# 当前 Pos.x = -238.0，向左移动约 12px (对应 Canvas -32 单位) -> -270.0
f_rt.m_AnchoredPosition.x = -270.0
f_rt.save()
print(f'  ✓ [微调后] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y})')

# 同步微调其他商店面板
for pid, name in [(2797, 'WormShopPanel'), (2714, 'RoomShopPanel'), (2858, 'HelpersShopPanel')]:
    rt = level1_asset.objects[pid].read()
    rt.m_AnchoredPosition.x = -270.0
    rt.save()
    print(f'  ✓ 同步对齐 {name} (PID={pid}) Pos.x -> -270.0')

print('\n=== 4. 保存并持久化 data.unity3d ===')
saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 保存成功，文件大小: {len(saved_bundle)} 字节')

print('\n=== 5. 重新打包核心数据包 siyangruchong.data ===')
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
