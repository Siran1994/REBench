import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fpath = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

idx = content.find('_JS_Eval_EvalJS')
if idx != -1:
    snippet = content[max(0,idx-50):idx+500]
    snippet = snippet.encode('ascii', 'replace').decode('ascii')
    print(f'Found at offset {idx}:')
    print(snippet)
