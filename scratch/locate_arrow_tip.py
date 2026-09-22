from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789971493581.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 寻找指向大红框的红箭头的尖端
# 箭头是长斜线，起点在左下方 (x~640..660, y~280..300)，终点在右上
# 箭头尖端位于 x in [720, 760], y in [100, 160]
arrow_mask = np.zeros(arr.shape[:2], dtype=bool)
for y in range(90, 170):
    for x in range(710, 770):
        r, g, b = arr[y, x]
        if r > 190 and g < 60 and b < 60:
            arrow_mask[y, x] = True

ys, xs = np.where(arrow_mask)
if len(xs) > 0:
    print(f"箭头尖端区域: X=[{xs.min()}, {xs.max()}], Y=[{ys.min()}, {ys.max()}]")
    # 尖端坐标是 y 最小的点
    top_pt_idx = np.argmin(ys)
    print(f"箭头尖端点: X={xs[top_pt_idx]}, Y={ys[top_pt_idx]}")
