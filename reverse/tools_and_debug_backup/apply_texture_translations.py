import os
from PIL import Image, ImageDraw, ImageFont

font_bold = 'C:/Windows/Fonts/msyhbd.ttc'

print("=== Starting Texture Localizations ===")

# =========================================================================
# 1. dice-sheet0.png: Replace "THROW DICE" with "掷骰子" at [267, 952, 70, 70]
# =========================================================================
print("1. Updating images/dice-sheet0.png...")
dice_path = 'images/dice-sheet0.png'
im_dice = Image.open(dice_path).convert('RGBA')

rx, ry, rw, rh = 267, 952, 70, 70
crop_dice = im_dice.crop((rx, ry, rx + rw, ry + rh))

# Inpaint old red letters on the white dice face
for y in range(crop_dice.height):
    for x in range(crop_dice.width):
        r, g, b, a = crop_dice.getpixel((x, y))
        if r > 160 and g < 100 and b < 100 and a > 150:
            crop_dice.putpixel((x, y), (230, 230, 230, 255))

# Draw "掷骰子"
draw_dice = ImageDraw.Draw(crop_dice)
font_dice = ImageFont.truetype(font_bold, 13)
bbox_d = draw_dice.textbbox((0, 0), "掷骰子", font=font_dice)
dw = bbox_d[2] - bbox_d[0]
dh = bbox_d[3] - bbox_d[1]
dx = (rw - dw) // 2
dy = (rh - dh) // 2
# Red text matching original red color
draw_dice.text((dx, dy), "掷骰子", fill=(205, 30, 40, 255), font=font_dice)

im_dice.paste(crop_dice, (rx, ry))
im_dice.save(dice_path)
print("  dice-sheet0.png updated successfully!")


# =========================================================================
# 2. btn_secondary-sheet0.png: Replace "UPGRADE" with "升级"
#    Frame 0: [291, 1, 131, 139] (Red active)
#    Frame 1: [291, 142, 131, 139] (Gray disabled)
# =========================================================================
print("2. Updating images/btn_secondary-sheet0.png...")
sec_path = 'images/btn_secondary-sheet0.png'
im_sec = Image.open(sec_path).convert('RGBA')

def patch_secondary_upgrade(btn_crop, is_disabled=False):
    draw = ImageDraw.Draw(btn_crop)
    # Inpaint old "UPGRADE" area
    for y in range(12, 38):
        for x in range(12, 85):
            cur = btn_crop.getpixel((x, y))
            if cur[3] > 200 and not (cur[0] < 50 and cur[1] < 50 and cur[2] < 50):
                t = (y - 8) / 110.0
                if not is_disabled:
                    r = int(239 * (1 - t) + 190 * t)
                    g = int(65 * (1 - t) + 30 * t)
                    b = int(54 * (1 - t) + 45 * t)
                else:
                    r = int(110 * (1 - t) + 77 * t)
                    g = int(110 * (1 - t) + 77 * t)
                    b = int(110 * (1 - t) + 77 * t)
                btn_crop.putpixel((x, y), (r, g, b, 255))

    font = ImageFont.truetype(font_bold, 18)
    text = "升级"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = 48 - tw // 2
    ty = 23 - th // 2
    shadow_col = (50, 8, 12, 255) if not is_disabled else (30, 30, 30, 255)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (0, 2), (-1, 1), (1, 1)]:
        draw.text((tx + dx, ty + dy), text, fill=shadow_col, font=font)
    draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)
    return btn_crop

# Patch frame 0
c_sec0 = patch_secondary_upgrade(im_sec.crop((291, 1, 291 + 131, 1 + 139)), is_disabled=False)
im_sec.paste(c_sec0, (291, 1))

# Patch frame 1
c_sec1 = patch_secondary_upgrade(im_sec.crop((291, 142, 291 + 131, 142 + 139)), is_disabled=True)
im_sec.paste(c_sec1, (291, 142))

im_sec.save(sec_path)
print("  btn_secondary-sheet0.png updated successfully!")


# =========================================================================
# 3. btn_generic-sheet0.png: Replace "WATCH FREE CASH" with "免费钞票"
#    Frame 5: [701, 564, 132, 140] (Purple active)
#    Frame 6: [835, 564, 132, 140] (Gray disabled)
# =========================================================================
print("3. Updating images/btn_generic-sheet0.png...")
gen_path = 'images/btn_generic-sheet0.png'
im_gen = Image.open(gen_path).convert('RGBA')

def patch_ad_btn(btn_crop, is_disabled=False):
    draw = ImageDraw.Draw(btn_crop)
    for y in range(16, 120):
        for x in range(40, 122):
            cur = btn_crop.getpixel((x, y))
            if cur[3] > 200 and not (cur[0] < 30 and cur[1] < 10 and cur[2] < 10):
                t = (y - 10) / 115.0
                if not is_disabled:
                    r = int(170 * (1 - t) + 148 * t)
                    g = int(63 * (1 - t) + 0 * t)
                    b = int(198 * (1 - t) + 25 * t)
                else:
                    r = int(88 * (1 - t) + 53 * t)
                    g = int(88 * (1 - t) + 53 * t)
                    b = int(88 * (1 - t) + 53 * t)
                btn_crop.putpixel((x, y), (r, g, b, 255))

    font = ImageFont.truetype(font_bold, 20)
    line1, line2 = "免费", "钞票"
    bb1 = draw.textbbox((0, 0), line1, font=font)
    bb2 = draw.textbbox((0, 0), line2, font=font)
    w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
    w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]
    center_x = 80
    x1, x2 = center_x - w1 // 2, center_x - w2 // 2
    total_h = h1 + h2 + 8
    start_y = (140 - total_h) // 2
    y1, y2 = start_y, start_y + h1 + 8
    shadow_col = (45, 0, 10, 255) if not is_disabled else (20, 20, 20, 255)
    for text, (tx, ty) in [(line1, (x1, y1)), (line2, (x2, y2))]:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (0, 2), (-1, 1), (1, 1)]:
            draw.text((tx + dx, ty + dy), text, fill=shadow_col, font=font)
        draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)
    return btn_crop

c_gen5 = patch_ad_btn(im_gen.crop((701, 564, 701 + 132, 564 + 140)), is_disabled=False)
im_gen.paste(c_gen5, (701, 564))

c_gen6 = patch_ad_btn(im_gen.crop((835, 564, 835 + 132, 564 + 140)), is_disabled=True)
im_gen.paste(c_gen6, (835, 564))

im_gen.save(gen_path)
print("  btn_generic-sheet0.png updated successfully!")


# =========================================================================
# 4. ui_assets-sheet0.png & ui_preview_images-sheet0.png:
#    Replace "PIZZA SHOP" with "披萨店"
# =========================================================================
print("4. Updating images/ui_assets-sheet0.png and ui_preview_images-sheet0.png...")

def patch_pizza_shop_sign(full_im, sign_x, sign_y, sign_w, sign_h):
    sign_crop = full_im.crop((sign_x, sign_y, sign_x + sign_w, sign_y + sign_h))
    draw = ImageDraw.Draw(sign_crop)
    # Inpaint text area
    for y in range(12, 85):
        for x in range(30, 142):
            cur = sign_crop.getpixel((x, y))
            is_text = False
            if cur[2] > 110 and cur[0] < 70 and cur[3] > 100:
                is_text = True
            elif cur[1] > 150 and cur[3] > 100 and (cur[2] < 100 or cur[2] > 180):
                is_text = True
            elif cur[0] < 45 and cur[1] < 55 and cur[2] < 110 and cur[3] > 100:
                is_text = True
            elif cur[0] == 27 and cur[1] == 117 and cur[2] == 189:
                is_text = True

            if is_text:
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

# Update ui_assets-sheet0.png (sign is around x=290, y=80, w=150, h=150)
im_assets = Image.open('images/ui_assets-sheet0.png').convert('RGBA')
im_assets = patch_pizza_shop_sign(im_assets, 290, 80, 150, 150)
im_assets.save('images/ui_assets-sheet0.png')

# Update ui_preview_images-sheet0.png (sign is around x=290, y=80, w=150, h=150)
im_prev = Image.open('images/ui_preview_images-sheet0.png').convert('RGBA')
im_prev = patch_pizza_shop_sign(im_prev, 290, 80, 150, 150)
im_prev.save('images/ui_preview_images-sheet0.png')

print("  ui_assets-sheet0.png and ui_preview_images-sheet0.png updated successfully!")


# =========================================================================
# 5. go_trophy-sheet0.png & sheet1.png:
#    sheet0: "YOU LOST" -> "挑战失败"
#    sheet1: "YOU WON" -> "挑战成功"
# =========================================================================
print("5. Updating images/go_trophy-sheet0.png and go_trophy-sheet1.png...")

def patch_trophy(trophy_path, line1, line2, is_lost=False):
    im = Image.open(trophy_path).convert('RGBA')
    for y in range(120, 230):
        for x in range(65, 225):
            cur = im.getpixel((x, y))
            if cur[3] > 100:
                t = (y - 100) / 140.0
                r = int(248 * (1 - t) + 235 * t)
                g = int(184 * (1 - t) + 135 * t)
                b = int(5 * (1 - t) + 0 * t)
                im.putpixel((x, y), (r, g, b, 255))

    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(font_bold, 36)
    bb1 = draw.textbbox((0, 0), line1, font=font)
    bb2 = draw.textbbox((0, 0), line2, font=font)
    w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
    w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]
    cx = 145
    x1, x2 = cx - w1 // 2, cx - w2 // 2
    y1, y2 = 125, 175
    ext_col = (70, 20, 10, 255) if is_lost else (80, 30, 0, 255)
    outline_col = (40, 10, 5, 255)
    for text, (tx, ty) in [(line1, (x1, y1)), (line2, (x2, y2))]:
        for dy in range(1, 7):
            for dx in [-2, -1, 0, 1, 2]:
                draw.text((tx + dx, ty + dy), text, fill=ext_col, font=font)
        for dx in [-3, -2, -1, 0, 1, 2, 3]:
            for dy in [-3, -2, -1, 0, 1, 2, 3]:
                if dx*dx + dy*dy <= 9:
                    draw.text((tx + dx, ty + dy), text, fill=outline_col, font=font)
        fill_col = (255, 185, 50, 255) if is_lost else (255, 215, 0, 255)
        draw.text((tx, ty), text, fill=fill_col, font=font)
        
    im.save(trophy_path)

patch_trophy('images/go_trophy-sheet0.png', "挑战", "失败", is_lost=True)
patch_trophy('images/go_trophy-sheet1.png', "挑战", "成功", is_lost=False)
print("  go_trophy-sheet0.png and sheet1.png updated successfully!")


# =========================================================================
# 6. vfx_text-sheet0.png:
#    Frame 0: [1, 285, 430, 45] -> "金币不足"
#    Frame 1: [1, 332, 406, 45] -> "钞票不足"
# =========================================================================
print("6. Updating images/vfx_text-sheet0.png...")
vfx_path = 'images/vfx_text-sheet0.png'
im_vfx = Image.open(vfx_path).convert('RGBA')

def patch_vfx_text(full_im, rx, ry, rw, rh, text):
    # Clear the rect with transparency
    crop_vfx = Image.new('RGBA', (rw, rh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(crop_vfx)
    font = ImageFont.truetype(font_bold, 30)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (rw - tw) // 2
    ty = (rh - th) // 2 - 2
    # Dark outline
    outline_col = (34, 30, 31, 255)
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            if dx*dx + dy*dy <= 5:
                draw.text((tx + dx, ty + dy), text, fill=outline_col, font=font)
    # Bright yellow/orange fill
    draw.text((tx, ty), text, fill=(254, 220, 10, 255), font=font)
    full_im.paste(crop_vfx, (rx, ry))
    return full_im

im_vfx = patch_vfx_text(im_vfx, 1, 285, 430, 45, "金币不足")
im_vfx = patch_vfx_text(im_vfx, 1, 332, 406, 45, "钞票不足")
im_vfx.save(vfx_path)
print("  vfx_text-sheet0.png updated successfully!")


# =========================================================================
# 7. vfx_level_up-sheet0.png: Replace "LEVEL UP" with "等级提升"
#    Size: 230x190
# =========================================================================
print("7. Updating images/vfx_level_up-sheet0.png...")
lvl_path = 'images/vfx_level_up-sheet0.png'
im_lvl = Image.new('RGBA', (230, 190), (0, 0, 0, 0))
draw_lvl = ImageDraw.Draw(im_lvl)

font_lvl = ImageFont.truetype(font_bold, 40)
text_lvl = "等级提升"
bb_lvl = draw_lvl.textbbox((0, 0), text_lvl, font=font_lvl)
lw, lh = bb_lvl[2] - bb_lvl[0], bb_lvl[3] - bb_lvl[1]
lx = (230 - lw) // 2
ly = (190 - lh) // 2

# 3D shadow downward
for dy in range(1, 6):
    for dx in [-2, -1, 0, 1, 2]:
        draw_lvl.text((lx + dx, ly + dy), text_lvl, fill=(80, 15, 10, 255), font=font_lvl)
# Dark outline
for dx in [-3, -2, -1, 0, 1, 2, 3]:
    for dy in [-3, -2, -1, 0, 1, 2, 3]:
        if dx*dx + dy*dy <= 9:
            draw_lvl.text((lx + dx, ly + dy), text_lvl, fill=(40, 10, 5, 255), font=font_lvl)
# Vibrant orange/red text fill
draw_lvl.text((lx, ly), text_lvl, fill=(245, 80, 50, 255), font=font_lvl)

im_lvl.save(lvl_path)
print("  vfx_level_up-sheet0.png updated successfully!")

print("=== All Texture Localizations Completed Successfully! ===")
