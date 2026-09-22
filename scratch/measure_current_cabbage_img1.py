from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img1_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789973103445.png'
im1 = Image.open(img1_path).convert('RGB')
arr1 = np.array(im1)
h1, w1, _ = arr1.shape
print(f"图1 (当前真机截图) 尺寸: {w1} x {h1}")

# 查找菜叶像素
# 在手机屏幕内 (x in [90, 720], y in [50, 440])
c_mask = np.zeros((h1, w1), dtype=bool)
for y in range(50, 440):
    for x in range(90, 720):
        r, g, b = int(arr1[y, x, 0]), int(arr1[y, x, 1]), int(arr1[y, x, 2])
        if g > 110 and r > 80 and g >= r * 0.85 and b < 160:
            c_mask[y, x] = True

ys, xs = np.where(c_mask)
c_top, c_bot = ys.min(), ys.max()
c_left, c_right = xs.min(), xs.max()
c_h = c_bot - c_top + 1
c_w = c_right - c_left + 1

print(f"图1 菜叶当前显示范围: X=[{c_left}, {c_right}] (宽={c_w}), Y=[{c_top}, {c_bot}] (高={c_h})")
# 手机屏幕区域: Y 从约 59 到 434 (高约 375)
print(f"手机屏幕内可见高度约: {434 - 59}px")
print(f"菜叶当前高度占屏幕高度: {c_h / (434 - 59) * 100:.2f}%")
print(f"菜叶左侧边缘 X={c_left} (而红箭头指示左侧被放得太大，左边的叶尖直接被放出了视野或遮挡)")
