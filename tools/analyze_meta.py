import struct
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'D:\Desktop\REBench\extracted\perfect_landing_plane_pilot_package\unpacked_unityweb\Il2CppData\Metadata\global-metadata.dat'

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

    # Let's inspect which header entry points to the image array
    # We know offset 3763596 is an image entry!
    for h_idx in range(len(hdr)):
        off = hdr[h_idx]
        if abs(off - 3763596) < 10000:
            print(f'Header entry {h_idx}: offset={off}')

    # Let's read at 3763596
    f.seek(3763596)
    # Image definition:
    # nameIndex (4), assemblyIndex (4), typeStart (4), typeCount (4), ...
    img_data = f.read(40)
    img_ints = struct.unpack('<10I', img_data)
    name = get_str(img_ints[0])
    type_defs_offset = hdr[40]
    type_defs_size = hdr[41]
    print(f'type_defs_offset={type_defs_offset}, size={type_defs_size}')
    
    # In v31: Il2CppTypeDefinition size is usually around 88-112 bytes
    # Let's find type definition stride
    # Type definition starts with nameIndex (4), namespaceIndex (4), ...
    # Let's read the first type definition
    type_start = img_ints[2]
    type_count = img_ints[3]
    print(f'Assembly-CSharp typeStart: {type_start}, typeCount: {type_count}')

    # Let's check the size of one Il2CppTypeDefinition
    # Total type definitions count:
    # Let's test stride
    f.seek(type_defs_offset)
    sample_data = f.read(2000)
    # Check nameIndex and namespaceIndex
    for stride in range(60, 140, 4):
        valid = 0
        for i in range(10):
            off = i * stride
            name_idx, ns_idx = struct.unpack('<II', sample_data[off:off+8])
            s_name = get_str(name_idx)
            s_ns = get_str(ns_idx)
            if s_name and len(s_name) < 100:
                valid += 1
        if valid >= 9:
            print(f'Detected type definition stride: {stride}')
            type_stride = stride
            break
            
    # Dump all types in Assembly-CSharp
    game_classes = []
    for t_idx in range(type_start, type_start + type_count):
        t_off = type_defs_offset + t_idx * type_stride
        f.seek(t_off)
        t_data = f.read(type_stride)
        name_idx, ns_idx = struct.unpack('<II', t_data[:8])
        c_name = get_str(name_idx)
        c_ns = get_str(ns_idx)
        if c_name:
            full_name = f'{c_ns}.{c_name}' if c_ns else c_name
            game_classes.append(full_name)
            
    print(f'\nTotal classes in Assembly-CSharp: {len(game_classes)}')
    print('Sample game classes:')
    for c in sorted(game_classes):
        if not c.startswith('<') and not 'Compiler' in c and not 'DisplayClass' in c:
            print(f'  - {c}')


