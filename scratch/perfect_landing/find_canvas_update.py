import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find updateCanvasDimensions - this is what sets the actual WebGL viewport
idx = content.find('updateCanvasDimensions')
if idx != -1:
    snippet = content[idx:idx+800]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== updateCanvasDimensions ===")
    print(snippet)
    print()

# Find Browser.requestAnimationFrame
idx = content.find('Browser.requestAnimationFrame=')
if idx == -1:
    idx = content.find('requestAnimationFrame:')
if idx != -1:
    snippet = content[max(0,idx-30):idx+400]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== requestAnimationFrame ===")
    print(snippet)
    print()

# Find Browser_mainLoop_runner
idx = content.find('Browser_mainLoop_runner')
if idx != -1:
    snippet = content[max(0,idx-30):idx+400]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== Browser_mainLoop_runner ===")
    print(snippet)
    print()

# Check how the canvas dimensions are initially set
idx = content.find('Browser.mainLoop.runner')
if idx != -1:
    snippet = content[max(0,idx-50):idx+300]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== mainLoop.runner reference ===")
    print(snippet)
    print()

# Find how initial canvas size / setCanvasSize is called
for key in ['Browser.setCanvasSize(', 'setCanvasSize(']:
    idx = 0
    count = 0
    while idx < len(content) and count < 5:
        idx = content.find(key, idx)
        if idx == -1:
            break
        snippet = content[max(0,idx-60):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'=== {key} at offset {idx} ===')
        print(snippet)
        print()
        idx += len(key)
        count += 1
