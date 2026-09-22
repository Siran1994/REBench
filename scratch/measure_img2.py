from PIL import Image
import numpy as np

img2_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962077534.png'
im2 = Image.open(img2_path).convert('RGB')
arr2 = np.array(im2)
h, w, _ = arr2.shape
print(f"Image 2 (full screenshot): w={w}, h={h}")

# In Image 2, the phone screen is inside a bezel frame!
# Let's find the inner phone screen bounding box!
# The outer background is dark gray/black (approx (20, 20, 20))
# The screen bezel is around x in [100, 920], y in [70, 470]
# Let's find where the green game content is:
screen_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(w):
        r, g, b = int(arr2[y, x, 0]), int(arr2[y, x, 1]), int(arr2[y, x, 2])
        # In-game background is dark green (r ~ 20..50, g ~ 40..80, b ~ 20..50)
        # Phone bezel / outer background is neutral gray or black (r~g~b < 35 or bezel border)
        if g > 35 and g > r * 1.1 and g > b * 1.1:
            screen_mask[y, x] = True

ys, xs = np.where(screen_mask)
print(f"Game Screen area in Image 2: x=[{xs.min()}, {xs.max()}], y=[{ys.min()}, {ys.max()}]")
sw = xs.max() - xs.min()
sh = ys.max() - ys.min()
print(f"Game Screen width={sw}, height={sh}, aspect ratio: {sw/sh:.3f}")

# Crop to game screen
crop_arr = arr2[ys.min():ys.max(), xs.min():xs.max()]
ch, cw, _ = crop_arr.shape

# Find cabbage bounding box in game screen (x in [0, cw * 0.75]):
cabbage_mask = np.zeros((ch, cw), dtype=bool)
for y in range(ch):
    for x in range(int(cw * 0.75)):
        r, g, b = int(crop_arr[y, x, 0]), int(crop_arr[y, x, 1]), int(crop_arr[y, x, 2])
        if g > 130 and r > 100 and g >= r * 0.9:
            cabbage_mask[y, x] = True

c_ys, c_xs = np.where(cabbage_mask)
if len(c_xs) > 0:
    print(f"Image 2 In-Game Cabbage: x=[{c_xs.min()}, {c_xs.max()}], y=[{c_ys.min()}, {c_ys.max()}]")
    print(f"  Cabbage height={c_ys.max()-c_ys.min()}")
    print(f"  Top margin: {c_ys.min()}px ({c_ys.min()/ch*100:.1f}%), Bottom margin: {ch - c_ys.max()}px ({(ch-c_ys.max())/ch*100:.1f}%)")
    print(f"  Vertical Center of Cabbage: {(c_ys.min() + c_ys.max()) / 2:.1f} (Screen center is {ch/2:.1f})")

# Find shop frame in game screen (x in [cw * 0.7, cw]):
frame_mask = np.zeros((ch, cw), dtype=bool)
for y in range(ch):
    for x in range(int(cw * 0.7), cw):
        r, g, b = int(crop_arr[y, x, 0]), int(crop_arr[y, x, 1]), int(crop_arr[y, x, 2])
        if (r > 90 and r > b * 1.8 and r > g * 0.9) or (g > 120 and g > r and g > b * 1.5):
            frame_mask[y, x] = True

f_ys, f_xs = np.where(frame_mask)
if len(f_xs) > 0:
    print(f"Image 2 In-Game Shop Frame: x=[{f_xs.min()}, {f_xs.max()}], y=[{f_ys.min()}, {f_ys.max()}]")
    print(f"  Frame width={f_xs.max()-f_xs.min()}, height={f_ys.max()-f_ys.min()}, aspect ratio: {(f_xs.max()-f_xs.min()) / (f_ys.max()-f_ys.min()):.3f}")
    print(f"  Top margin: {f_ys.min()}px ({f_ys.min()/ch*100:.1f}%), Bottom margin: {ch - f_ys.max()}px ({(ch-f_ys.max())/ch*100:.1f}%)")
    print(f"  Right margin: {cw - f_xs.max()}px ({(cw-f_xs.max())/cw*100:.1f}%)")
