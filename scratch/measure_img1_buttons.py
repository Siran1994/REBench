from PIL import Image
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

im = Image.open('C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962046776.png').convert('RGB')
arr = np.array(im)
h, w, _ = arr.shape

visited = np.zeros((h, w), dtype=bool)

boxes = []
for y in range(h):
    for x in range(500, w):
        r, g, b = arr[y, x]
        if r > 220 and g > 220 and b > 220 and not visited[y, x]:
            # flood fill
            q = [(y, x)]
            visited[y, x] = True
            min_y, max_y = y, y
            min_x, max_x = x, x
            cnt = 0
            while q:
                cy, cx = q.pop()
                cnt += 1
                if cy < min_y: min_y = cy
                if cy > max_y: max_y = cy
                if cx < min_x: min_x = cx
                if cx > max_x: max_x = cx
                for ny, nx in [(cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)]:
                    if 0 <= ny < h and 500 <= nx < w and not visited[ny, nx]:
                        nr, ng, nb = arr[ny, nx]
                        if nr > 220 and ng > 220 and nb > 220:
                            visited[ny, nx] = True
                            q.append((ny, nx))
            if cnt > 100:
                boxes.append((min_x, max_x, min_y, max_y, cnt))

print(f"在右侧菜单框内找到 {len(boxes)} 个白色UI组件:")
for idx, (min_x, max_x, min_y, max_y, cnt) in enumerate(boxes):
    print(f"  组件 {idx+1}: X=[{min_x}, {max_x}] (宽={max_x-min_x+1}), Y=[{min_y}, {max_y}] (高={max_y-min_y+1}), 像素数={cnt}")
