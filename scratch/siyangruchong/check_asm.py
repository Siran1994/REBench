import gzip
import re

with gzip.open('extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb', 'rt', encoding='utf-8', errors='replace') as f:
    text = f.read()

m = re.search(r'var\s+asmLibraryArg\s*=\s*\{', text)
if m:
    start = m.end() - 1
    # find matching brace
    depth = 0
    end = start
    for i in range(start, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    asm_slice = text[start:end]
    print(f'asmLibraryArg slice length: {len(asm_slice)}')

    props = re.findall(r'["\']([^"\']+)["\']\s*:\s*([a-zA-Z0-9_$]+)', asm_slice)
    print(f'Found {len(props)} prop mappings:')
    interesting = []
    for k, v in props:
        if not v.startswith('__') and not v.startswith('_gl') and not v.startswith('_emscripten'):
            interesting.append((k, v))
    print(f'Interesting functions ({len(interesting)}):')
    for k, v in interesting:
        print(f'  "{k}": {v}')
