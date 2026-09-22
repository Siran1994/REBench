from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape
print(f'Image size: {w} x {h}')

# 1. 查找红色像素 (红色方框和红色箭头)
# R > 200, G < 60, B < 60
red_mask = (arr[:, :, 0] > 190) & (arr[:, :, 1] < 60) & (arr[:, :, 2] < 60)
ys, xs = np.where(red_mask)
print(f'Red pixels count: {len(xs)}')

# 分离出红色方框: 方框集中在 x > 650
box_mask = red_mask.copy()
box_mask[:, :650] = False # 排除左边箭头的尾巴

b_ys, b_xs = np.where(box_mask)
print(f'红色方框范围: X=[{b_xs.min()}, {b_xs.max()}] (宽={b_xs.max()-b_xs.min()+1}), Y=[{b_ys.min()}, {b_ys.max()}] (高={b_ys.max()-b_ys.min()+1})')

# 2. 测量木框的范围 (x > 600)
# 木框的左边木纹：在 x 约 650..750 处
# 寻找木框内部墨绿画板与木条边缘
# 木框左边缘 (棕色木头 R>90, R>B*1.8, R>G*0.8) 或 四角绿叶
wood_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(600, w):
        r, g, b = arr[y, x]
        if (r > 80 and r > b * 1.5 and r > g * 0.8) or (g > 100 and g > r and g > b * 1.3):
            wood_mask[y, x] = True

w_ys, w_xs = np.where(wood_mask)
print(f'右侧木框范围: X=[{w_xs.min()}, {w_xs.max()}], Y=[{w_ys.min()}, {w_ys.max()}]')

# 3. 测量食物项 (如锁图标或条目背景)
# 寻找深色条目框背景 (灰黑色按钮)
print(f'屏幕总宽度: {w}, 屏幕总高度: {h}')
