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

print('\n=== 2. 调整 TableVisual (白菜叶) Scale 缩放为 85% 完整显示 ===')
tv_tr = level1_asset.objects[1207].read()
print(f'  [原始 Scale] TableVisual: ({tv_tr.m_LocalScale.x}, {tv_tr.m_LocalScale.y}, {tv_tr.m_LocalScale.z})')
tv_tr.m_LocalScale.x = 0.810
tv_tr.m_LocalScale.y = 0.927
tv_tr.m_LocalScale.z = 0.850
tv_tr.save()
print(f'  ✓ [调整后 Scale] TableVisual: ({tv_tr.m_LocalScale.x}, {tv_tr.m_LocalScale.y}, {tv_tr.m_LocalScale.z}) -> 缩小15%，四周波浪边完整呈现')

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

print(f"✓ 已成功打包 siyangruchong.data: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)")
