import os
import json
import re

package_dir = 'reverse/idle_ants_package'

# 1. Inspect data.json
data_path = os.path.join(package_dir, 'data.json')
with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

proj = data.get('project', [])
print('=== C3 Project Info ===')
print('Name:', proj[0] if len(proj) > 0 else 'N/A')
print('C3 Runtime Version:', proj[10] if len(proj) > 10 else 'N/A')
print('Start Layout:', proj[1] if len(proj) > 1 else 'N/A')

# 2. Inspect c3runtime.js
c3_path = os.path.join(package_dir, 'scripts', 'c3runtime.js')
with open(c3_path, 'r', encoding='utf-8', errors='ignore') as f:
    c3_code = f.read()

shaders = re.findall(r'self\["C3_Shaders"\]\["([^"]+)"\]', c3_code)
print('=== Shaders Detected ===')
for s in shaders:
    pattern = r'self\["C3_Shaders"\]\["' + re.escape(s) + r'"\]\s*=\s*\{.*?glsl:\s*("(?:\\.|[^"\\])*")'
    m = re.search(pattern, c3_code, re.DOTALL)
    if m:
        try:
            glsl = json.loads(m.group(1))
            print(f'=== Shader: {s} ===')
            # Check for non-constant assignments in global scope
            for line in glsl.splitlines():
                if ('uniform' in line or '=' in line) and not line.startswith(' '):
                    print('  ', line)
        except Exception as e:
            print(f'Error parsing GLSL for {s}:', e)

