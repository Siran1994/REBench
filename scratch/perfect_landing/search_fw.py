fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Search in the entire file (could be encoded/obfuscated)
for key in ['Creating WebGL', 'Unable to create WebGL', 'reating WebGL', 'Failed to create WebGL']:
    idx = content.find(key)
    if idx != -1:
        lineno = content[:idx].count('\n') + 1
        print(f'Found "{key}" at line {lineno} offset {idx}: ...{content[max(0,idx-100):idx+150]}...')
        print()
    else:
        print(f'"{key}" not found')

# Also search for the error about GLctx
for key in ['deleteContext', '_emscripten_webgl_destroy_context', 'GLctx']:
    idx = content.find(key)
    if idx != -1:
        lineno = content[:idx].count('\n') + 1
        print(f'Found "{key}" at line {lineno} offset {idx}: ...{content[max(0,idx-50):idx+200]}...')
        print()
