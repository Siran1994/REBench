from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789971493581.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape
print(f"Image size: {w} x {h}")

# 查找所有红色像素 (R > 190, G < 60, B < 60)
red_mask = (arr[:, :, 0] > 190) & (arr[:, :, 1] < 60) & (arr[:, :, 2] < 60)
ys, xs = np.where(red_mask)
print(f"Total red pixels: {len(xs)}")

# 分离 小红色方框 和 大红色方框
# 小红色方框在木框左侧: x in [600, 720], y in [50, 150]
small_box_mask = np.zeros((h, w), dtype=bool)
for y in range(50, 150):
    for x in range(600, 720):
        if red_mask[y, x]:
            small_box_mask[y, x] = True

sb_ys, sb_xs = np.where(small_box_mask)
if len(sb_xs) > 0:
    print(f"小红色方框 (设置按钮目标位置):")
    print(f"  X: [{sb_xs.min()}, {sb_xs.max()}] (宽={sb_xs.max()-sb_xs.min()+1}, 中心={ (sb_xs.min()+sb_xs.max())/2.0 })")
    print(f"  Y: [{sb_ys.min()}, {sb_ys.max()}] (高={sb_ys.max()-sb_ys.min()+1}, 中心={ (sb_ys.min()+sb_ys.max())/2.0 })")

# 大红色方框在木框内部: x in [700, 950], y in [50, 450]
big_box_mask = np.zeros((h, w), dtype=bool)
for y in range(50, 450):
    for x in range(700, 950):
        if red_mask[y, x]:
            big_box_mask[y, x] = True

bb_ys, bb_xs = np.where(big_box_mask)
if len(bb_xs) > 0:
    print(f"大红色方框 (右侧木框参考区域):")
    print(f"  X: [{bb_xs.min()}, {bb_xs.max()}] (宽={bb_xs.max()-bb_xs.min()+1}, 中心={ (bb_xs.min()+bb_xs.max())/2.0 })")
    print(f"  Y: [{bb_ys.min()}, {bb_ys.max()}] (高={bb_ys.max()-bb_ys.min()+1}, 中心={ (bb_ys.min()+bb_ys.max())/2.0 })")

# 寻找当前设置齿轮按钮的位置
# 齿轮是灰色花瓣形图标 (在 x in [680, 760], y in [50, 140])
gear_mask = np.zeros((h, w), dtype=bool)
for y in range(50, 140):
    for x in range(680, 760):
        r, g, b = arr[y, x]
        # 齿轮颜色是浅灰白 R,G,B 约 130..190，且互差很小
        if 110 < r < 200 and abs(int(r)-int(g)) < 15 and abs(int(g)-int(b)) < 15:
            gear_mask[y, x] = True

g_ys, g_xs = np.where(gear_mask)
if len(g_xs) > 0:
    print(f"当前设置齿轮按钮位置:")
    print(f"  X: [{g_xs.min()}, {g_xs.max()}] (宽={g_xs.max()-g_xs.min()+1}, 中心={ (g_xs.min()+g_xs.max())/2.0 })")
    print(f"  Y: [{g_ys.min()}, {g_ys.max()}] (高={g_ys.max()-g_ys.min()+1}, 中心={ (g_ys.min()+g_ys.max())/2.0 })")

# 寻找 4 个 Tab 按钮当前的位置 (红苹果 x~735, 粉红团 x~850, y~100..150)
print(f"4 个选项按钮当前 Y 范围大约在 100~150 之间")
