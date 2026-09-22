from PIL import Image
import numpy as np

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 截图尺寸 1024 x 515
# 用户画的红色方框: X=[758, 910], Y=[153, 420]
# 当前食物条目: X=[815, 935], Y=[155, 415] (中心 X=875)
# 偏移量 delta_x = 875 - 834 = 41 像素
# 如果向左移动 41 像素:
# 新位置: X = [815 - 41, 935 - 41] = [774, 894]!
# 如果宽度从 382 扩展到 400 (增加 18 Canvas单位 -> 增加 7 截图像素):
# 左边缘 = 774 - 3.5 = 770.5
# 右边缘 = 894 + 3.5 = 897.5
# 正好处于 [758, 910] 红色方框的正中央！两侧各有约 12 像素的精致安全边距！

# 在原图上画出预测调整后的食物列表区域 (用青色框标记，与红框对比)
preview = im.copy()
from PIL import ImageDraw
draw = ImageDraw.Draw(preview)

# 目标红框:
draw.rectangle([758, 153, 910, 420], outline=(255, 0, 0), width=2)
# 预测调整后的 FoodScrollView 区域:
# 宽度 400 对应 400 / 2.653 = 150.8 像素
# 高度 680 对应 680 / 2.565 = 265.1 像素
# 中心 X=834, 中心 Y=286.5
# 左 = 834 - 151/2 = 758.5
# 右 = 834 + 151/2 = 909.5
# 顶 = 286.5 - 265/2 = 154
# 底 = 286.5 + 265/2 = 419
draw.rectangle([759, 154, 909, 419], outline=(0, 255, 255), width=2)

preview.save('scratch/predicted_food_scrollview_preview.png')
print("已生成调整预测对比图: scratch/predicted_food_scrollview_preview.png")
print("红色框: 用户画的红框 [758, 153, 910, 420]")
print("青色框: 调整后的 FoodScrollView [759, 154, 909, 419] -> 100% 严密贴合！")
