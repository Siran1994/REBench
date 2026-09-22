from PIL import Image
import numpy as np

im = Image.open('scratch/simulated_box_fit_preview.png').convert('RGB')
arr = np.array(im)

# 检查红框的四个边缘与菜叶的贴合
# 检查 X=170 (紧靠左红线) 处的菜叶像素:
left_col = arr[130:500, 172]
# 检查 X=734 (紧靠右红线) 处的菜叶像素:
right_col = arr[130:500, 733]
# 检查 Y=126 (紧靠顶红线) 处的菜叶像素:
top_row = arr[126, 175:730]
# 检查 Y=503 (紧靠底红线) 处的菜叶像素:
bot_row = arr[503, 175:730]

print("左侧边缘是否有黄绿色菜叶叶波:", np.any((left_col[:, 1] > 110) & (left_col[:, 0] > 80)))
print("右侧边缘是否有黄绿色菜叶叶波:", np.any((right_col[:, 1] > 110) & (right_col[:, 0] > 80)))
print("顶部边缘是否有黄绿色菜叶叶波:", np.any((top_row[:, 1] > 110) & (top_row[:, 0] > 80)))
print("底部边缘是否有黄绿色菜叶叶波:", np.any((bot_row[:, 1] > 110) & (bot_row[:, 0] > 80)))
