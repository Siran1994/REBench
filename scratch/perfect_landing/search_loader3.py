fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find how Module.canvas is set and used
# The 'l' variable is the config/Module object
# Find where framework is loaded and Module.canvas is referenced

# Look around the canvas: t assignment
idx = content.find('canvas:t,')
if idx != -1:
    # Get bigger context
    start = max(0, idx - 300)
    end = min(len(content), idx + 500)
    print("=== canvas:t context ===")
    print(content[start:end])
    print()

# Look for where canvas element is resolved (might be querySelector or getElementById)
for key in ['getElementById', 'querySelector', '.canvas ', 'canvas==', 'canvas!=',
            'Module[', 'Module.', '"canvas"']:
    idx = 0
    count = 0
    while idx < len(content) and count < 3:
        idx = content.find(key, idx)
        if idx == -1:
            break
        lineno = content[:idx].count('\n') + 1
        print(f'Found "{key}" at offset {idx}: ...{content[max(0,idx-40):idx+80]}...')
        idx += len(key)
        count += 1
    if count > 0:
        print()
