import struct

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

    type_defs_off = hdr[40]
    stride = 88

    methods_off = hdr[12]
    methods_size = hdr[13]
    # Il2CppMethodDefinition stride in v29 is usually 44 or 40 or 36 bytes
    # Let's inspect method stride
    # In v29: nameIndex(4), declaringType(4), returnType(4), parameterStart(4), genericContainerIndex(4), token(4), flags(2), iflags(2), slot(2), parameterCount(2) -> total 32 or 40 or 44 bytes

    # Let's search for types named AdManager, MyAdManager, AdCallBack
    for t_idx in range(5018, 5018+346):
        f.seek(type_defs_off + t_idx * stride)
        t_data = f.read(stride)
        name_idx, ns_idx = struct.unpack('<II', t_data[:8])
        c_name = get_str(name_idx)
        if any(k in c_name for k in ['Ad', 'Privacy', 'Skip', 'Aspect']):
            method_start = struct.unpack('<I', t_data[24:28])[0]
            method_count = struct.unpack('<H', t_data[74:76])[0]
            print(f'Class: {c_name}, methodStart: {method_start}, methodCount: {method_count}')
