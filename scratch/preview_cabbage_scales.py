from PIL import Image
import numpy as np

# Load original screenshots and sprites
im1 = Image.open(r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789973103445.png').convert('RGB')
cabbage_sprite = Image.open('modified/siyangruchong_art_assets/Sprites/TableSmall2_2.png').convert('RGBA')

# In current screenshot, cabbage center is around (406, 245)
# Current size is roughly 626 x 389
# Let's create preview for 85% and 80% scale:
for pct, name in [(0.85, 'scale_85'), (0.80, 'scale_80')]:
    preview = im1.copy()
    new_w = int(626 * pct)
    new_h = int(389 * pct)
    c_resized = cabbage_sprite.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # center is at (406, 245)
    paste_x = 406 - new_w // 2
    paste_y = 245 - new_h // 2
    
    # Draw background under cabbage (green desk color)
    # Dark desk color: (34, 48, 41)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(preview)
    # Clear old cabbage area:
    draw.rectangle([94, 51, 719, 439], fill=(44, 63, 53))
    
    # Paste new cabbage
    preview.paste(c_resized, (paste_x, paste_y), c_resized)
    preview.save(f'scratch/cabbage_{name}_preview.png')
    print(f"已生成 {name} 预览图: scratch/cabbage_{name}_preview.png (尺寸: {new_w} x {new_h}, 左={paste_x}, 上={paste_y})")
