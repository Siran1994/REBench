from PIL import Image
import numpy as np

im = Image.open('scratch/exact_game_screen.png')
print('Exact game screen size:', im.size)

# Let's see the Y coordinates of:
# 1. Top of cabbage leaf
# 2. Bottom of cabbage leaf
# 3. Center of cabbage leaf
# 4. Top of screen
# 5. Bottom of screen

arr = np.array(im)
h, w, _ = arr.shape

# Let's find cabbage in x in [0, int(w * 0.7)]:
# Cabbage color: bright green (r ~ 120..190, g ~ 190..230, b ~ 70..130)
c_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(int(w * 0.7)):
        r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
        if g > 150 and r > 110 and b < 160:
            c_mask[y, x] = True

ys, xs = np.where(c_mask)
print(f"Cabbage bounds in exact game screen:")
print(f"  X: [{xs.min()}, {xs.max()}], width={xs.max()-xs.min()}")
print(f"  Y: [{ys.min()}, {ys.max()}], height={ys.max()-ys.min()}")
print(f"  Top margin: {ys.min()}px ({ys.min()/h*100:.1f}%)")
print(f"  Bottom margin: {h - 1 - ys.max()}px ({(h - 1 - ys.max())/h*100:.1f}%)")
print(f"  Cabbage vertical center: {(ys.min()+ys.max())/2:.1f}")
print(f"  Screen vertical center: {h/2:.1f}")
