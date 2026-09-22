import os
import sys
import struct
import UnityPy
from UnityPy.files import ObjectReader

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 校验
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

target_data_unity3d = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'

print('=== 1. 加载 data.unity3d 并修改 SaveManager autosaveInterval ===')
env = UnityPy.load(target_data_unity3d)
level1 = [a for a in env.assets if a.name == 'level1'][0]

mb_reader = level1.objects[3488]
raw = mb_reader.get_raw_data()
orig_val = struct.unpack('<f', raw[44:48])[0]
print(f'  原 autosaveInterval: {orig_val} 秒')

# 改为 2.0 秒 (高频静默自动存盘)
new_raw = bytearray(raw)
new_raw[44:48] = struct.pack('<f', 2.0)
mb_reader.set_raw_data(bytes(new_raw))

saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)

# 验证
env2 = UnityPy.load(target_data_unity3d)
level1_2 = [a for a in env2.assets if a.name == 'level1'][0]
verify_val = struct.unpack('<f', level1_2.objects[3488].get_raw_data()[44:48])[0]
print(f'  ✓ 现 autosaveInterval: {verify_val} 秒 (每 2 秒自动触发 SaveGame 与 PlayerPrefs.Save)')
assert verify_val == 2.0

print('\n=== 2. 重新打包核心数据包 siyangruchong.data ===')
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
