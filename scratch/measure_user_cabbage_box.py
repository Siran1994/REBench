from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789974153275.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape
print(f"Image size: {w} x {h}")

# 查找所有红色方框像素 (R > 190, G < 60, B < 60)
red_mask = (arr[:, :, 0] > 190) & (arr[:, :, 1] < 60) & (arr[:, :, 2] < 60)

# 寻找水平红线 (top edge and bottom edge)
# 在 x in [250, 700] 范围内统计每一行的红色像素
row_reds = [np.sum(red_mask[y, 250:700]) for y in range(h)]
# 在 y in [100, 400] 范围内统计每一列的红色像素
col_reds = [np.sum(red_mask[100:400, x]) for x in range(w)]

top_y = [y for y in range(h) if row_reds[y] > 100 and y < 200]
bot_y = [y for y in range(h) if row_reds[y] > 100 and y > 300]
left_x = [x for x in range(w) if col_reds[x] > 50 and x < 400]
right_x = [x for x in range(w) if col_reds[x] > 50 and x > 600]

print(f"红色方框顶边 Top Y: {min(top_y)} ~ {max(top_y)}")
print(f"红色方框底边 Bot Y: {min(bot_y)} ~ {max(bot_y)}")
print(f"红色方框左边 Left X: {min(left_x)} ~ {max(left_x)}")
print(f"红色方框右边 Right X: {min(right_x)} ~ {max(right_x)}")

box_left = min(left_x)
box_right = max(right_x)
box_top = min(top_y)
box_bot = max(bot_y)

box_w = box_right - box_left + 1
box_h = box_bot - box_top + 1
box_cx = (box_left + box_right) / 2.0
box_cy = (box_top + box_bot) / 2.0

print(f"红色方框尺寸: 宽={box_w}, 高={box_h}")
print(f"红色方框中心: ({box_cx}, {box_cy})")
print(f"红色方框高宽比: {box_h / box_w:.3f} (宽高比: {box_w / box_h:.3f})")
