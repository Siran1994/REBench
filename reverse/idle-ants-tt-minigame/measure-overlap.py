from PIL import Image
import numpy as np

im = Image.open('C:/Users/CY/.gemini/antigravity-ide/brain/05a5e5be-81c9-49d1-9da3-ab22c381d427/.user_uploaded/media_1788921610033.png').convert('RGB')
arr = np.array(im)

for y in range(40, 90, 5):
    row = arr[y, :, :]
    # Check peach color (Money bar)
    peach = np.where((row[:, 0] > 220) & (row[:, 1] > 160) & (row[:, 2] < 160))[0]
    # Check dark color (Ant bar)
    dark = np.where((row[:, 0] < 70) & (row[:, 1] < 70) & (row[:, 2] < 70))[0]
    if len(peach) > 0 and len(dark) > 0:
        print(f"Row {y}: peach=[{peach[0]}..{peach[-1]}], dark=[{dark[0]}..{dark[-1]}], overlap={peach[-1] - dark[0]}")
