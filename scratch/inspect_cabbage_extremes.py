from PIL import Image
import numpy as np

im = Image.open('modified/siyangruchong_art_assets/Sprites/TableSmall2_2.png').convert('RGBA')
arr = np.array(im)
alpha = arr[:, :, 3]
h, w = alpha.shape
print(f"TableSmall2_2 原图尺寸: {w} x {h}")

# 找到不透明边界
ys, xs = np.where(alpha > 10)
print(f"有效不透明内容边界: X=[{xs.min()}, {xs.max()}], Y=[{ys.min()}, {ys.max()}]")
print(f"左侧最外凸点位于 (x={xs.min()}, y={ys[np.argmin(xs)]})")
print(f"右侧最外凸点位于 (x={xs.max()}, y={ys[np.argmax(xs)]})")
print(f"顶部最外凸点位于 (x={xs[np.argmin(ys)]}, y={ys.min()})")
print(f"底部最外凸点位于 (x={xs[np.argmax(ys)]}, y={ys.max()})")
