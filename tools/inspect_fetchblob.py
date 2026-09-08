with open('reverse/idle-ants-tt-minigame/scripts/c3runtime.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'\.FetchBlob\(', text)]
print(f'Total FetchBlob calls: {len(matches)}')
for idx in matches[:10]:
    print(text[max(0, idx-60):min(len(text), idx+100)])
    print('-'*50)
