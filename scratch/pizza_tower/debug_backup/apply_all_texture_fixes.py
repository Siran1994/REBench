import os
from PIL import Image, ImageDraw, ImageFont

font_bold = 'C:/Windows/Fonts/msyhbd.ttc'

print("=== Applying All Comprehensive Texture Localizations ===")

# =========================================================================
# 1. building_office-sheet0.png (Gameplay Storefront Sign "披萨店")
# =========================================================================
print("1. Updating images/building_office-sheet0.png...")
im_store = Image.open('../pizza_tower_package/images/building_office-sheet0.png').convert('RGBA')
draw_store = ImageDraw.Draw(im_store)

# Reconstruct 4 wooden planks in x=202..465
for y in range(57, 172):
    for x in range(202, 466):
        if y in [85, 114, 143]:
            im_store.putpixel((x, y), (205, 131, 69, 255))
        elif 57 <= y <= 84:
            t = (y - 57) / 27.0
            im_store.putpixel((x, y), (int(250 - 4*t), int(176 - 8*t), int(112 - 8*t), 255))
        elif 86 <= y <= 113:
            t = (y - 86) / 27.0
            im_store.putpixel((x, y), (int(249 - 4*t), int(173 - 8*t), int(108 - 8*t), 255))
        elif 115 <= y <= 142:
            t = (y - 115) / 27.0
            im_store.putpixel((x, y), (int(248 - 4*t), int(170 - 8*t), int(104 - 8*t), 255))
        elif 144 <= y <= 171:
            t = (y - 144) / 27.0
            im_store.putpixel((x, y), (int(247 - 4*t), int(167 - 8*t), int(100 - 8*t), 255))

for y in range(56, 173):
    im_store.putpixel((465, y), (34, 30, 31, 255))

font_store = ImageFont.truetype(font_bold, 54)
chars = ["披", "萨", "店"]
xs = [252, 327, 402]
ty = 82

for ch, cx in zip(chars, xs):
    bb = draw_store.textbbox((0, 0), ch, font=font_store)
    cw, ch_h = bb[2] - bb[0], bb[3] - bb[1]
    tx = cx - cw // 2
    
    # 3D extrusion downward
    ext_col = (18, 38, 90, 255)
    for dy in range(1, 8):
        for dx in [-2, -1, 0, 1, 2]:
            draw_store.text((tx + dx, ty + dy), ch, fill=ext_col, font=font_store)
            
    # Outer contour
    outline_col = (24, 55, 130, 255)
    for dx in range(-4, 5):
        for dy in range(-4, 5):
            if dx*dx + dy*dy <= 18:
                draw_store.text((tx + dx, ty + dy), ch, fill=outline_col, font=font_store)
                
    # Cyan stroke
    cyan_col = (30, 170, 240, 255)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if dx*dx + dy*dy <= 5:
                draw_store.text((tx + dx, ty + dy), ch, fill=cyan_col, font=font_store)
                
    # Lime gradient fill
    mask = Image.new('L', (cw + 20, ch_h + 20), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.text((10, 10), ch, fill=255, font=font_store)
    
    grad = Image.new('RGBA', (cw + 20, ch_h + 20))
    for gy in range(ch_h + 20):
        t = gy / float(ch_h + 20)
        gr = int(215 * (1 - t) + 130 * t)
        gg = int(250 * (1 - t) + 215 * t)
        gb = int(45 * (1 - t) + 25 * t)
        for gx in range(cw + 20):
            grad.putpixel((gx, gy), (gr, gg, gb, 255))
    im_store.paste(grad, (tx - 10, ty - 10), mask=mask)

    # White specular highlight dot
    draw_store.ellipse([tx + 8, ty + 6, tx + 14, ty + 12], fill=(255, 255, 255, 220))

im_store.save('images/building_office-sheet0.png')
print("  images/building_office-sheet0.png saved successfully!")


# =========================================================================
# 2. btn_secondary-sheet0.png (Shop Upgrade & Achievement Buttons)
# =========================================================================
print("2. Updating images/btn_secondary-sheet0.png...")
im_sec = Image.open('../pizza_tower_package/images/btn_secondary-sheet0.png').convert('RGBA')

# Default_0 [1, 1, 144, 150] (Shop Upgrade Active button)
crop_sec0 = im_sec.crop((1, 1, 1 + 144, 1 + 150))
for y in range(16, 58):
    for x in range(16, 106):
        crop_sec0.putpixel((x, y), (239, 65, 54, 255))

draw_sec0 = ImageDraw.Draw(crop_sec0)
font_sec0 = ImageFont.truetype(font_bold, 24)
text_sec0 = "升级"
bb_sec0 = draw_sec0.textbbox((0, 0), text_sec0, font=font_sec0)
tw0, th0 = bb_sec0[2] - bb_sec0[0], bb_sec0[3] - bb_sec0[1]
tx0 = 58 - tw0 // 2
ty0 = 28 - th0 // 2
for dy in range(1, 5):
    for dx in [-1, 0, 1]:
        draw_sec0.text((tx0 + dx, ty0 + dy), text_sec0, fill=(60, 10, 15, 255), font=font_sec0)
for dx in [-2, -1, 0, 1, 2]:
    for dy in [-2, -1, 0, 1, 2]:
        if dx*dx + dy*dy <= 5:
            draw_sec0.text((tx0 + dx, ty0 + dy), text_sec0, fill=(35, 10, 45, 255), font=font_sec0)
draw_sec0.text((tx0, ty0), text_sec0, fill=(255, 240, 20, 255), font=font_sec0)
im_sec.paste(crop_sec0, (1, 1))

# Default_1 [147, 1, 142, 147] (Shop Upgrade Maxed button)
crop_sec1 = im_sec.crop((147, 1, 147 + 142, 1 + 147))
for y in range(50, 78):
    for x in range(14, 128):
        crop_sec1.putpixel((x, y), (141, 198, 63, 255))
draw_sec1 = ImageDraw.Draw(crop_sec1)
font_sec1 = ImageFont.truetype(font_bold, 22)
text_sec1 = "已满级"
bb_sec1 = draw_sec1.textbbox((0, 0), text_sec1, font=font_sec1)
tw1, th1 = bb_sec1[2] - bb_sec1[0], bb_sec1[3] - bb_sec1[1]
tx1 = 71 - tw1 // 2
ty1 = 63 - th1 // 2
for dy in range(1, 4):
    draw_sec1.text((tx1, ty1 + dy), text_sec1, fill=(20, 50, 10, 255), font=font_sec1)
for dx in [-2, -1, 0, 1, 2]:
    for dy in [-2, -1, 0, 1, 2]:
        if dx*dx + dy*dy <= 5:
            draw_sec1.text((tx1 + dx, ty1 + dy), text_sec1, fill=(15, 40, 10, 255), font=font_sec1)
draw_sec1.text((tx1, ty1), text_sec1, fill=(255, 255, 255, 255), font=font_sec1)
im_sec.paste(crop_sec1, (147, 1))

# Achievement_0 [291, 1, 131, 139] (Earn Reward Active)
crop_ach0 = im_sec.crop((291, 1, 291 + 131, 1 + 139))
for y in range(14, 48):
    for x in range(14, 118):
        crop_ach0.putpixel((x, y), (239, 65, 54, 255))
draw_ach0 = ImageDraw.Draw(crop_ach0)
font_ach = ImageFont.truetype(font_bold, 20)
text_ach = "领奖励"
bb_ach = draw_ach0.textbbox((0, 0), text_ach, font=font_ach)
tw_a, th_a = bb_ach[2] - bb_ach[0], bb_ach[3] - bb_ach[1]
tx_a = 65 - tw_a // 2
ty_a = 28 - th_a // 2
for dy in range(1, 4):
    draw_ach0.text((tx_a, ty_a + dy), text_ach, fill=(60, 10, 15, 255), font=font_ach)
for dx in [-2, -1, 0, 1, 2]:
    for dy in [-2, -1, 0, 1, 2]:
        if dx*dx + dy*dy <= 5:
            draw_ach0.text((tx_a + dx, ty_a + dy), text_ach, fill=(35, 10, 45, 255), font=font_ach)
draw_ach0.text((tx_a, ty_a), text_ach, fill=(255, 235, 20, 255), font=font_ach)
im_sec.paste(crop_ach0, (291, 1))

# Achievement_1 [291, 142, 131, 139] (Earn Reward Disabled)
crop_ach1 = im_sec.crop((291, 142, 291 + 131, 142 + 139))
for y in range(14, 48):
    for x in range(14, 118):
        crop_ach1.putpixel((x, y), (109, 110, 113, 255))
draw_ach1 = ImageDraw.Draw(crop_ach1)
for dy in range(1, 4):
    draw_ach1.text((tx_a, ty_a + dy), text_ach, fill=(25, 25, 25, 255), font=font_ach)
for dx in [-2, -1, 0, 1, 2]:
    for dy in [-2, -1, 0, 1, 2]:
        if dx*dx + dy*dy <= 5:
            draw_ach1.text((tx_a + dx, ty_a + dy), text_ach, fill=(20, 20, 20, 255), font=font_ach)
draw_ach1.text((tx_a, ty_a), text_ach, fill=(190, 190, 190, 255), font=font_ach)
im_sec.paste(crop_ach1, (291, 142))

im_sec.save('images/btn_secondary-sheet0.png')
print("  images/btn_secondary-sheet0.png saved successfully!")


# =========================================================================
# 3. btn_generic-sheet0.png (Free Cash Ad Button "免费钞票")
# =========================================================================
print("3. Updating images/btn_generic-sheet0.png...")
im_gen = Image.open('../pizza_tower_package/images/btn_generic-sheet0.png').convert('RGBA')

def patch_ad_generic(btn_crop, is_disabled=False):
    # Wipe text area on right
    for y in range(16, 122):
        for x in range(46, 122):
            if y < 68:
                col = (170, 63, 198, 255) if not is_disabled else (88, 88, 88, 255)
            else:
                col = (148, 0, 25, 255) if not is_disabled else (53, 53, 53, 255)
            btn_crop.putpixel((x, y), col)
            
    # Cleanly erase WATCH letters over clapper top arm
    for y in range(16, 52):
        for x in range(18, 46):
            y_center = 50.0 - 0.58 * (x - 6.0)
            dist = abs(y - y_center)
            if dist > 8.0:
                col = (170, 63, 198, 255) if not is_disabled else (88, 88, 88, 255)
                btn_crop.putpixel((x, y), col)
            elif dist <= 6.5:
                phase = (x + y * 1.5) % 16
                if phase < 8:
                    arm_col = (245, 240, 245, 255) if not is_disabled else (210, 210, 210, 255)
                else:
                    arm_col = (124, 46, 146, 255) if not is_disabled else (60, 60, 60, 255)
                btn_crop.putpixel((x, y), arm_col)
            else:
                btn_crop.putpixel((x, y), (20, 10, 25, 255))
                
    # Close right edge of clapper arm with clean cap
    for y in range(23, 33):
        btn_crop.putpixel((45, y), (20, 10, 25, 255))
        btn_crop.putpixel((46, y), (20, 10, 25, 255))
        
    draw = ImageDraw.Draw(btn_crop)
    font = ImageFont.truetype(font_bold, 24)
    line1, line2 = '免费', '钞票'
    bb1 = draw.textbbox((0, 0), line1, font=font)
    bb2 = draw.textbbox((0, 0), line2, font=font)
    w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
    w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]
    
    cx = 84
    x1, x2 = cx - w1 // 2, cx - w2 // 2
    y1, y2 = 26, 68
    
    shadow_col = (45, 0, 10, 255) if not is_disabled else (20, 20, 20, 255)
    outline_col = (20, 0, 5, 255) if not is_disabled else (15, 15, 15, 255)
    
    col1 = (255, 235, 20, 255) if not is_disabled else (220, 220, 220, 255)
    for dy in range(1, 4):
        draw.text((x1, y1 + dy), line1, fill=shadow_col, font=font)
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            if dx*dx + dy*dy <= 5:
                draw.text((x1 + dx, y1 + dy), line1, fill=outline_col, font=font)
    draw.text((x1, y1), line1, fill=col1, font=font)
    
    col2 = (255, 255, 255, 255) if not is_disabled else (190, 190, 190, 255)
    for dy in range(1, 4):
        draw.text((x2, y2 + dy), line2, fill=shadow_col, font=font)
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            if dx*dx + dy*dy <= 5:
                draw.text((x2 + dx, y2 + dy), line2, fill=outline_col, font=font)
    draw.text((x2, y2), line2, fill=col2, font=font)
    
    return btn_crop

c5 = patch_ad_generic(im_gen.crop((701, 564, 701 + 132, 564 + 140)), is_disabled=False)
im_gen.paste(c5, (701, 564))

c6 = patch_ad_generic(im_gen.crop((835, 564, 835 + 132, 564 + 140)), is_disabled=True)
im_gen.paste(c6, (835, 564))

im_gen.save('images/btn_generic-sheet0.png')
print("  images/btn_generic-sheet0.png saved successfully!")


# =========================================================================
# 4. dice-sheet0.png (Crisp Clean Dice Button "掷骰子")
# =========================================================================
print("4. Updating images/dice-sheet0.png...")
im_dice = Image.open('../pizza_tower_package/images/dice-sheet0.png').convert('RGBA')
rx, ry, rw, rh = 267, 952, 70, 70
crop_dice = im_dice.crop((rx, ry, rx + rw, ry + rh))

# Fill inner white face cleanly
for y in range(17, 54):
    for x in range(13, 58):
        crop_dice.putpixel((x, y), (232, 232, 232, 255))
        
draw_dice = ImageDraw.Draw(crop_dice)
font_top = ImageFont.truetype(font_bold, 15)
font_bot = ImageFont.truetype(font_bold, 13)

l1 = "掷"
l2 = "骰子"
bb1 = draw_dice.textbbox((0, 0), l1, font=font_top)
bb2 = draw_dice.textbbox((0, 0), l2, font=font_bot)
w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]

x1 = 35 - w1 // 2
x2 = 35 - w2 // 2
y1 = 18
y2 = 34

red_col = (215, 25, 25, 255)
draw_dice.text((x1, y1), l1, fill=red_col, font=font_top)
draw_dice.text((x2, y2), l2, fill=red_col, font=font_bot)

im_dice.paste(crop_dice, (rx, ry))
im_dice.save('images/dice-sheet0.png')
print("  images/dice-sheet0.png saved successfully!")


# =========================================================================
# 5. go_trophy-sheet0.png & sheet1.png (Clean Defeat / Victory Trophy)
# =========================================================================
print("5. Updating images/go_trophy-sheet0.png and go_trophy-sheet1.png...")

for sheet_idx, (text1, text2, is_lost) in enumerate([('挑战', '失败', True), ('挑战', '成功', False)]):
    orig_fn = f'../pizza_tower_package/images/go_trophy-sheet{sheet_idx}.png'
    im_trophy = Image.open(orig_fn).convert('RGBA')
    
    # 1. Clean reconstruction of cup stem and pedestal
    for y in range(165, 330):
        for x in range(im_trophy.width):
            if y < 272:
                stem_left = int(80 + (y - 165) * 0.25)
                stem_right = int(210 - (y - 165) * 0.25)
                if x < stem_left or x > stem_right:
                    im_trophy.putpixel((x, y), (0, 0, 0, 0))
                else:
                    t = (x - stem_left) / float(stem_right - stem_left)
                    edge_t = abs(t - 0.5) * 2
                    r = int(250 * (1 - 0.2 * edge_t))
                    g = int(190 * (1 - 0.3 * edge_t))
                    b = int(5)
                    im_trophy.putpixel((x, y), (r, g, b, 255))
            else:
                if x < 55 or x > 235:
                    if y <= 340:
                        im_trophy.putpixel((x, y), (0, 0, 0, 0))
                else:
                    im_trophy.putpixel((x, y), (35, 33, 38, 255))
                    
    draw_trophy = ImageDraw.Draw(im_trophy)
    font1 = ImageFont.truetype(font_bold, 50)
    font2 = ImageFont.truetype(font_bold, 54)
    
    bb1 = draw_trophy.textbbox((0, 0), text1, font=font1)
    bb2 = draw_trophy.textbbox((0, 0), text2, font=font2)
    w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
    w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]
    
    cx = 145
    x1, x2 = cx - w1 // 2, cx - w2 // 2
    y1, y2 = 175, 238
    
    if is_lost:
        ext_col = (85, 15, 10, 255)
        outline_col = (38, 8, 5, 255)
        grad_top1 = (255, 230, 45)
        grad_bot1 = (250, 140, 25)
        grad_top2 = (255, 205, 35)
        grad_bot2 = (240, 60, 20)
    else:
        ext_col = (20, 65, 15, 255)
        outline_col = (10, 35, 8, 255)
        grad_top1 = (255, 240, 50)
        grad_bot1 = (230, 200, 30)
        grad_top2 = (210, 255, 45)
        grad_bot2 = (110, 215, 25)
        
    items = [(text1, (x1, y1), font1, (w1, h1), grad_top1, grad_bot1),
             (text2, (x2, y2), font2, (w2, h2), grad_top2, grad_bot2)]
             
    for text, (tx, ty), f, (tw, th), g_top, g_bot in items:
        # 3D extrusion downward (8px)
        for dy in range(1, 9):
            for dx in [-2, -1, 0, 1, 2]:
                draw_trophy.text((tx + dx, ty + dy), text, fill=ext_col, font=f)
        # Bold outer contour (5px)
        for dx in range(-5, 6):
            for dy in range(-5, 6):
                if dx*dx + dy*dy <= 25:
                    draw_trophy.text((tx + dx, ty + dy), text, fill=outline_col, font=f)
        # Gradient fill
        mask = Image.new('L', (tw + 20, th + 20), 0)
        d_mask = ImageDraw.Draw(mask)
        d_mask.text((10, 10), text, fill=255, font=f)
        
        grad = Image.new('RGBA', (tw + 20, th + 20))
        for gy in range(th + 20):
            t = gy / float(th + 20)
            gr = int(g_top[0] * (1 - t) + g_bot[0] * t)
            gg = int(g_top[1] * (1 - t) + g_bot[1] * t)
            gb = int(g_top[2] * (1 - t) + g_bot[2] * t)
            for gx in range(tw + 20):
                grad.putpixel((gx, gy), (gr, gg, gb, 255))
        im_trophy.paste(grad, (tx - 10, ty - 10), mask=mask)
        
    save_path = f'images/go_trophy-sheet{sheet_idx}.png'
    im_trophy.save(save_path)
    print(f"  {save_path} saved successfully!")


# =========================================================================
# 6. ui_assets-sheet0.png & ui_preview_images-sheet0.png
# =========================================================================
print("6. Updating ui_assets-sheet0.png and ui_preview_images-sheet0.png...")
def patch_pizza_shop_sign(full_im, sign_x, sign_y, sign_w, sign_h):
    sign_crop = full_im.crop((sign_x, sign_y, sign_x + sign_w, sign_y + sign_h))
    draw = ImageDraw.Draw(sign_crop)
    for y in range(12, 85):
        for x in range(30, 142):
            if y in [36, 37, 63, 64]:
                col = (223, 156, 84, 255)
            elif y in [35, 62]:
                col = (233, 170, 93, 255)
            else:
                col = (255, 200, 113, 255)
            sign_crop.putpixel((x, y), col)

    font = ImageFont.truetype(font_bold, 26)
    text = "披萨店"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = 86 - tw // 2
    ty = 48 - th // 2
    shadow_col = (18, 52, 105, 255)
    for dy in range(1, 5):
        draw.text((tx, ty + dy), text, fill=shadow_col, font=font)
    outline_col = (28, 105, 185, 255)
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            if dx*dx + dy*dy <= 5:
                draw.text((tx + dx, ty + dy), text, fill=outline_col, font=font)
    fill_col = (150, 225, 45, 255)
    draw.text((tx, ty), text, fill=fill_col, font=font)
    full_im.paste(sign_crop, (sign_x, sign_y))
    return full_im

im_assets = Image.open('../pizza_tower_package/images/ui_assets-sheet0.png').convert('RGBA')
im_assets = patch_pizza_shop_sign(im_assets, 290, 80, 150, 150)
im_assets.save('images/ui_assets-sheet0.png')

im_prev = Image.open('../pizza_tower_package/images/ui_preview_images-sheet0.png').convert('RGBA')
im_prev = patch_pizza_shop_sign(im_prev, 290, 80, 150, 150)
im_prev.save('images/ui_preview_images-sheet0.png')
print("  ui_assets-sheet0.png and ui_preview_images-sheet0.png saved successfully!")


# =========================================================================
# 7. vfx_text-sheet0.png & vfx_level_up-sheet0.png
# =========================================================================
print("7. Updating vfx_text-sheet0.png and vfx_level_up-sheet0.png...")
im_vfx = Image.open('../pizza_tower_package/images/vfx_text-sheet0.png').convert('RGBA')

def patch_vfx_text(full_im, rx, ry, rw, rh, text):
    crop_vfx = Image.new('RGBA', (rw, rh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(crop_vfx)
    font = ImageFont.truetype(font_bold, 30)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (rw - tw) // 2
    ty = (rh - th) // 2 - 2
    outline_col = (34, 30, 31, 255)
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            if dx*dx + dy*dy <= 5:
                draw.text((tx + dx, ty + dy), text, fill=outline_col, font=font)
    draw.text((tx, ty), text, fill=(254, 220, 10, 255), font=font)
    full_im.paste(crop_vfx, (rx, ry))
    return full_im

im_vfx = patch_vfx_text(im_vfx, 1, 285, 430, 45, "金币不足")
im_vfx = patch_vfx_text(im_vfx, 1, 332, 406, 45, "钞票不足")
im_vfx.save('images/vfx_text-sheet0.png')

# vfx_level_up-sheet0.png
lvl_path = 'images/vfx_level_up-sheet0.png'
im_lvl = Image.new('RGBA', (230, 190), (0, 0, 0, 0))
draw_lvl = ImageDraw.Draw(im_lvl)
font_lvl = ImageFont.truetype(font_bold, 40)
text_lvl = "等级提升"
bb_lvl = draw_lvl.textbbox((0, 0), text_lvl, font=font_lvl)
lw, lh = bb_lvl[2] - bb_lvl[0], bb_lvl[3] - bb_lvl[1]
lx = (230 - lw) // 2
ly = (190 - lh) // 2
for dy in range(1, 6):
    for dx in [-2, -1, 0, 1, 2]:
        draw_lvl.text((lx + dx, ly + dy), text_lvl, fill=(80, 15, 10, 255), font=font_lvl)
for dx in [-3, -2, -1, 0, 1, 2, 3]:
    for dy in [-3, -2, -1, 0, 1, 2, 3]:
        if dx*dx + dy*dy <= 9:
            draw_lvl.text((lx + dx, ly + dy), text_lvl, fill=(40, 10, 5, 255), font=font_lvl)
draw_lvl.text((lx, ly), text_lvl, fill=(245, 80, 50, 255), font=font_lvl)
im_lvl.save(lvl_path)
print("  vfx_text-sheet0.png and vfx_level_up-sheet0.png saved successfully!")

print("\n=== ALL TEXTURES COMPREHENSIVELY UPDATED! ===")
