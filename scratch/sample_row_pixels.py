from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789970156734.png'
im = Image.open(img_path).convert('RGB')
arr = np.array(im)

# 在 Y=230 (汉堡行) 测量水平方向颜色变化
# X 从 740 到 940
print("Y=230 (汉堡行) 水平像素采样:")
for x in range(740, 935, 5):
    r, g, b = arr[230, x]
    print(f"  X={x}: RGB=({r},{g},{b})")
