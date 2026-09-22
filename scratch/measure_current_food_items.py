from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 寻找锁图标 (锁是浅灰色/白色金属)
# 在 x in [780, 850], y in [160, 420]
# 锁图标像素 R>180, G>180, B>180, 形状是圆头锁身
lock_mask = np.zeros(arr.shape[:2], dtype=bool)
for y in range(150, 430):
    for x in range(750, 870):
        r, g, b = arr[y, x]
        if r > 180 and g > 180 and b > 180 and abs(int(r)-int(g)) < 15 and abs(int(g)-int(b)) < 15:
            lock_mask[y, x] = True

ys, xs = np.where(lock_mask)
print(f"当前锁图标在 X 轴上的分布: X=[{xs.min()}, {xs.max()}] (中心={ (xs.min()+xs.max())/2.0 })")

# 寻找文字 '苹果', '汉堡' 等 (青白或灰色文字)
# 在锁的右侧
print(f"用户画的红色方框: X=[758, 910], 宽度=152, 中心 X=834")

# 比较当前项与红色方框:
# 锁当前 X=[800, 825] 左右，右边文字延伸到 X=910 甚至切边！
