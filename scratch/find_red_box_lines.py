from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape

# red mask
red_mask = (arr[:, :, 0] > 190) & (arr[:, :, 1] < 60) & (arr[:, :, 2] < 60)

# Save red mask image
Image.fromarray((red_mask * 255).astype(np.uint8)).save('scratch/red_mask.png')

# Let's crop x in [700, 950], y in [100, 450]
crop = im.crop((700, 100, 950, 450))
crop.save('scratch/red_box_crop.png')

# Find horizontal lines of the box (top edge and bottom edge)
# Top edge: y where many red pixels in x in [740, 910]
row_reds = [np.sum(red_mask[y, 740:910]) for y in range(h)]
col_reds = [np.sum(red_mask[160:420, x]) for x in range(w)]

top_edges = [y for y in range(h) if row_reds[y] > 50]
bot_edges = [y for y in range(h) if row_reds[y] > 50]
left_edges = [x for x in range(w) if col_reds[x] > 50]
right_edges = [x for x in range(w) if col_reds[x] > 50]

print(f"Top red line Y: {min(top_edges)} ~ {max([y for y in top_edges if y < 250])}")
print(f"Bottom red line Y: {min([y for y in bot_edges if y > 350])} ~ {max(bot_edges)}")
print(f"Left red line X: {min(left_edges)} ~ {max([x for x in left_edges if x < 800])}")
print(f"Right red line X: {min([x for x in right_edges if x > 850])} ~ {max(right_edges)}")
