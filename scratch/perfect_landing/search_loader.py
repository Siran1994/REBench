fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
for key in ['Creating WebGL', 'Unable to create', 'webgl2', 'webGLContextAttributes', 'GLctx']:
    idx = content.find(key)
    if idx != -1:
        lineno = content[:idx].count('\n') + 1
        print(f'Found "{key}" at line {lineno}: ...{content[max(0,idx-80):idx+120]}...')
        print()
    else:
        print(f'"{key}" not found')
