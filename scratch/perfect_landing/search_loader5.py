import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the R() function which is the framework loader
# From line 171: l.postRun.push(...), R()
# R is likely the function that calls framework(l)

# Search for 'function R'
for key in ['function R(', 'function R (', 'R=function', ' R()', 'R()']:
    idx = 0
    count = 0
    while idx < len(content) and count < 3:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-60):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}: ...{snippet}...')
        print()
        idx += len(key)
        count += 1

# Search for where unityFramework is called with Module (l)
for key in ['(l)', 'unityFramework(', '.call(', 'fw(l', 'fw(']:
    idx = 112000  # start from the framework loading area
    count = 0
    while idx < len(content) and count < 3:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-60):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}: ...{snippet}...')
        print()
        idx += len(key)
        count += 1
