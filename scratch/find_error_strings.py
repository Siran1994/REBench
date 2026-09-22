import os
import re

for root, dirs, files in os.walk('reverse/siyangruchong-tt-minigame'):
    for f in files:
        if f.endswith('.js'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            for m in re.finditer(r'[\'\"`]([^\'\"`\r\n]{5,80})[\'\"`]', content):
                s = m.group(1)
                s_lower = s.lower()
                if any(w in s_lower for w in ['callback', 'internal', 'error', 'listener', 'not a function', 'undefined', 'null']):
                    if len(s) < 60:
                        print(f'{f}: {repr(s)}')
