import os
import sys
import UnityPy
from UnityPy.files import ObjectReader
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Monkeypatch Unity 2021 TypeTree check
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

src_bundle = 'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
test_bundle = 'scratch/test_replace_bg.unity3d'
bg_path = 'reverse/siyangruchong-tt-minigame/bg.png'

print(f'1. 打开背景图: {bg_path}')
bg_img = Image.open(bg_path).convert('RGB')
print(f'   尺寸: {bg_img.size}, 模式: {bg_img.mode}')

print(f'2. 读取 bundle: {src_bundle}')
env = UnityPy.load(src_bundle)
sa0 = [a for a in env.assets if a.name == 'sharedassets0.assets'][0]

tex_obj = sa0.objects[12].read()
print(f'   找到目标 Texture2D PID 12: {tex_obj.m_Name}, 原尺寸: {tex_obj.m_Width}x{tex_obj.m_Height}')

# 替换图片
tex_obj.image = bg_img
tex_obj.save()
print('   ✓ Texture2D PID 12 替换并保存成功')

# 保存 bundle 到 test_bundle
saved_data = env.file.save()
with open(test_bundle, 'wb') as f:
    f.write(saved_data)
print(f'3. 保存测试 bundle 成功: {len(saved_data)} 字节')

# 重新加载测试 bundle 验证
print('4. 重新加载测试 bundle 并验证贴图...')
env2 = UnityPy.load(test_bundle)
sa0_2 = [a for a in env2.assets if a.name == 'sharedassets0.assets'][0]
tex_obj2 = sa0_2.objects[12].read()
read_img = tex_obj2.image
print(f'   读取出的新贴图尺寸: {read_img.size}, 模式: {read_img.mode}')

# 导出验证图片
out_verify_path = 'scratch/verify_bg_replaced.png'
read_img.save(out_verify_path)
print(f'   ✓ 验证图已导出至 {out_verify_path}')

# 像素对比
diff_count = 0
for x in range(min(read_img.width, bg_img.width)):
    for y in range(min(read_img.height, bg_img.height)):
        p1 = bg_img.getpixel((x, y))[:3]
        p2 = read_img.getpixel((x, y))[:3]
        if p1 != p2:
            diff_count += 1

print(f'   像素差异数: {diff_count} / {read_img.width * read_img.height}')
if diff_count == 0:
    print('   ✓ 像素完全一致，完美匹配！')
else:
    print(f'   差异率: {diff_count / (read_img.width * read_img.height) * 100:.2f}% (可能是压缩或色彩空间微小浮点误差)')
