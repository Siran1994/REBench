from PIL import Image
import numpy as np

# Load textures
bg_im = Image.open('siyangruchong_art_assets/Textures/floor_1_2.png') # green dark table
cabbage_im = Image.open('modified/siyangruchong_art_assets/Sprites/TableSmall2_2.png').convert('RGBA')

# Target aspect ratio: e.g. 700x366 (img1) or 864x412
W, H = 700, 366
screen = Image.new('RGBA', (W, H), (34, 48, 41, 255)) # Dark green table color

# In camera: vertical size is 2.0 units -> H pixels
# So 1 unit = H / 2.0 = 183 pixels
# Cam center: Y = 0.16, X = 0.30
# If cabbage center is at Y = 0.16, in screen Y it is H / 2 = 183!
# Cabbage scale: if scale_y = 0.79, height = 2.4 * 0.79 * 183 = 347 pixels! (347 / 366 = 94.8% of screen)
c_h = int(2.40 * 0.79 * (H / 2.0))
c_w = int(2.82 * 0.69 * (H / 2.0))

cabbage_resized = cabbage_im.resize((c_w, c_h), Image.Resampling.LANCZOS)

# Position of cabbage in screen:
# Center Y = H / 2 = 183 -> top Y = 183 - c_h // 2 = 10
# Center X: cabbage world X = -0.046, cam world X = 0.30 -> delta X = -0.346 units
# screen X = W / 2 + delta X * (H / 2.0) = 350 - 0.346 * 183 = 350 - 63 = 287
top_y = 183 - c_h // 2
left_x = 287 - c_w // 2

screen.paste(cabbage_resized, (left_x, top_y), cabbage_resized)
screen.save('scratch/simulated_cabbage_centering.png')
print(f'Simulated cabbage top_y={top_y}, bottom_y={top_y+c_h}, left_x={left_x}, right_x={left_x+c_w}')
print('Screen size:', W, H)
