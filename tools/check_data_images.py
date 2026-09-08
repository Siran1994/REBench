import json

with open('reverse/idle-ants-tt-minigame/data/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

proj = d.get('project', [])
# in C3 data.json, check image filenames
text = json.dumps(proj[:10])
print('Sample text from data.json:', text[:300])

# find image file references in whole data.json
import re
images = re.findall(r'[\w\-]+-sheet\d+\.png', json.dumps(d))
print(f'Total sheet image references: {len(images)}')
print('Sample images:', images[:10])
