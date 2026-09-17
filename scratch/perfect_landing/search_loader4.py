import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find where framework is loaded/called with Module
for key in ['unityFramework', 'frameworkUrl', 'framework(', '.framework']:
    idx = 0
    count = 0
    while idx < len(content) and count < 5:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-80):idx+150]
        # Replace non-ascii with ?
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}: ...{snippet}...')
        print()
        idx += len(key)
        count += 1
