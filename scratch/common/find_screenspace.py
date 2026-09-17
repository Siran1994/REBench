import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Search for screenspace/overlay/canvas shader related code
for key in ['Screenspace', 'screenspace', 'overlay', 'disabled in graphics',
            'shadow map support', 'canvas shader']:
    idx = content.find(key)
    if idx != -1:
        snippet = content[max(0,idx-150):idx+200]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'=== Found "{key}" at offset {idx} ===')
        print(snippet)
        print()

# Also search for setCanvasSize / emscripten_set_canvas_element_size
for key in ['setCanvasSize', '_emscripten_set_canvas_element_size', 'setMainLoop', 
            'Browser.mainLoop', 'requestAnimationFrame']:
    idx = content.find(key)
    if idx != -1:
        snippet = content[max(0,idx-50):idx+250]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'=== Found "{key}" at offset {idx} ===')
        print(snippet)
        print()
