from PIL import Image
import numpy as np

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789974153275.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape
print("Image shape:", arr.shape)

# Find red pixels: R > 150, G < 100, B < 100
red_mask = (arr[:, :, 0] > 150) & (arr[:, :, 1] < 100) & (arr[:, :, 2] < 100)
ys, xs = np.where(red_mask)
print("Red pixels count with looser threshold:", len(xs))
if len(xs) > 0:
    print(f"X: [{xs.min()}, {xs.max()}], Y: [{ys.min()}, {ys.max()}]")
    # find lines
    # save mask
    Image.fromarray((red_mask * 255).astype(np.uint8)).save('scratch/user_cabbage_red_box_mask.png')
