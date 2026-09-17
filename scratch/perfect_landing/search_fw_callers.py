import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find who calls Browser.createContext
for key in ['Browser.createContext(']:
    idx = 0
    count = 0
    while idx < len(content) and count < 10:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-100):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found at offset {idx}: ...{snippet}...')
        print()
        idx += len(key)
        count += 1

# Also find '_emscripten_webgl_do_create_context' which is in the error stack
print("=== _emscripten_webgl_do_create_context ===")
idx = content.find('_emscripten_webgl_do_create_context')
if idx != -1:
    snippet = content[max(0,idx-50):idx+500]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print(f'Found at offset {idx}: ...{snippet}...')
