import os
import sys
import struct
import shutil
import UnityPy
from UnityPy.files import ObjectReader
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 24字节校验限制
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

data_unity3d_path = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
mod_base = r'd:\Desktop\REBench\modified\siyangruchong_art_assets'
orig_art_base = r'd:\Desktop\REBench\siyangruchong_art_assets'

print('====================================================')
print('=== 步骤 1: 扫描并定位美术修改图片资源 ===')
print('====================================================')

# 定义 12 个需要替换的资产及其原图尺寸与摆放规则
# 如果 modified 图片尺寸略小于原图（因工具自动裁切透明边缘），按原 bbox 偏移置于原尺寸透明画布中，保持 UV/Mesh 100% 吻合
targets_config = {
    'UpgradeFrame': {
        'asset': 'sharedassets0.assets',
        'path_id': 11,
        'src': os.path.join(mod_base, 'Textures', 'UpgradeFrame.png'),
        'orig_size': (120, 40),
        'offset': (0, 0)
    },
    'floor_1_2': {
        'asset': 'sharedassets1.assets',
        'path_id': 16,
        'src': os.path.join(mod_base, 'Sprites', 'floor_1_2.png'),
        'orig_size': (423, 360),
        'offset': (0, 0)
    },
    'FoodIcon (1)': {
        'asset': 'sharedassets1.assets',
        'path_id': 14,
        'src': os.path.join(mod_base, 'Sprites', 'FoodIcon (1).png'),
        'orig_size': (20, 20),
        'offset': (0, 0)
    },
    'AppleRipe': {
        'asset': 'sharedassets1.assets',
        'path_id': 20,
        'src': os.path.join(mod_base, 'Textures', 'AppleRipe.png'),
        'orig_size': (45, 48),
        'offset': (0, 0)
    },
    'TableMedium': {
        'asset': 'sharedassets1.assets',
        'path_id': 23,
        'src': os.path.join(mod_base, 'Sprites', 'TableMedium.png'),
        'orig_size': (423, 360),
        'offset': (5, 5)
    },
    'TableExpansionIcon': {
        'asset': 'sharedassets1.assets',
        'path_id': 28,
        'src': os.path.join(mod_base, 'Sprites', 'TableExpansionIcon.png'),
        'orig_size': (20, 20),
        'offset': (0, 2)
    },
    'TableIcon (1)': {
        'asset': 'sharedassets1.assets',
        'path_id': 35,
        'src': os.path.join(mod_base, 'Sprites', 'TableIcon (1).png'),
        'orig_size': (20, 20),
        'offset': (1, 4)
    },
    'Burger2': {
        'asset': 'sharedassets1.assets',
        'path_id': 36,
        'src': os.path.join(mod_base, 'Textures', 'Burger2.png'),
        'orig_size': (65, 58),
        'offset': (0, 2)
    },
    'UpgradePanel': {
        'asset': 'sharedassets1.assets',
        'path_id': 40,
        'src': os.path.join(mod_base, 'Textures', 'UpgradePanel.png'),
        'orig_size': (80, 216),
        'offset': (0, 0)
    },
    'Peashooter': {
        'asset': 'sharedassets1.assets',
        'path_id': 64,
        'src': os.path.join(mod_base, 'Textures', 'Peashooter.png'),
        'orig_size': (14, 12),
        'offset': (0, 0)
    },
    'TableSmall2_2': {
        'asset': 'sharedassets1.assets',
        'path_id': 73,
        'src': os.path.join(mod_base, 'Sprites', 'TableSmall2_2.png'),
        'orig_size': (282, 240),
        'offset': (2, 2)
    },
    'Cookie': {
        'asset': 'sharedassets1.assets',
        'path_id': 75,
        'src': os.path.join(mod_base, 'Textures', 'Cookie.png'),
        'orig_size': (30, 24),
        'offset': (1, 0)
    }
}

for name, cfg in targets_config.items():
    assert os.path.exists(cfg['src']), f"源图片未找到: {cfg['src']}"
    print(f"  ✓ 找到图片源: {name:<20} -> {os.path.basename(cfg['src'])} (目标尺寸: {cfg['orig_size']})")

print('\n====================================================')
print('=== 步骤 2: 加载 Unity 资产包并替换 Texture2D 贴图 ===')
print('====================================================')

env = UnityPy.load(data_unity3d_path)

# 按 asset 分组
assets_by_name = {a.name: a for a in env.assets}

replaced_count = 0
for name, cfg in targets_config.items():
    asset = assets_by_name.get(cfg['asset'])
    assert asset is not None, f"找不到资产文件: {cfg['asset']}"
    
    obj = asset.objects.get(cfg['path_id'])
    assert obj is not None, f"找不到 PathID: {cfg['path_id']}"
    
    tex = obj.read()
    orig_w, orig_h = tex.m_Width, tex.m_Height
    assert (orig_w, orig_h) == cfg['orig_size'], f"尺寸不匹配: Unity 中为 {(orig_w, orig_h)}, 预期为 {cfg['orig_size']}"
    
    # 打开美术修改后的图片
    mod_img = Image.open(cfg['src']).convert('RGBA')
    
    # 若尺寸完全匹配，直接使用；若尺寸因裁切缩小，贴合到原尺寸透明画布上
    if mod_img.size == cfg['orig_size']:
        final_img = mod_img
    else:
        canvas = Image.new('RGBA', cfg['orig_size'], (0, 0, 0, 0))
        canvas.paste(mod_img, cfg['offset'])
        final_img = canvas
    
    # 赋值回 Texture2D
    tex.image = final_img
    tex.save()
    replaced_count += 1
    print(f"  ✓ [已替换] {name:<20} ({cfg['asset']} ID={cfg['path_id']}) -> 尺寸: {final_img.size}, 格式: {tex.m_TextureFormat}")

print(f"\n✓ 成功替换全部 {replaced_count} 项核心美术贴图！")

print('\n====================================================')
print('=== 步骤 3: 校验并保留此前修复的 UI 坐标 ===')
print('====================================================')
level1_asset = assets_by_name['level1']
rt_obj = level1_asset.objects[2333].read()
print(f"  当前 ActiveAbilitiesPanel 坐标: ({rt_obj.m_AnchoredPosition.x}, {rt_obj.m_AnchoredPosition.y})")
if rt_obj.m_AnchoredPosition.y != 318.0:
    print("  [调整] 重新设置 ActiveAbilitiesPanel 坐标至 318.0...")
    rt_obj.m_AnchoredPosition.y = 318.0
    rt_obj.save()
else:
    print("  ✓ ActiveAbilitiesPanel 坐标依然稳健保持在 318.0！")

print('\n====================================================')
print('=== 步骤 4: 保存 data.unity3d 文件 ===')
print('====================================================')
saved_data = env.file.save()
with open(data_unity3d_path, 'wb') as f:
    f.write(saved_data)
print(f"✓ data.unity3d 已成功写回: {data_unity3d_path} ({len(saved_data)} 字节)")

# 重新加载并校验替换结果
print("  正在执行校验重读...")
env_check = UnityPy.load(data_unity3d_path)
check_assets = {a.name: a for a in env_check.assets}
for name, cfg in targets_config.items():
    a = check_assets[cfg['asset']]
    t = a.objects[cfg['path_id']].read()
    assert (t.m_Width, t.m_Height) == cfg['orig_size'], f"重读校验尺寸失败: {name}"
print("✓ data.unity3d 重新加载反序列化 100% 校验通过！")

print('\n====================================================')
print('=== 步骤 5: 重新打包 siyangruchong.data ===')
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

os.makedirs(os.path.dirname(target_data_path), exist_ok=True)
with open(target_data_path, 'wb') as f:
    f.write(packed_bytes)

print(f"✓ 已成功打包生成 {target_data_path}: {len(packed_bytes)} 字节 ({len(packed_bytes) / 1024 / 1024:.2f} MB)")
assert packed_bytes.startswith(b'UnityWebData1.0\x00')

print('\n====================================================')
print('=== 步骤 6: 同步更新 siyangruchong_art_assets 存档与配置 ===')
print('====================================================')
# 将修改后的美术文件复制覆盖到 siyangruchong_art_assets 保持同步
for root, dirs, files in os.walk(mod_base):
    for f in files:
        src_f = os.path.join(root, f)
        rel = os.path.relpath(src_f, mod_base)
        dst_f = os.path.join(orig_art_base, rel)
        if os.path.exists(dst_f):
            if open(src_f, 'rb').read() != open(dst_f, 'rb').read():
                shutil.copy2(src_f, dst_f)
                print(f"  ✓ 同步存档文件: {rel}")

print('\n🎉 美术替换与数据包重构完成！')
