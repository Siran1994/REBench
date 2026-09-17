import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the full updateCanvasDimensions function
idx = content.find('updateCanvasDimensions:function(canvas')
if idx != -1:
    snippet = content[idx:idx+600]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print("=== updateCanvasDimensions function ===")
    print(snippet)
    print()

# Find _JS_SystemInfo_GetWidth / _JS_SystemInfo_GetHeight
for key in ['_JS_SystemInfo_GetWidth', '_JS_SystemInfo_GetHeight', '_JS_SystemInfo_GetCurrentCanvasWidth',
            '_JS_SystemInfo_GetCurrentCanvasHeight', 'SystemInfo_GetWidth', 'SystemInfo_GetHeight',
            'GetScreenSize', 'getScreenSize']:
    idx = content.find(key)
    if idx != -1:
        snippet = content[max(0,idx-30):idx+300]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'=== {key} at offset {idx} ===')
        print(snippet)
        print()

# Find how canvas.width is read by WASM for initial setup
for key in ['_JS_SystemInfo_', 'jsCanvasSelector', 'canvasSelector']:
    idx = content.find(key)
    if idx != -1:
        snippet = content[max(0,idx-30):idx+400]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'=== {key} at offset {idx} ===')
        print(snippet)
        print()
