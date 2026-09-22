import UnityPy
from PIL import Image
import numpy as np

# Sprite: TableSmall2_2.png in modified
c_im = Image.open('modified/siyangruchong_art_assets/Sprites/TableSmall2_2.png')
print("TableSmall2_2 size:", c_im.size) # 280 x 238
# Content bounding box in TableSmall2_2:
arr = np.array(c_im.convert('RGBA'))
alpha = arr[:, :, 3]
ys, xs = np.where(alpha > 10)
c_w = xs.max() - xs.min() + 1 # 280
c_h = ys.max() - ys.min() + 1 # 238

# PixelsToUnits = 100.0
# World base size: w = 2.80, h = 2.38
# Orthographic Camera: size = 1.0 -> visible world height = 2.0 units
# Cam Pos: (0.30, 0.16, -10.0)

# Screen in screenshot media_1789974153275.png:
# Let's find the screen bounds in media_1789974153275.png
# Total image: 992 x 593
# Red box in this screenshot:
# Top=124, Bottom=505 -> Height = 381
# Left=169, Right=736 -> Width = 567
# In this screen:
# Screen visible height (between top bar and home bar) is roughly 385px (from y~122 to y~507)!
# Visible world height is 2.0 units -> so 1 unit = 385 / 2.0 = 192.5 pixels in this screenshot!
# Cam Pos Y = 0.16 -> corresponds to screen Y = 124 + 381 / 2 = 314.5!

# If cabbage should fit inside [Left=169, Right=736, Top=124, Bottom=505]:
# Target width = 567 pixels -> in world units: 567 / 192.5 = 2.945 units!
# Target height = 381 pixels -> in world units: 381 / 192.5 = 1.979 units!

# If cabbage base size is (2.80, 2.38):
# Scale.x needed = 2.945 / 2.80 = 1.051
# Scale.y needed = 1.979 / 2.38 = 0.831

# Target center X: 452.5 pixels
# Screen center X (Cam X = 0.30) is at some X:
# Let's find where Cam X = 0.30 maps to in this screenshot:
# Wood frame BG center was Canvas X = 895 -> in screenshot:
# Wood frame right edge ~ 935, left edge ~ 740 -> center ~ 837
# Wood frame center (895) to Cam center (0):
# Delta X = 895 * (visible_screen_w / 2340)
print(f"Target world width: {567 / 192.5:.3f} units")
print(f"Target world height: {381 / 192.5:.3f} units")
