import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find how Unity detects orientation
for key in ['Orientation', 'orientation', 'innerWidth', 'portrait', 'landscape',
            '_JS_ScreenOrientation', 'screen.orientation', 'window.orientation']:
    idx = 0
    count = 0
    while idx < len(content) and count < 3:
        idx = content.find(key, idx)
        if idx == -1:
            break
        # Skip if inside a very common repeated pattern
        snippet = content[max(0,idx-80):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        if len(snippet) < 400:
            print(f'Found "{key}" at offset {idx}:')
            print(f'  {snippet}')
            print()
        idx += len(key)
        count += 1
