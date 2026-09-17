import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Get the full orientation event handler and _JS_ScreenOrientation_Init
idx = content.find('JS_ScreenOrientation_eventHandler')
if idx != -1:
    # Go back to find function start
    start = content.rfind('function', max(0, idx-200), idx)
    if start == -1:
        start = content.rfind('var ', max(0, idx-200), idx)
    end = min(len(content), idx + 800)
    snippet = content[start:end]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== Orientation Event Handler + Init ===")
    print(snippet)
    print()

# Also look at how innerWidth/innerHeight is used
print("=== _JS_ScreenOrientation_Init ===")
idx2 = content.find('function _JS_ScreenOrientation_Init')
if idx2 != -1:
    snippet2 = content[idx2:idx2+800]
    snippet2 = snippet2.encode('ascii', 'replace').decode('ascii')
    print(snippet2)
