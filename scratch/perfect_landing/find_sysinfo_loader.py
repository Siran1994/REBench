import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find SystemInfo initialization
for key in ['SystemInfo', 'width:', 'height:', 'screen.width', 'screen.height']:
    idx = 0
    count = 0
    while idx < len(content) and count < 3:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-80):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}:')
        print(f'  {snippet}')
        print()
        idx += len(key)
        count += 1
