import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Get the full _emscripten_webgl_do_create_context function
idx = content.find('_emscripten_webgl_do_create_context')
# Get a big chunk
snippet = content[idx:idx+1200]
snippet = snippet.encode('ascii', 'replace').decode('ascii')
print(snippet)
