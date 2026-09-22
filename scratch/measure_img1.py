from PIL import Image
import numpy as np

img1_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962046776.png'
im1 = Image.open(img1_path).convert('RGB')
arr1 = np.array(im1)

# In Image 1, the right frame is around x > 500
# Let's find the wooden border color (brown: R > 100, G ~ 50..80, B < 40)
h, w, _ = arr1.shape
print(f"Image 1: w={w}, h={h}")

# Let's inspect columns from x=500 to w-1
for x in range(500, w, 20):
    for y in range(0, h, 20):
        r, g, b = arr1[y, x]
        # check
        pass

# Find wooden border bounding box in Image 1:
# The border is brown / wood. Leaves are bright green.
# Let's find the bounding box of the frame in x in [450, w]:
frame_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(450, w):
        r, g, b = int(arr1[y, x, 0]), int(arr1[y, x, 1]), int(arr1[y, x, 2])
        # Wood border: r > 100, r > b * 2, r > g
        # Or leaf: g > 120, g > r * 1.2
        if (r > 90 and r > b * 1.8 and r > g * 0.9) or (g > 120 and g > r and g > b * 1.5):
            frame_mask[y, x] = True

ys, xs = np.where(frame_mask)
if len(xs) > 0:
    print(f"Image 1 Right Frame Bounding Box: x=[{xs.min()}, {xs.max()}], y=[{ys.min()}, {ys.max()}]")
    print(f"  Frame width={xs.max()-xs.min()}, height={ys.max()-ys.min()}, aspect ratio: {(xs.max()-xs.min()) / (ys.max()-ys.min()):.3f}")
    print(f"  Top margin: {ys.min()}px ({ys.min()/h*100:.1f}%), Bottom margin: {h - ys.max()}px ({(h-ys.max())/h*100:.1f}%)")
    print(f"  Right margin: {w - xs.max()}px ({ (w-xs.max())/w*100:.1f}%)")

# Now find cabbage bounding box in x in [0, 500]:
# Cabbage is light green / yellow-green: g > 150, r > 100, b > 50, g > r
cabbage_mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(0, 520):
        r, g, b = int(arr1[y, x, 0]), int(arr1[y, x, 1]), int(arr1[y, x, 2])
        if g > 140 and r > 110 and b < 180 and g >= r * 0.9:
            cabbage_mask[y, x] = True

c_ys, c_xs = np.where(cabbage_mask)
if len(c_xs) > 0:
    print(f"Image 1 Cabbage Bounding Box: x=[{c_xs.min()}, {c_xs.max()}], y=[{c_ys.min()}, {c_ys.max()}]")
    print(f"  Cabbage width={c_xs.max()-c_xs.min()}, height={c_ys.max()-c_ys.min()}")
    print(f"  Top margin: {c_ys.min()}px ({c_ys.min()/h*100:.1f}%), Bottom margin: {h - c_ys.max()}px ({(h-c_ys.max())/h*100:.1f}%)")
    print(f"  Vertical Center of Cabbage: {(c_ys.min() + c_ys.max()) / 2:.1f} (Image center is {h/2:.1f})")
