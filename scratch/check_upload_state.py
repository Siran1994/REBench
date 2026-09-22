from PIL import Image
import numpy as np

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789974153275.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 齿轮设置按钮: 找浅灰色
gear_mask = np.zeros(arr.shape[:2], dtype=bool)
for y in range(80, 200):
    for x in range(500, 800):
        r, g, b = arr[y, x]
        if 110 < r < 200 and abs(int(r)-int(g)) < 15 and abs(int(g)-int(b)) < 15:
            gear_mask[y, x] = True

ys, xs = np.where(gear_mask)
print(f"齿轮位置: X=[{xs.min()}, {xs.max()}], Y=[{ys.min()}, {ys.max()}]")
