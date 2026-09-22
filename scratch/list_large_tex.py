import os
from PIL import Image

textures_dir = 'siyangruchong_art_assets/Textures'
for f in os.listdir(textures_dir):
    p = os.path.join(textures_dir, f)
    try:
        im = Image.open(p)
        # Check if height > 100 or width > 100
        if im.width >= 100 and im.height >= 100:
            print(f"{f}: {im.size}, mode={im.mode}")
    except Exception:
        pass
