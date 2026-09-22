import gzip
import struct

wasm_path = "extracted/siyangruchong_package/Build/siyangruchong.wasm.unityweb"
with gzip.open(wasm_path, "rb") as f:
    wasm_bytes = f.read()

print("Wasm length:", len(wasm_bytes))
assert wasm_bytes[:4] == b"\x00asm"
version = struct.unpack("<I", wasm_bytes[4:8])[0]
print("Wasm version:", version)

# Parse sections
pos = 8
imports = []
while pos < len(wasm_bytes):
    sec_id = wasm_bytes[pos]
    pos += 1
    # read LEB128 size
    sec_len = 0
    shift = 0
    while True:
        b = wasm_bytes[pos]
        pos += 1
        sec_len |= (b & 0x7f) << shift
        shift += 7
        if (b & 0x80) == 0:
            break
    sec_end = pos + sec_len
    if sec_id == 2:  # Import section
        # read count
        count = 0
        shift = 0
        while True:
            b = wasm_bytes[pos]
            pos += 1
            count |= (b & 0x7f) << shift
            shift += 7
            if (b & 0x80) == 0:
                break
        print(f"Import section has {count} entries")
        for _ in range(count):
            # mod len
            mod_len = 0
            shift = 0
            while True:
                b = wasm_bytes[pos]
                pos += 1
                mod_len |= (b & 0x7f) << shift
                shift += 7
                if (b & 0x80) == 0:
                    break
            mod_name = wasm_bytes[pos:pos+mod_len].decode('utf-8', errors='replace')
            pos += mod_len

            # field len
            field_len = 0
            shift = 0
            while True:
                b = wasm_bytes[pos]
                pos += 1
                field_len |= (b & 0x7f) << shift
                shift += 7
                if (b & 0x80) == 0:
                    break
            field_name = wasm_bytes[pos:pos+field_len].decode('utf-8', errors='replace')
            pos += field_len

            kind = wasm_bytes[pos]
            pos += 1
            if kind == 0:  # function
                # type index
                while True:
                    b = wasm_bytes[pos]
                    pos += 1
                    if (b & 0x80) == 0:
                        break
            elif kind == 1:  # table
                pos += 3
            elif kind == 2:  # memory
                pos += 2
            elif kind == 3:  # global
                pos += 2
            imports.append((mod_name, field_name))
        break
    else:
        pos = sec_end

print(f"Total imports found: {len(imports)}")
# Let's filter imports from env that are not standard Emscripten / GL functions
custom_imports = []
for mod, name in imports:
    if mod == "env":
        if not name.startswith("gl") and not name.startswith("_gl") and not name.startswith("emscripten_") and not name.startswith("invoke_"):
            custom_imports.append(name)

print("Custom env imports (total %d):" % len(custom_imports))
for name in sorted(custom_imports):
    print(" ", name)
