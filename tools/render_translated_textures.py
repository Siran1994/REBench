# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw, ImageFont

TEX_DIR = r'D:\Desktop\REBench\extracted\perfect_landing_plane_pilot_package\assets_dump\textures'
OUT_DIR = r'D:\Desktop\REBench\scratch\perfect_landing\cn_textures'
os.makedirs(OUT_DIR, exist_ok=True)

FONT_YAHEI_BOLD = r'C:\Windows\Fonts\msyhbd.ttc'

def get_font(size):
    return ImageFont.truetype(FONT_YAHEI_BOLD, size)

def draw_text_with_outline(draw, pos, text, font, fill_color, outline_color, outline_width=3, shadow_offset=(0,0), shadow_color=None):
    x, y = pos
    if shadow_color and shadow_offset != (0, 0):
        sx, sy = shadow_offset
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx*dx + dy*dy <= outline_width*outline_width:
                    draw.text((x + sx + dx, y + sy + dy), text, font=font, fill=shadow_color)
    if outline_color and outline_width > 0:
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx*dx + dy*dy <= outline_width*outline_width:
                    draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    draw.text((x, y), text, font=font, fill=fill_color)

def slice_from_button(src, target_size, corner_w=32, corner_h=32):
    w, h = target_size
    sw, sh = src.size
    dst = Image.new('RGBA', (w, h), (0,0,0,0))
    dst.paste(src.crop((0, 0, corner_w, corner_h)), (0, 0))
    dst.paste(src.crop((sw-corner_w, 0, sw, corner_h)), (w-corner_w, 0))
    dst.paste(src.crop((0, sh-corner_h, corner_w, sh)), (0, h-corner_h))
    dst.paste(src.crop((sw-corner_w, sh-corner_h, sw, sh)), (w-corner_w, h-corner_h))
    
    top = src.crop((corner_w, 0, corner_w+10, corner_h)).resize((w - 2*corner_w, corner_h))
    dst.paste(top, (corner_w, 0))
    bottom = src.crop((corner_w, sh-corner_h, corner_w+10, sh)).resize((w - 2*corner_w, corner_h))
    dst.paste(bottom, (corner_w, h-corner_h))
    left = src.crop((0, corner_h, corner_w, corner_h+10)).resize((corner_w, h - 2*corner_h))
    dst.paste(left, (0, corner_h))
    right = src.crop((sw-corner_w, corner_h, sw, corner_h+10)).resize((corner_w, h - 2*corner_h))
    dst.paste(right, (w-corner_w, corner_h))
    center = src.crop((corner_w, corner_h, corner_w+10, corner_h+10)).resize((w - 2*corner_w, h - 2*corner_h))
    dst.paste(center, (corner_w, corner_h))
    return dst

# 1. Heading.png (656x60) -> "离线奖励"
def render_heading():
    orig = Image.open(os.path.join(TEX_DIR, 'Heading.png'))
    w, h = orig.size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "离线奖励"
    font = get_font(44)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1]
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (115, 60, 16, 255), outline_width=4)
    img.save(os.path.join(OUT_DIR, 'Heading.png'))

# 2. Taptoplay.png (668x112) -> "点击开始"
def render_taptoplay():
    orig = Image.open(os.path.join(TEX_DIR, 'Taptoplay.png'))
    w, h = orig.size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "点 击 开 始"
    font = get_font(72)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1]
    draw_text_with_outline(draw, (tx, ty), text, font, (245, 245, 245, 255), (120, 120, 120, 255), outline_width=5, shadow_offset=(0, 4), shadow_color=(80, 80, 80, 180))
    img.save(os.path.join(OUT_DIR, 'Taptoplay.png'))

# 3. Drag-to-move.png (296x80) -> "滑动操控"
def render_drag_to_move():
    orig = Image.open(os.path.join(TEX_DIR, 'Drag-to-move.png'))
    w, h = orig.size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "滑动操控"
    font = get_font(50)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1] - 2
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (20, 20, 20, 255), outline_width=4, shadow_offset=(0, 4), shadow_color=(0, 0, 0, 200))
    img.save(os.path.join(OUT_DIR, 'Drag-to-move.png'))

# 4. ChoosePlane.png (696x84) -> "选择战机"
def render_choose_plane():
    orig = Image.open(os.path.join(TEX_DIR, 'ChoosePlane.png'))
    w, h = orig.size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "选 择 战 机"
    font = get_font(60)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1] - 2
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (0, 132, 238, 255), outline_width=6, shadow_offset=(0, 5), shadow_color=(0, 75, 170, 255))
    img.save(os.path.join(OUT_DIR, 'ChoosePlane.png'))

# 5. freecoinstag50K.png (508x92) -> "50000 免费金币"
def render_freecoinstag():
    orig = Image.open(os.path.join(TEX_DIR, 'freecoinstag50K.png'))
    w, h = orig.size
    img = orig.copy()
    draw = ImageDraw.Draw(img)
    # Re-draw the gold ribbon center gradient x=35..470, y=14..78
    for y in range(14, 79):
        ratio = (y - 14) / (79 - 14)
        # Gradient from (250, 222, 0) to (230, 148, 0)
        r = int(250 * (1 - ratio) + 230 * ratio)
        g = int(222 * (1 - ratio) + 148 * ratio)
        b = 0
        draw.line([(35, y), (470, y)], fill=(r, g, b, 255))
    
    text = "50000 免费金币"
    font = get_font(42)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0] - 2, (h - th) // 2 - bbox[1] - 3
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (120, 55, 10, 255), outline_width=4, shadow_offset=(0, 4), shadow_color=(80, 35, 5, 255))
    img.save(os.path.join(OUT_DIR, 'freecoinstag50K.png'))

# 6. planesbutton_.png (240x96) -> "战机"
def render_planesbutton():
    green_template = Image.open(os.path.join(TEX_DIR, 'greenbutton.png'))
    w, h = 240, 96
    img = slice_from_button(green_template, (w, h), 28, 28)
    draw = ImageDraw.Draw(img)
    text = "战 机"
    font = get_font(46)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1] - 5
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), None, 0)
    img.save(os.path.join(OUT_DIR, 'planesbutton_.png'))

# 7. backbutton.png (256x108) -> "返回"
def render_backbutton():
    pink_template = Image.open(os.path.join(TEX_DIR, 'pinkbutton.png'))
    img = pink_template.copy()
    draw = ImageDraw.Draw(img)
    text = "返 回"
    font = get_font(46)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (img.size[0] - tw) // 2 - bbox[0], (img.size[1] - th) // 2 - bbox[1] - 6
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), None, 0)
    img.save(os.path.join(OUT_DIR, 'backbutton.png'))

# 8. privacypolicybutton.png (276x116) -> "隐私政策"
def render_privacypolicy():
    green_template = Image.open(os.path.join(TEX_DIR, 'greenbutton.png'))
    w, h = 276, 116
    img = slice_from_button(green_template, (w, h), 28, 28)
    draw = ImageDraw.Draw(img)
    text = "隐私政策"
    font = get_font(42)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1] - 6
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), None, 0)
    img.save(os.path.join(OUT_DIR, 'privacypolicybutton.png'))

# 9. select1.png (348x132) -> "选择"
def render_select1():
    orig = Image.open(os.path.join(TEX_DIR, 'select1.png'))
    clean_bg = slice_from_button(orig, orig.size, 35, 35)
    draw = ImageDraw.Draw(clean_bg)
    text = "选 择"
    font = get_font(56)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (clean_bg.size[0] - tw) // 2 - bbox[0], (clean_bg.size[1] - th) // 2 - bbox[1] - 6
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (145, 65, 5, 255), outline_width=5)
    clean_bg.save(os.path.join(OUT_DIR, 'select1.png'))

# 10. completebanner_.png (256x100) -> "获得宝箱"
def render_completebanner():
    orig = Image.open(os.path.join(TEX_DIR, 'completebanner_.png'))
    w, h = orig.size
    img = orig.copy()
    draw = ImageDraw.Draw(img)
    # Background color is (58, 10, 83, 204)
    bg_color = (58, 10, 83, 204)
    draw.rectangle([105, 5, 250, 95], fill=bg_color)
    text = "获得宝箱"
    font = get_font(30)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = 110 + (136 - tw) // 2 - bbox[0]
    ty = (h - th) // 2 - bbox[1]
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), None, 0)
    img.save(os.path.join(OUT_DIR, 'completebanner_.png'))

# 11. collectx2button.png (420x176) -> "双倍领取"
def render_collectx2():
    purple_template = Image.open(os.path.join(TEX_DIR, 'purplebutton.png'))
    orig = Image.open(os.path.join(TEX_DIR, 'collectx2button.png'))
    img = purple_template.copy()
    video_icon = orig.crop((20, 25, 175, 150))
    img.paste(video_icon, (20, 25), video_icon)
    draw = ImageDraw.Draw(img)
    text = "双倍领取"
    font = get_font(48)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = 185 + (220 - tw) // 2 - bbox[0]
    ty = (img.size[1] - th) // 2 - bbox[1] - 8
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), None, 0)
    img.save(os.path.join(OUT_DIR, 'collectx2button.png'))

# 12. claimonRADbutton.png (348x132) -> "领取" + "看广告"
def render_claimonrad():
    purple_template = Image.open(os.path.join(TEX_DIR, 'purplebutton.png'))
    orig = Image.open(os.path.join(TEX_DIR, 'claimonRADbutton.png'))
    w, h = orig.size
    img = slice_from_button(purple_template, (w, h), 32, 32)
    
    # Copy ONLY the video icon box (x=16..118, y=18..96)
    icon = orig.crop((16, 18, 118, 96))
    img.paste(icon, (16, 18), icon)
    
    draw = ImageDraw.Draw(img)
    sub_text = "看广告"
    sub_font = get_font(18)
    s_bbox = sub_font.getbbox(sub_text)
    s_tw = s_bbox[2] - s_bbox[0]
    draw.text((16 + (102 - s_tw)//2 - s_bbox[0], 99), sub_text, font=sub_font, fill=(255, 255, 255, 255))
    
    main_text = "领 取"
    main_font = get_font(52)
    m_bbox = main_font.getbbox(main_text)
    m_tw, m_th = m_bbox[2] - m_bbox[0], m_bbox[3] - m_bbox[1]
    tx = 130 + (205 - m_tw) // 2 - m_bbox[0]
    ty = (h - m_th) // 2 - m_bbox[1] - 8
    draw_text_with_outline(draw, (tx, ty), main_text, main_font, (255, 255, 255, 255), (85, 30, 130, 255), outline_width=4)
    img.save(os.path.join(OUT_DIR, 'claimonRADbutton.png'))

# 13. removeadsbutton.png (32x32) -> "免广告"
def render_removeads():
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, 31, 31], radius=6, fill=(188, 42, 68, 255))
    font = get_font(20)
    bbox = font.getbbox("免")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (32 - tw) // 2 - bbox[0]
    ty = (32 - th) // 2 - bbox[1] - 1
    draw.text((tx, ty), "免", font=font, fill=(255, 255, 255, 255))
    draw.line([(5, 5), (26, 26)], fill=(235, 20, 20, 255), width=2)
    img.save(os.path.join(OUT_DIR, 'removeadsbutton.png'))

# 14. logo.png (652x508) -> "完美着陆"
def render_logo():
    orig = Image.open(os.path.join(TEX_DIR, 'logo.png'))
    w, h = orig.size
    
    # Filter out purple text pixels from orig logo (y < 310)
    clean_plane = orig.copy()
    pix = clean_plane.load()
    for x in range(w):
        for y in range(h):
            if y < 240:
                pix[x, y] = (0, 0, 0, 0)
            elif y < 310:
                r, g, b, a = pix[x, y]
                # Purple letters: high blue, lower red/green
                if a > 0 and (b > 110 and r < 190 and g < 110):
                    pix[x, y] = (0, 0, 0, 0)
                # Also white letters above y=270
                elif y < 270 and a > 0 and (r > 200 and g > 200 and b > 200):
                    pix[x, y] = (0, 0, 0, 0)
    
    font = get_font(120)
    txt_img = Image.new('RGBA', (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(txt_img)
    
    text1 = "完  美"
    b1 = font.getbbox(text1)
    tw1, th1 = b1[2] - b1[0], b1[3] - b1[1]
    tx1 = (w - tw1) // 2 - b1[0]
    ty1 = 45 - b1[1]
    
    text2 = "着  陆"
    b2 = font.getbbox(text2)
    tw2, th2 = b2[2] - b2[0], b2[3] - b2[1]
    tx2 = (w - tw2) // 2 - b2[0]
    ty2 = 175 - b2[1]
    
    # Outer white puffy cloud (r=20)
    for text, tx, ty in [(text1, tx1, ty1), (text2, tx2, ty2)]:
        for dx in range(-20, 21, 3):
            for dy in range(-20, 21, 3):
                if dx*dx + dy*dy <= 20*20:
                    draw.text((tx+dx, ty+dy), text, font=font, fill=(255, 255, 255, 255))
                    
    # Purple outline (r=11)
    for text, tx, ty in [(text1, tx1, ty1), (text2, tx2, ty2)]:
        for dx in range(-11, 12, 2):
            for dy in range(-11, 12, 2):
                if dx*dx + dy*dy <= 11*11:
                    draw.text((tx+dx, ty+dy), text, font=font, fill=(93, 16, 168, 255))
                    
    # White letters
    for text, tx, ty in [(text1, tx1, ty1), (text2, tx2, ty2)]:
        draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
        
    # Composite: clean airplane behind text, but propeller center slightly over text
    res = Image.alpha_composite(clean_plane, txt_img)
    
    # Re-paste propeller center hub (circle at 326, 360, r=40)
    hub = orig.crop((280, 310, 370, 400))
    res.paste(hub, (280, 310), hub)
    
    res.save(os.path.join(OUT_DIR, 'logo.png'))

# 15. selected.png (320x60) -> "已选择"
def render_selected():
    w, h = 320, 60
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    text = "已 选 择"
    font = get_font(46)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (w - tw) // 2 - bbox[0]
    ty = (h - th) // 2 - bbox[1] - 1
    draw_text_with_outline(draw, (tx, ty), text, font, (255, 255, 255, 255), (5, 76, 2, 255), outline_width=4, shadow_offset=(0, 2), shadow_color=(2, 45, 1, 255))
    img.save(os.path.join(OUT_DIR, 'selected.png'))

def render_all():
    render_heading()
    render_taptoplay()
    render_drag_to_move()
    render_choose_plane()
    render_freecoinstag()
    render_planesbutton()
    render_backbutton()
    render_privacypolicy()
    render_select1()
    render_completebanner()
    render_collectx2()
    render_claimonrad()
    render_removeads()
    render_logo()
    render_selected()
    print('Rendered all 15 textures successfully!')

if __name__ == '__main__':
    render_all()
