from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 测量当前食物条目的背景 (深蓝/黑条目背景)
# 在 x in [760, 930], y in [160, 420]
# 条目背景颜色大致为 R~15..30, G~35..55, B~40..60 (与墨绿底板相比偏蓝黑)
# 或者我们直接看木框的左木纹条:
print("正在检测木框左侧棕色木纹条在 X 轴的位置:")
wood_cols = []
for x in range(700, 780):
    # 检查这一列是否有棕色木质像素 (R>80, R>B*1.5, R>G*0.8)
    cnt = 0
    for y in range(100, 420):
        r, g, b = arr[y, x]
        if r > 80 and r > b * 1.5 and r > g * 0.8:
            cnt += 1
    if cnt > 50:
        wood_cols.append(x)

if wood_cols:
    print(f"  木框左侧木纹条 X 范围: [{min(wood_cols)}, {max(wood_cols)}]")

# 木框右侧木纹条:
wood_cols_r = []
for x in range(890, 950):
    cnt = 0
    for y in range(100, 420):
        r, g, b = arr[y, x]
        if r > 80 and r > b * 1.5 and r > g * 0.8:
            cnt += 1
    if cnt > 50:
        wood_cols_r.append(x)

if wood_cols_r:
    print(f"  木框右侧木纹条 X 范围: [{min(wood_cols_r)}, {max(wood_cols_r)}]")

# 检测 '食物' 标题文字的像素位置
text_mask = np.zeros(arr.shape[:2], dtype=bool)
for y in range(95, 145):
    for x in range(750, 900):
        r, g, b = arr[y, x]
        if r > 200 and g > 200 and b > 200:
            text_mask[y, x] = True

t_ys, t_xs = np.where(text_mask)
if len(t_xs) > 0:
    print(f"  '食物' 标题文本范围: X=[{t_xs.min()}, {t_xs.max()}], Y=[{t_ys.min()}, {t_ys.max()}]")
