import re

with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(?<![.\'\"a-zA-Z0-9_$])screen(?![a-zA-Z0-9_$])'
matches = list(re.finditer(pattern, text))
print(f'Total bare screen occurrences: {len(matches)}')
for i, m in enumerate(matches):
    s = max(0, m.start() - 40)
    e = min(len(text), m.end() + 40)
    print(f'[{i+1}] {text[s:e].replace(chr(10), " ")}')
