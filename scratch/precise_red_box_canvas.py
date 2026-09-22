from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 1. 测量木框 BG 在截图像素中的四条边
# BG 的 RectTransform: Pos=(895, 0), Size=(520, 980)
# 在截图中木框的外边缘:
# 左木框边缘 X 约 734
# 右木框边缘 X 约 930
# 宽度 = 930 - 734 = 196 像素
# 在 Canvas 中，BG 的宽度是 520 单位！
# 那么比例 scale = 520 / 196 = 2.653 Canvas单位 / 截图像素！
scale = 520.0 / (930 - 734)
print(f"Canvas / 截图像素换算比例: {scale:.3f}")

# 木框中心在截图像素中:
bg_center_x = (734 + 930) / 2.0 # = 832.0
print(f"木框中心 X (截图像素): {bg_center_x}")

# 2. 测量红色方框在截图像素中的位置:
# Left = 758, Right = 910 -> 宽度 = 152
# Center X = (758 + 910) / 2.0 = 834.0 !!
# 天哪！红色方框的中心 X (834.0) 几乎完全等于木框中心 X (832.0)！
print(f"红色方框中心 X (截图像素): {(758 + 910) / 2.0}")
print("结论：用户画的红色方框在水平方向上就是【完全居中对齐木框】！")

# 3. 测量红色方框在 Canvas 坐标系下的宽度:
# 152 截图像素 * scale = 152 * 2.653 = 403.3 单位！
box_w_canvas = 152 * scale
print(f"红色方框在 Canvas 坐标系下的宽度: {box_w_canvas:.1f} 单位 (约 400 ~ 410)")

# 4. 测量红色方框在垂直方向上的位置:
# 木框的顶部木纹在 Y 约 57, 底部木纹在 Y 约 439
# 木框高度 = 439 - 57 = 382 像素
# 在 Canvas 中，BG 的高度是 980 单位！
# scale_y = 980 / 382 = 2.565
# 木框垂直中心在 Y = (57 + 439) / 2.0 = 248.0 (对应 Canvas Y = 0)
# 红色方框: Top = 153, Bottom = 420
# 红色方框高度 = 420 - 153 = 267 像素
# 对应 Canvas 高度 = 267 * 2.565 = 684.9 单位！
# 红色方框中心 Y = (153 + 420) / 2.0 = 286.5
# 相对木框中心的偏移 Y = 286.5 - 248.0 = 38.5 像素 (在图像中是向下)
# 在 Canvas 坐标系中 (向上为正): -38.5 * 2.565 = -98.7 单位！

print(f"红色方框在 Canvas 坐标系下的高度: {267 * 2.565:.1f} 单位 (约 680 ~ 700)")
print(f"红色方框在 Canvas 坐标系下的垂直中心偏移 (相对于木框中心): {-38.5 * 2.565:.1f} 单位")
