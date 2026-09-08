import os
import re

pattern = re.compile(r'createElement\([\'"]canvas', re.I)
for root, dirs, files in os.walk('reverse/idle-ants-tt-minigame'):
    for f in files:
        if f.endswith('.js'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                for i, line in enumerate(fp, 1):
                    if pattern.search(line):
                        print(f"{p}:{i}: {line.strip()[:120]}")
