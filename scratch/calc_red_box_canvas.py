from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 用户截图: 1024 x 515
# 测量手机屏幕边缘
img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape

# 测量木框的边界
# 木框的四个边界 (根据我们设置的 BG SizeDelta = 520, 980)
# 在 Canvas 坐标系中：
# Canvas 宽 2340, 高 1080 (或者以屏幕长宽比自适应)
# CanvasScaler: ReferenceResolution = (2340, 1080), MatchWidthOrHeight = 0
# 在 1024 x 515 截图中，真机屏幕的宽度和高度是多少？
# 屏幕左边缘大约在 X=97, 右边缘在 X=927, 宽约 830
# 屏幕上边缘大约在 Y=59, 下边缘在 Y=455, 高约 396

# 寻找红色方框在真机屏幕中的相对比例:
# Left = 758, Right = 910 -> 宽 = 152
# Top = 153, Bot = 420 -> 高 = 267
# Center X = 834, Center Y = 286.5

# 测量 '食物' 标题文本的当前位置:
# '食物' 文本在 X 约 840..890, Y 约 105..135
# 测量 4 个 Tab 按钮的当前位置:
# Tab 按钮在 Y 约 65..95

print("红色方框在截图中的绝对像素坐标:")
print(f"  X: [{758}, {910}], 宽={152}, 中心 X={834}")
print(f"  Y: [{153}, {420}], 高={267}, 中心 Y={286.5}")
