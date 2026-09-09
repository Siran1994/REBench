import re
import json

with open('reverse/idle_ants_package/scripts/c3runtime.js', 'r', encoding='utf-8') as f:
    code = f.read()

for s in ['skymen_ChromaTintDropShadow', 'Mikal_Chromakey']:
    p = r'self\["C3_Shaders"\]\["' + s + r'"\]\s*=\s*\{.*?glsl:\s*("(?:\\.|[^"\\])*")'
    m = re.search(p, code, re.DOTALL)
    if m:
        print(f'=== ORIGINAL {s} ===')
        print(json.loads(m.group(1)))
