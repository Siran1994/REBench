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

print('\n=== 2. 优化调整游戏背景菜叶 (TableVisual) 位置 ===')
# TableVisual Transform PID: 1207
tv_tr = level1_asset.objects[1207].read()
print(f'  [原始坐标] TableVisual LocalPosition: ({tv_tr.m_LocalPosition.x}, {tv_tr.m_LocalPosition.y}, {tv_tr.m_LocalPosition.z})')
tv_tr.m_LocalPosition.y = -0.190
tv_tr.save()
print(f'  ✓ [优化完成] TableVisual LocalPosition: ({tv_tr.m_LocalPosition.x}, {tv_tr.m_LocalPosition.y}, {tv_tr.m_LocalPosition.z}) -> 垂直居中')

print('\n=== 3. 优化调整右侧菜单栏框 (BG) 尺寸与对齐 (防拉伸) ===')
# BG RectTransform PID: 2951
bg_rt = level1_asset.objects[2951].read()
print(f'  [原始参数] BG SizeDelta: ({bg_rt.m_SizeDelta.x}, {bg_rt.m_SizeDelta.y}), Pos: ({bg_rt.m_AnchoredPosition.x}, {bg_rt.m_AnchoredPosition.y})')
bg_rt.m_SizeDelta.x = 520.0
bg_rt.m_SizeDelta.y = 980.0
bg_rt.m_AnchoredPosition.x = 895.0
bg_rt.m_AnchoredPosition.y = 0.0
bg_rt.save()
print(f'  ✓ [优化完成] BG SizeDelta: ({bg_rt.m_SizeDelta.x}, {bg_rt.m_SizeDelta.y}), Pos: ({bg_rt.m_AnchoredPosition.x}, {bg_rt.m_AnchoredPosition.y}) -> 宽高比恢复至 0.531，上下留白')

print('\n=== 4. 同步对齐顶部 Tab 按钮 (Buttons) ===')
# Buttons RectTransform PID: 3350
b_rt = level1_asset.objects[3350].read()
print(f'  [原始参数] Buttons Pos: ({b_rt.m_AnchoredPosition.x}, {b_rt.m_AnchoredPosition.y})')
b_rt.m_AnchoredPosition.x = 895.0
b_rt.save()
print(f'  ✓ [优化完成] Buttons Pos: ({b_rt.m_AnchoredPosition.x}, {b_rt.m_AnchoredPosition.y}) -> 水平居中对齐木框')

print('\n=== 5. 同步对齐 FoodShopPanel ===')
# FoodShopPanel RectTransform PID: 3147
f_rt = level1_asset.objects[3147].read()
print(f'  [原始参数] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y})')
# 保持居中在 895.0：因为 Shops 右边缘是 1170 - 146 = 1024，1024 - 895 = 129
# 原来 Pos.x = -209 对应中心 815，现在新中心 895 对应 Pos.x = -129
f_rt.m_AnchoredPosition.x = -129.0
f_rt.save()
print(f'  ✓ [优化完成] FoodShopPanel Pos: ({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y}) -> 居中对齐木框画板')

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
