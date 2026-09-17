import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# The framework is called as initFw(l) where l has .canvas = actual canvas
# In Unity framework, it typically does: var Module = typeof Module !== 'undefined' ? Module : {};
# Then the caller overrides it.
# Let's find how Module.canvas is used

# Look at the first few chars of the framework
print("=== Framework start (first 500 chars) ===")
print(content[:500])
print()

# Find Module.canvas references
for key in ['Module.canvas', 'Module["canvas"]', "Module['canvas']", '.canvas=', 'Module.ctx']:
    idx = 0
    count = 0
    while idx < len(content) and count < 5:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-60):idx+150]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}: ...{snippet}...')
        print()
        idx += len(key)
        count += 1

# Find how the Module is initialized at the top of framework
for key in ['var Module', 'typeof Module', 'Module=', 'module=']:
    idx = content.find(key)
    if idx != -1 and idx < 5000:  # Only in the beginning
        snippet = content[max(0,idx-40):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'Found "{key}" at offset {idx}: ...{snippet}...')
        print()
