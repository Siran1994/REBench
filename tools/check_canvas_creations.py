import os, re

files = [
    'reverse/idle-ants-tt-minigame/lodash.custom.min.js',
    'reverse/idle-ants-tt-minigame/tween.js',
    'reverse/idle-ants-tt-minigame/poki-sdk.js',
    'reverse/idle-ants-tt-minigame/scripts/supportcheck.js',
    'reverse/idle-ants-tt-minigame/scripts/main.js',
    'reverse/idle-ants-tt-minigame/scripts/project/main.js'
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8', errors='ignore') as fh:
            text = fh.read()
            m = re.findall(r'createElement\s*\(\s*[\'"]canvas[\'"]\s*\)', text, re.I)
            print(f'{f}: {len(m)} canvas createElement calls')
