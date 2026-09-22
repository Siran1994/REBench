from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 图1 测量
im1 = Image.open('C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962046776.png').convert('RGB')
arr1 = np.array(im1)
h1, w1, _ = arr1.shape

# 测量图1中的菜叶 (绿色区域，x在0..530)
cabbage_mask1 = np.zeros((h1, w1), dtype=bool)
for y in range(h1):
    for x in range(530):
        r, g, b = int(arr1[y, x, 0]), int(arr1[y, x, 1]), int(arr1[y, x, 2])
        if g > 130 and r > 100 and g >= r * 0.9 and b < 180:
            cabbage_mask1[y, x] = True

ys1, xs1 = np.where(cabbage_mask1)
c1_top, c1_bot = ys1.min(), ys1.max()
c1_left, c1_right = xs1.min(), xs1.max()
c1_h = c1_bot - c1_top
c1_w = c1_right - c1_left
c1_y_center = (c1_top + c1_bot) / 2.0

# 测量图1中的右侧木框 (x > 500)
frame_mask1 = np.zeros((h1, w1), dtype=bool)
for y in range(h1):
    for x in range(500, w1):
        r, g, b = int(arr1[y, x, 0]), int(arr1[y, x, 1]), int(arr1[y, x, 2])
        # 木框边框或深绿背景
        # 木质边缘: r > 100, r > b * 1.8
        # 四角绿叶: g > 120, g > r * 1.1
        # 内部面板: r ~ 25..45, g ~ 55..75, b ~ 35..55
        if (r > 90 and r > b * 1.8 and r > g * 0.85) or (g > 110 and g > r and g > b * 1.5) or (15 < r < 55 and 45 < g < 85 and 25 < b < 65):
            frame_mask1[y, x] = True

f_ys1, f_xs1 = np.where(frame_mask1)
f1_top, f1_bot = f_ys1.min(), f_ys1.max()
f1_left, f1_right = f_xs1.min(), f_xs1.max()
f1_h = f1_bot - f1_top
f1_w = f1_right - f1_left

print("=== 图1 (目标效果图分析) ===")
print(f"图像尺寸: {w1} x {h1}")
print(f"1. 菜叶边界: X=[{c1_left}, {c1_right}] (宽={c1_w}), Y=[{c1_top}, {c1_bot}] (高={c1_h})")
print(f"   顶部留白: {c1_top}px ({c1_top/h1*100:.2f}%), 底部留白: {h1 - 1 - c1_bot}px ({(h1 - 1 - c1_bot)/h1*100:.2f}%)")
print(f"   菜叶垂直中心: {c1_y_center:.1f} (图像纵向中心为 {h1/2.0:.1f}) -> 几乎完全绝对居中！")
print(f"2. 右侧菜单栏木框: X=[{f1_left}, {f1_right}] (宽={f1_w}), Y=[{f1_top}, {f1_bot}] (高={f1_h})")
print(f"   宽高比: {f1_w / f1_h:.3f} (或者 高宽比: {f1_h / f1_w:.3f})")
print(f"   木框顶部留白: {f1_top}px ({f1_top/h1*100:.2f}%)")
print(f"   木框底部留白: {h1 - 1 - f1_bot}px ({(h1 - 1 - f1_bot)/h1*100:.2f}%)")
print(f"   木框右侧留白: {w1 - 1 - f1_right}px ({(w1 - 1 - f1_right)/w1*100:.2f}%)")
print(f"   木框高度占全屏比例: {f1_h / h1 * 100:.2f}%")
print(f"   木框宽度占全屏比例: {f1_w / w1 * 100:.2f}%")
