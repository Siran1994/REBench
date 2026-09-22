from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

im = Image.open('scratch/exact_game_screen.png').convert('RGB')
w, h = im.size
arr = np.array(im)

# 1. 菜叶边界
cabbage_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(int(w * 0.7)):
        r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
        if g > 130 and r > 100 and g >= r * 0.9 and b < 180:
            cabbage_mask[y, x] = True

ys, xs = np.where(cabbage_mask)
c_top, c_bot = ys.min(), ys.max()
c_left, c_right = xs.min(), xs.max()
c_h = c_bot - c_top
c_w = c_right - c_left

print("=== 图2 (真机当前实际效果分析) ===")
print(f"真机屏幕尺寸: {w} x {h}")
print(f"1. 菜叶边界: X=[{c_left}, {c_right}] (宽={c_w}), Y=[{c_top}, {c_bot}] (高={c_h})")
print(f"   顶部留白: {c_top}px ({c_top/h*100:.2f}%)")
print(f"   底部留白: {h - 1 - c_bot}px ({(h - 1 - c_bot)/h*100:.2f}%)")
print(f"   菜叶垂直中心: {(c_top+c_bot)/2.0:.1f} (屏幕垂直中心为 {h/2.0:.1f})")

# 2. 右侧木框
frame_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(int(w * 0.7), w):
        r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
        if (r > 90 and r > b * 1.8 and r > g * 0.85) or (g > 110 and g > r and g > b * 1.5) or (15 < r < 55 and 45 < g < 85 and 25 < b < 65):
            frame_mask[y, x] = True

f_ys, f_xs = np.where(frame_mask)
f_top, f_bot = f_ys.min(), f_ys.max()
f_left, f_right = f_xs.min(), f_xs.max()
f_h = f_bot - f_top
f_w = f_right - f_left

print(f"2. 右侧菜单栏木框: X=[{f_left}, {f_right}] (宽={f_w}), Y=[{f_top}, {f_bot}] (高={f_h})")
print(f"   宽高比: {f_w / f_h:.3f} (或者 高宽比: {f_h / f_w:.3f})")
print(f"   木框顶部留白: {f_top}px ({f_top/h*100:.2f}%)")
print(f"   木框底部留白: {h - 1 - f_bot}px ({(h - 1 - f_bot)/h*100:.2f}%)")
print(f"   木框右侧留白: {w - 1 - f_right}px ({(w - 1 - f_right)/w*100:.2f}%)")
print(f"   木框高度占全屏比例: {f_h / h * 100:.2f}%")
