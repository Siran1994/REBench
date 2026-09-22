from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img2_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789973130178.png'
im2 = Image.open(img2_path).convert('RGB')
arr2 = np.array(im2)
h2, w2, _ = arr2.shape
print(f"图2 (目标效果图) 尺寸: {w2} x {h2}, 宽高比: {w2/h2:.3f}")

# 检测菜叶的边界 (亮绿/黄绿边缘: G>120, R>90, G>R*0.85, x < 520)
c_mask = np.zeros((h2, w2), dtype=bool)
for y in range(h2):
    for x in range(520):
        r, g, b = int(arr2[y, x, 0]), int(arr2[y, x, 1]), int(arr2[y, x, 2])
        if g > 110 and r > 80 and g >= r * 0.85 and b < 160:
            c_mask[y, x] = True

ys, xs = np.where(c_mask)
c_top, c_bot = ys.min(), ys.max()
c_left, c_right = xs.min(), xs.max()
c_h = c_bot - c_top + 1
c_w = c_right - c_left + 1

print(f"图2 菜叶范围: X=[{c_left}, {c_right}] (宽={c_w}), Y=[{c_top}, {c_bot}] (高={c_h})")
print(f"  菜叶高度占全图比例: {c_h / h2 * 100:.2f}%")
print(f"  菜叶顶部留白: {c_top}px ({c_top/h2*100:.2f}%)")
print(f"  菜叶底部留白: {h2 - 1 - c_bot}px ({(h2-1-c_bot)/h2*100:.2f}%)")
print(f"  菜叶左侧留白: {c_left}px ({c_left/w2*100:.2f}%)")
print(f"  菜叶垂直中心: {(c_top + c_bot)/2.0:.1f} (图像纵向中心为 {h2/2.0:.1f})")
print(f"  菜叶自身宽高比: {c_w / c_h:.3f}")
