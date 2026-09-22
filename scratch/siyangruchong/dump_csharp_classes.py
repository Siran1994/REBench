import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    string_offset = hdr[6]
    string_size = hdr[7]
    f.seek(string_offset)
    string_table = f.read(string_size)

    def get_str(idx):
        if idx >= len(string_table): return ''
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    images_off = hdr[42]
    images_size = hdr[43]
    csharp_type_start = 0
    csharp_type_count = 0
    for img_idx in range(images_size // 40):
        f.seek(images_off + img_idx * 40)
        img_data = f.read(40)
        name_idx, asm_idx, type_start, type_count = struct.unpack('<4I', img_data[:16])
        name = get_str(name_idx)
        if name == 'Assembly-CSharp.dll':
            csharp_type_start = type_start
            csharp_type_count = type_count
            print(f'Assembly-CSharp: start={type_start}, count={type_count}')

    type_defs_off = hdr[40]
    stride = 88 # v29 Il2CppTypeDefinition stride is 88 bytes

    for t_idx in range(csharp_type_start, csharp_type_start + csharp_type_count):
        f.seek(type_defs_off + t_idx * stride)
        t_data = f.read(stride)
        name_idx, ns_idx, custom_attr, type_token, method_start, method_count = struct.unpack('<2I4x4I', t_data[:28])
        # let's unpack more fields
        # Il2CppTypeDefinition in v29:
        # nameIndex(4), namespaceIndex(4), customAttributeIndex(4), token(4)
        c_name = get_str(name_idx)
        c_ns = get_str(ns_idx)
        print(f'Class [{t_idx}]: {c_ns}.{c_name}' if c_ns else f'Class [{t_idx}]: {c_name}')
