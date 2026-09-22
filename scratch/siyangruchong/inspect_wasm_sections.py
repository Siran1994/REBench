import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect string literals around FoodShopRowUI and FoodShop in wasm
wasm_path = r'cdn_assets/Build/siyangruchong.wasm'

# We can search in wasm for string references or function names
with open(wasm_path, 'rb') as f:
    wasm_bytes = f.read()

print(f'WASM size: {len(wasm_bytes)}')

# Let's see if there are export names or debug names in wasm
# Wasm sections:
# 0: custom, 1: type, 2: import, 3: function, 4: table, 5: memory, 6: global, 7: export, 8: start, 9: element, 10: code, 11: data
pos = 8
while pos < len(wasm_bytes):
    sec_id = wasm_bytes[pos]
    pos += 1
    # read leb128 length
    length = 0
    shift = 0
    while True:
        b = wasm_bytes[pos]
        pos += 1
        length |= (b & 0x7f) << shift
        if not (b & 0x80): break
        shift += 7
    print(f'Section {sec_id}, length {length} at {pos}')
    if sec_id == 7: # export section
        # read exports
        exp_pos = pos
        # count
        count = 0
        shift = 0
        while True:
            b = wasm_bytes[exp_pos]
            exp_pos += 1
            count |= (b & 0x7f) << shift
            if not (b & 0x80): break
            shift += 7
        print(f'Total exports: {count}')
        for _ in range(min(count, 50)):
            # name len
            n_len = 0
            shift = 0
            while True:
                b = wasm_bytes[exp_pos]
                exp_pos += 1
                n_len |= (b & 0x7f) << shift
                if not (b & 0x80): break
                shift += 7
            exp_name = wasm_bytes[exp_pos:exp_pos+n_len].decode('utf-8', errors='ignore')
            exp_pos += n_len
            kind = wasm_bytes[exp_pos]
            exp_pos += 1
            # index
            while wasm_bytes[exp_pos] & 0x80: exp_pos += 1
            exp_pos += 1
            if any(k in exp_name for k in ['Food', 'Shop', 'Click', 'Action', 'Perform']):
                print(f'  Export: {exp_name}')
    pos += length
