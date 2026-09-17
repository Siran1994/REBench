fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

print(f"Total length: {len(content)}")
print(f"Lines: {content.count(chr(10)) + 1}")

# Search for canvas-related code
for key in ['Module.canvas', 'module.canvas', '.canvas=', 'canvas:', 
            'createUnityInstance', 'setCanvasSize', 'canvas.parentNode',
            'querySelector("#', "querySelector('#"]:
    idx = content.find(key)
    if idx != -1:
        lineno = content[:idx].count('\n') + 1
        print(f'\nFound "{key}" at line {lineno}, offset {idx}:')
        print(f'  ...{content[max(0,idx-60):idx+120]}...')
