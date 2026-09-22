from PIL import Image
import numpy as np

im2 = Image.open(r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962077534.png')
arr = np.array(im2)

# Scan horizontal line y=270 (middle of image):
row = arr[270]
# Find where the screen starts and ends horizontally
for x in range(len(row)):
    r, g, b, a = row[x] if len(row[x]) == 4 else (*row[x], 255)
    # The game background at middle y is the cabbage (bright green, g > 150)
    # or background (dark green, g > 40)
    if g > 30 and g > r:
        pass

# Let's find exactly the bezel boundary:
# Scan along vertical line x=500 (middle x):
col = arr[:, 500]
screen_ys = []
for y in range(len(col)):
    r, g, b = col[y][:3]
    if int(g) > 40:
        screen_ys.append(y)

# Scan along horizontal line y=150:
row_top = arr[150]
screen_xs = []
for x in range(len(row_top)):
    r, g, b = row_top[x][:3]
    if int(g) > 40:
        screen_xs.append(x)

print(f"Screen Y: min={min(screen_ys)}, max={max(screen_ys)}, height={max(screen_ys)-min(screen_ys)+1}")
print(f"Screen X: min={min(screen_xs)}, max={max(screen_xs)}, width={max(screen_xs)-min(screen_xs)+1}")

exact_crop = im2.crop((min(screen_xs), min(screen_ys), max(screen_xs)+1, max(screen_ys)+1))
exact_crop.save(r'd:/Desktop/REBench/scratch/exact_game_screen.png')
print("Exact screen aspect ratio:", exact_crop.width / exact_crop.height)
