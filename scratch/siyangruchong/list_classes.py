import struct

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    string_offset = hdr[6]
    string_size = hdr[7]
    f.seek(string_offset)
    string_table = f.read(string_size)

    def get_str(idx):
        if idx >= len(string_table):
            return ''
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    # In v29: imagesOffset is usually hdr[42], typeDefinitionsOffset is hdr[40]
    # Let's search images across header entries
    for i in range(len(hdr)//2):
        off = hdr[i*2]
        size = hdr[i*2+1]
        if 100 < size < 20000 and off > 0:
            f.seek(off)
            first_int = struct.unpack('<I', f.read(4))[0]
            s = get_str(first_int)
            if s.endswith('.dll') or s == 'mscorlib.dll':
                print(f'Found images table at hdr[{i*2}]: off={off}, size={size}, first={s}')
                images_off = off
                images_size = size
                break

    # Now let's iterate images
    f.seek(images_off)
    # Il2CppImageDefinition: nameIndex(4), assemblyIndex(4), typeStart(4), typeCount(4), ...
    # size is usually 40 bytes
    csharp_type_start = 0
    csharp_type_count = 0
    for img_idx in range(images_size // 40):
        f.seek(images_off + img_idx * 40)
        img_data = f.read(40)
        name_idx, asm_idx, type_start, type_count = struct.unpack('<4I', img_data[:16])
        name = get_str(name_idx)
        if 'Assembly-CSharp' in name:
            print(f'Image: {name}, typeStart: {type_start}, typeCount: {type_count}')
            csharp_type_start = type_start
            csharp_type_count = type_count

    # Type definition offset is hdr[40], size=848408
    type_defs_off = hdr[40]
    type_defs_size = hdr[41]
    # Stride is type_defs_size / total_types or we can detect it
    # Il2CppTypeDefinition in v29 is usually 88 or 92 or 96 bytes
    # Let's detect stride
    f.seek(type_defs_off)
    sample = f.read(2000)
    stride = 88
    for test_s in [88, 92, 96, 100, 104, 108, 112]:
        valid = 0
        for k in range(5):
            n_idx, ns_idx = struct.unpack('<II', sample[k*test_s:k*test_s+8])
            s1 = get_str(n_idx)
            s2 = get_str(ns_idx)
            if s1 and (not s2 or len(s2) < 50):
                valid += 1
        if valid >= 5:
            stride = test_s
            break
    print(f'Type def stride: {stride}')

    classes = []
    for t_idx in range(csharp_type_start, csharp_type_start + csharp_type_count):
        f.seek(type_defs_off + t_idx * stride)
        t_data = f.read(stride)
        name_idx, ns_idx = struct.unpack('<II', t_data[:8])
        c_name = get_str(name_idx)
        c_ns = get_str(ns_idx)
        if c_name and not c_name.startswith('<'):
            classes.append(f'{c_ns}.{c_name}' if c_ns else c_name)

    print(f'Total {len(classes)} classes in Assembly-CSharp:')
    for c in sorted(classes):
        print(f'  {c}')
