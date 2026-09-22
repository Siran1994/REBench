import os
import sys
import struct
import shutil
import UnityPy
from UnityPy.files import ObjectReader
from UnityPy.export import Texture2DConverter
from PIL import Image
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 24字节校验限制
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

data_unity3d_path = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
target_color = (23.0 / 255.0, 236.0 / 255.0, 1.0, 1.0) # #17ecff (0.0902, 0.9255, 1.0, 1.0)

print('====================================================')
print('=== 步骤 1: 生成并保存 SkillTreeButton.png 青蓝配色素材 ===')
print('====================================================')
orig_btn_png = r'd:\Desktop\REBench\siyangruchong_art_assets\Sprites\SkillTreeButton.png'
im = Image.open(orig_btn_png).convert('RGBA')
arr = np.array(im)

color_map = {
    (83, 7, 80, 255): (23, 236, 255, 255),    # 主背景青蓝色 #17ecff
    (108, 11, 104, 255): (70, 245, 255, 255),  # 顶部高亮倒角
    (67, 5, 64, 255): (18, 185, 205, 255),    # 底部阴影倒角
    (53, 3, 51, 255): (12, 140, 160, 255),    # 边角暗部倒角
}

new_arr = arr.copy()
for y in range(arr.shape[0]):
    for x in range(arr.shape[1]):
        px = tuple(arr[y, x])
        if px in color_map:
            new_arr[y, x] = color_map[px]

new_btn_img = Image.fromarray(new_arr, 'RGBA')

# 保存到 modified 与 siyangruchong_art_assets
paths_to_save = [
    r'd:\Desktop\REBench\modified\siyangruchong_art_assets\Sprites\SkillTreeButton.png',
    r'd:\Desktop\REBench\modified\siyangruchong_art_assets\Textures\SkillTreeButton.png',
    r'd:\Desktop\REBench\siyangruchong_art_assets\Sprites\SkillTreeButton.png',
    r'd:\Desktop\REBench\siyangruchong_art_assets\Textures\SkillTreeButton.png',
]
for p in paths_to_save:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    new_btn_img.save(p)
    print(f'  ✓ 已更新贴图文件: {p}')

print('\n====================================================')
print('=== 步骤 2: 加载 data.unity3d 并修改按钮背景颜色 ===')
print('====================================================')
env = UnityPy.load(data_unity3d_path)
s1 = [a for a in env.assets if a.name == 'sharedassets1.assets'][0]
l1 = [a for a in env.assets if a.name == 'level1'][0]

# 1. 修改左侧 ActiveButton -> Frame (pid 586 in sharedassets1.assets) 的 m_Color
obj586 = s1.objects[586]
raw586 = obj586.get_raw_data()
assert len(raw586) == 136, f"pid 586 长度不符: {len(raw586)}"
old_r, old_g, old_b, old_a = struct.unpack('<ffff', raw586[44:60])
print(f'  [左侧皮鞭按钮 Frame] 原始颜色: ({old_r:.3f}, {old_g:.3f}, {old_b:.3f}, {old_a:.3f})')
color_bytes = struct.pack('<ffff', *target_color)
new_raw586 = raw586[:44] + color_bytes + raw586[60:]
assert len(new_raw586) == 136
obj586.set_raw_data(new_raw586)
print(f'  ✓ [左侧皮鞭按钮 Frame] 已更新颜色为 #17ecff: {target_color}')

# 2. 修改底部 OpenSkillTreeButton -> Fill (pid 4247 in level1) 的 m_Color
obj4247 = l1.objects[4247]
raw4247 = obj4247.get_raw_data()
assert len(raw4247) == 136, f"pid 4247 长度不符: {len(raw4247)}"
old_r2, old_g2, old_b2, old_a2 = struct.unpack('<ffff', raw4247[44:60])
print(f'  [底部技能树按钮 Fill] 原始颜色: ({old_r2:.3f}, {old_g2:.3f}, {old_b2:.3f}, {old_a2:.3f})')
new_raw4247 = raw4247[:44] + color_bytes + raw4247[60:]
assert len(new_raw4247) == 136
obj4247.set_raw_data(new_raw4247)
print(f'  ✓ [底部技能树按钮 Fill] 已更新颜色为 #17ecff: {target_color}')

# 3. 原位二进制无损替换 SkillTreeButton 纹理 (pid 51 in sharedassets1.assets)
obj51 = s1.objects[51]
raw51 = obj51.get_raw_data()
assert len(raw51) == 30724, f"pid 51 长度不符: {len(raw51)}"
assert raw51[-40:] == b'\x00' * 40

encoded_btn_data, _ = Texture2DConverter.image_to_texture2d(new_btn_img, 4)
assert len(encoded_btn_data) == 30576, f"编码长度不匹配: {len(encoded_btn_data)}"

new_raw51 = raw51[:108] + encoded_btn_data + raw51[108 + 30576:]
assert len(new_raw51) == 30724
obj51.set_raw_data(new_raw51)
print(f'  ✓ [底部技能树按钮 Texture2D] 已原位无损替换像素数据 (总长度: 30724 字节)')

# 4. 校验并确保 ActiveAbilitiesPanel 坐标依然为 318.0
rt_obj = l1.objects[2333].read()
assert rt_obj.m_AnchoredPosition.y == 318.0, "ActiveAbilitiesPanel 坐标偏离!"
print(f'  ✓ ActiveAbilitiesPanel Y 坐标校验通过: {rt_obj.m_AnchoredPosition.y}')

print('\n====================================================')
print('=== 步骤 3: 保存 data.unity3d 文件 ===')
print('====================================================')
saved_bundle = env.file.save()
with open(data_unity3d_path, 'wb') as f:
    f.write(saved_bundle)
print(f'✓ data.unity3d 已成功保存: {len(saved_bundle)} 字节')

# 校验保存后的文件
env_chk = UnityPy.load(data_unity3d_path)
s1_chk = [a for a in env_chk.assets if a.name == 'sharedassets1.assets'][0]
l1_chk = [a for a in env_chk.assets if a.name == 'level1'][0]

r_chk1 = struct.unpack('<ffff', s1_chk.objects[586].get_raw_data()[44:60])
print(f'  ✓ 校验 sharedassets1 pid 586 颜色: {r_chk1}')
assert abs(r_chk1[0] - target_color[0]) < 1e-4

r_chk2 = struct.unpack('<ffff', l1_chk.objects[4247].get_raw_data()[44:60])
print(f'  ✓ 校验 level1 pid 4247 颜色: {r_chk2}')
assert abs(r_chk2[0] - target_color[0]) < 1e-4

assert s1_chk.objects[51].byte_size == 30724
print('  ✓ 校验 Texture2D SkillTreeButton byte_size: 30724 (100% 匹配)')

print('\n====================================================')
print('=== 步骤 4: 重新打包 siyangruchong.data 核心包 ===')
print('====================================================')
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

print(f'✓ 已成功打包生成 {target_data_path}: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)')

print('\n🎉 2个按钮背景颜色修改与重打包已顺利完成！')
