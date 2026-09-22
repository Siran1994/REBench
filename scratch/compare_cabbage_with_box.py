from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789974153275.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape

# 测量当前菜叶显示范围
# 排除红色方框像素 (红色方框 R>150, G<100, B<100)
c_mask = np.zeros((h, w), dtype=bool)
for y in range(120, 510):
    for x in range(160, 740):
        r, g, b = int(arr[y, x, 0]), int(arr[y, x, 1]), int(arr[y, x, 2])
        # 排除纯红
        if r > 150 and g < 100 and b < 100:
            continue
        # 菜叶颜色: 亮黄绿到浅绿
        if g > 110 and r > 80 and g >= r * 0.85 and b < 160:
            c_mask[y, x] = True

ys, xs = np.where(c_mask)
c_top, c_bot = ys.min(), ys.max()
c_left, c_right = xs.min(), xs.max()
c_w = c_right - c_left + 1
c_h = c_bot - c_top + 1
c_cx = (c_left + c_right) / 2.0
c_cy = (c_top + c_bot) / 2.0

print(f"当前截图中的菜叶实际范围: X=[{c_left}, {c_right}] (宽={c_w}), Y=[{c_top}, {c_bot}] (高={c_h})")
print(f"当前菜叶中心: ({c_cx}, {c_cy})")

# 红色方框: Left=169, Right=736 (宽=567), Top=124, Bottom=505 (高=381)
# 红色方框中心: (452.5, 314.5)
box_left, box_right = 169, 736
box_top, box_bot = 124, 505
box_w = box_right - box_left + 1
box_h = box_bot - box_top + 1
box_cx = (box_left + box_right) / 2.0
box_cy = (box_top + box_bot) / 2.0

print(f"\n用户画的红色方框: X=[{box_left}, {box_right}] (宽={box_w}), Y=[{box_top}, {box_bot}] (高={box_h})")
print(f"红色方框中心: ({box_cx}, {box_cy})")

print(f"\n对比分析:")
print(f"1. 宽度对比: 红色方框宽={box_w}, 当前菜叶宽={c_w} -> 宽度缩放比例: {box_w / c_w:.3f}")
print(f"2. 高度对比: 红色方框高={box_h}, 当前菜叶高={c_h} -> 高度缩放比例: {box_h / c_h:.3f}")
print(f"3. 中心偏移: 红色方框中心=({box_cx:.1f}, {box_cy:.1f}), 当前菜叶中心=({c_cx:.1f}, {c_cy:.1f})")
print(f"   Delta X = {box_cx - c_cx:.1f}px (向右/向左)")
print(f"   Delta Y = {box_cy - c_cy:.1f}px (向下/向上)")
