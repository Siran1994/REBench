from PIL import Image
import numpy as np

arr = np.array(Image.open('scratch/user_cabbage_red_box_mask.png'))
h, w = arr.shape

# find where red lines are
# exclude apple button or other icons
# The box is a big rectangle
# Left edge: around x in [165, 175]
# Right edge: around x in [730, 745]
# Top edge: around y in [120, 130]
# Bottom edge: around y in [500, 510]

row_counts = np.sum(arr[:, 200:700] > 0, axis=1)
col_counts = np.sum(arr[150:480, :] > 0, axis=0)

top_lines = np.where(row_counts > 200)[0]
top_y = top_lines[top_lines < 250]
bot_y = top_lines[top_lines > 450]

left_lines = np.where(col_counts > 150)[0]
left_x = left_lines[left_lines < 300]
right_x = left_lines[left_lines > 650]

print(f"红色方框顶边 Y: {top_y}")
print(f"红色方框底边 Y: {bot_y}")
print(f"红色方框左边 X: {left_x}")
print(f"红色方框右边 X: {right_x}")

box_top = int(np.mean(top_y))
box_bot = int(np.mean(bot_y))
box_left = int(np.mean(left_x))
box_right = int(np.mean(right_x))

box_w = box_right - box_left
box_h = box_bot - box_top
box_cx = (box_left + box_right) / 2.0
box_cy = (box_top + box_bot) / 2.0

print(f"=== 红色方框精确几何边界 ===")
print(f"  Top={box_top}, Bottom={box_bot}, Height={box_h}")
print(f"  Left={box_left}, Right={box_right}, Width={box_w}")
print(f"  Center: ({box_cx}, {box_cy})")
print(f"  宽高比: {box_w / box_h:.3f} (或者高宽比: {box_h / box_w:.3f})")
