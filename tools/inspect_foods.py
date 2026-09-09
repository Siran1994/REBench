with open('reverse/idle-ants-tt-minigame/scripts/project/staticData.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
items = re.findall(r'"item":\s*"([^"]+)"', text)
print('Items:', items[:15])
