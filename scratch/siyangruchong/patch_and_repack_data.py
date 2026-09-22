import os
import struct
import sys
import UnityPy

sys.stdout.reconfigure(encoding='utf-8')

print('=== 步骤 1: 使用 UnityPy 修改 ActiveAbilitiesPanel 坐标 ===')
data_unity3d_path = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
env = UnityPy.load(data_unity3d_path)

asset = [a for a in env.assets if a.name == 'level1'][0]
rt_obj = asset.objects[2333].read()
print(f'原始 ActiveAbilitiesPanel 坐标: ({rt_obj.m_AnchoredPosition.x}, {rt_obj.m_AnchoredPosition.y})')

# 上移至用户红框位置 (Y = 318.0，严丝合缝贴合左上红框)
rt_obj.m_AnchoredPosition.y = 318.0
rt_obj.save()
print(f'修改后 ActiveAbilitiesPanel 坐标: ({rt_obj.m_AnchoredPosition.x}, {rt_obj.m_AnchoredPosition.y})')

# 写回 data.unity3d
with open(data_unity3d_path, 'wb') as f:
    f.write(env.file.save())
print(f'✓ data.unity3d 已成功写回: {data_unity3d_path}')

# 验证写回结果
env_check = UnityPy.load(data_unity3d_path)
asset_check = [a for a in env_check.assets if a.name == 'level1'][0]
rt_check = asset_check.objects[2333].read()
print(f'✓ 重新加载验证坐标: ({rt_check.m_AnchoredPosition.x}, {rt_check.m_AnchoredPosition.y})')
assert rt_check.m_AnchoredPosition.y == 318.0, '坐标验证失败!'

print('\n=== 步骤 2: 重新打包 UnityWebData1.0 核心数据包 ===')
unpacked_dir = r'extracted/siyangruchong_package/unpacked_unityweb'
target_data_path = r'cdn_assets/Build/siyangruchong.data'

# 遍历 unpacked_dir 下的所有文件，保持相对路径
entries = []
total_file_data_len = 0

# 按照确定性顺序排序
file_list = []
for root, dirs, files in os.walk(unpacked_dir):
    for f in sorted(files):
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, unpacked_dir).replace('\\', '/')
        file_list.append((rel_path, full_path))

file_list.sort(key=lambda x: x[0])

# 计算 header 长度
# 头部: magic (16 bytes) + header_length (4 bytes) = 20 bytes
# 每个条目: offset (4) + length (4) + path_len (4) + path_bytes
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

# 写入数据包
packed_bytes = bytearray()
packed_bytes.extend(b'UnityWebData1.0\x00')
packed_bytes.extend(struct.pack('<I', header_len))

for off, length, path_len, p_bytes in entries_meta:
    packed_bytes.extend(struct.pack('<III', off, length, path_len))
    packed_bytes.extend(p_bytes)

for blob in file_blobs:
    packed_bytes.extend(blob)

os.makedirs(os.path.dirname(target_data_path), exist_ok=True)
with open(target_data_path, 'wb') as f:
    f.write(packed_bytes)

print(f'✓ 已成功重新生成 {target_data_path}: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)')

# 检查 magic 和 header
assert packed_bytes.startswith(b'UnityWebData1.0\x00')
print('✓ 打包验证 100% 通过!')
