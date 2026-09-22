from PIL import Image
from PIL import ImageDraw
import numpy as np

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789971493581.png'
im = Image.open(img_path).convert('RGB')
w, h = im.size

# 复制一份用于画图预览
preview = im.copy()
draw = ImageDraw.Draw(preview)

# 1. 小红色方框: [646, 70, 705, 147], 中心=(675.5, 108.5)
# 设置齿轮当前中心=(732, 100), 尺寸=(39, 39)
# 如果向左平移 56.5px, 向下微调 8.5px:
# 调整后齿轮的中心=(675.5, 108.5)
# 调整后齿轮范围: [675.5 - 19.5, 108.5 - 19.5, 675.5 + 19.5, 108.5 + 19.5] = [656, 89, 695, 128]
# 完美居中落入 [646, 70, 705, 147] 小红框内！
draw.rectangle([656, 89, 695, 128], outline=(0, 255, 255), width=2)

# 2. 4 个 Tab 按钮:
# 当前在截图中的 Y 约为 115..145
# 用户大红框顶部是 Y=70, 底部是 Y=432
# 大红框水平范围 X=[700, 894], 中心 X=797
# 如果 4 个 Tab 按钮上移 28 像素 (对应 Canvas 上移 74 单位, Y 从 305.8 移至 380.0):
# 新的 Y 范围约为 87..117
# 4 按钮水平跨度约 136 像素, 居中在 X=797:
# 水平范围: [797 - 68, 797 + 68] = [729, 865]
draw.rectangle([729, 87, 865, 117], outline=(0, 255, 255), width=2)

preview.save('scratch/predicted_settings_and_buttons_preview.png')
print("已保存预测预览对比图: scratch/predicted_settings_and_buttons_preview.png")
print("青色框 1: 设置按钮调整后新位置 [656, 89, 695, 128] -> 完美置入小红框")
print("青色框 2: 4个类别按钮调整后新位置 [729, 87, 865, 117] -> 完美上移并在大红框内居中")
