from PIL import Image
from PIL import ImageDraw
import numpy as np

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789974153275.png'
im = Image.open(img_path).convert('RGB')
w, h = im.size

# User red box in screenshot:
# Left=169, Right=736 (width=567)
# Top=124, Bottom=505 (height=381)
box = [169, 124, 736, 505]

# Load TableSmall2_2 sprite
c_im = Image.open('modified/siyangruchong_art_assets/Sprites/TableSmall2_2.png').convert('RGBA')

# Target size inside box: 567 x 381
c_resized = c_im.resize((567, 381), Image.Resampling.LANCZOS)

# Create simulation preview
preview = im.copy()
draw = ImageDraw.Draw(preview)

# Clear the old cabbage inside the box region with dark table color (44, 63, 53)
draw.rectangle(box, fill=(44, 63, 53))

# Paste resized cabbage directly into box
preview.paste(c_resized, (169, 124), c_resized)

# Re-draw the red box outline to verify fit
draw.rectangle(box, outline=(255, 0, 0), width=2)

preview.save('scratch/simulated_box_fit_preview.png')
print("已保存贴合模拟图: scratch/simulated_box_fit_preview.png")
print(f"目标方框: {box}")
print(f"贴合后白菜叶尺寸: 567 x 381")
