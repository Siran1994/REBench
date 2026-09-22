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

print('\n=== 2. 调整设置按钮 (SettingsButton) 贴合左侧小红色方框 ===')
# SettingsButton GO PID: 718, 寻找其 RectTransform
s_go = level1_asset.objects[718].read()
s_rt = None
for c in s_go.m_Components:
    if c.deref().type.name == 'RectTransform':
        s_rt = c.deref().read()
        break

print(f'  [调整前] SettingsButton Pos: ({s_rt.m_AnchoredPosition.x}, {s_rt.m_AnchoredPosition.y})')
s_rt.m_AnchoredPosition.x = 516.0
s_rt.m_AnchoredPosition.y = 410.0
s_rt.save()
print(f'  ✓ [调整后] SettingsButton Pos: ({s_rt.m_AnchoredPosition.x}, {s_rt.m_AnchoredPosition.y}) -> 完美贴合左侧小红色方框')

print('\n=== 3. 调整 4 个选项类别按钮 (Buttons) 上移并居中展示 ===')
# Buttons RectTransform PID: 3350
b_rt = level1_asset.objects[3350].read()
print(f'  [调整前] Buttons Pos: ({b_rt.m_AnchoredPosition.x}, {b_rt.m_AnchoredPosition.y})')
b_rt.m_AnchoredPosition.y = 380.0
b_rt.save()
print(f'  ✓ [调整后] Buttons Pos: ({b_rt.m_AnchoredPosition.x}, {b_rt.m_AnchoredPosition.y}) -> 上移 74 单位')

# 调整 4 个子按钮使其在 Buttons 内部严格对称居中
# FoodButton, WormsButton, GlobalButton, HelpersButton
target_xs = [-142.5, -47.5, 47.5, 142.5]
for idx, ch_ref in enumerate(b_rt.m_Children):
    ch_rt = ch_ref.deref().read()
    ch_go = ch_rt.m_GameObject.deref().read()
    old_x = ch_rt.m_AnchoredPosition.x
    ch_rt.m_AnchoredPosition.x = target_xs[idx]
    ch_rt.save()
    print(f'    子按钮 {ch_go.m_Name}: X 由 {old_x} 调整为 {target_xs[idx]} (对称居中)')

print('\n=== 4. 调整食物大标题 (FoodText) 垂直位置协调 ===')
# FoodText RectTransform PID: 3005
ft_rt = level1_asset.objects[3005].read()
print(f'  [调整前] FoodText Pos: ({ft_rt.m_AnchoredPosition.x}, {ft_rt.m_AnchoredPosition.y})')
ft_rt.m_AnchoredPosition.y = 260.0
ft_rt.save()
print(f'  ✓ [调整后] FoodText Pos: ({ft_rt.m_AnchoredPosition.x}, {ft_rt.m_AnchoredPosition.y}) -> 协调紧随类别按钮下方')

print('\n=== 5. 保存并持久化 data.unity3d ===')
saved_bundle = env.file.save()
with open(target_data_unity3d, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 保存成功，文件大小: {len(saved_bundle)} 字节')

print('\n=== 6. 重新打包核心数据包 siyangruchong.data ===')
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
