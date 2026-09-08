import re
import json

with open('reverse/mine_line-tt-minigame/scripts/c3runtime.js', 'r', encoding='utf-8') as f:
    code = f.read()

for name in ['Mikal_OutlineGlow', 'Mikal_GlowWorms']:
    pattern = r'self\["C3_Shaders"\]\["' + re.escape(name) + r'"\]\s*=\s*\{.*?glsl:\s*("(?:\\.|[^"\\])*")'
    m = re.search(pattern, code, re.DOTALL)
    if m:
        glsl = json.loads(m.group(1))
        print(f'=== {name} ===')
        print(glsl)
        print('='*40)
