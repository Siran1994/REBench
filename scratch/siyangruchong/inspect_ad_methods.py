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

    type_defs_off = hdr[40]
    stride = 88
    methods_off = hdr[12]
    method_stride = 32

    # In Il2CppTypeDefinition:
    # 0: nameIndex (uint32)
    # 4: namespaceIndex (uint32)
    # 8: customAttributeIndex (int32)
    # 12: byvalTypeIndex (int32)
    # 16: ...
    # Let's inspect fields of Il2CppTypeDefinition for AdManager
    for t_idx in range(5018, 5018+346):
        f.seek(type_defs_off + t_idx * stride)
        raw = f.read(stride)
        n_idx, ns_idx = struct.unpack('<II', raw[:8])
        c_name = get_str(n_idx)
        if c_name in ['AdManager', 'MyAdManager', 'AdCallBack', 'ShopAdMaskButton', 'AspectRatioHandler', 'SkipUnityLogo', 'PrivacyPanel']:
            ints = struct.unpack('<22I', raw)
            print(f'Class {c_name}:')
            # print all non-zero ints and their field index
            # methodStart and methodCount:
            # Let's find methodStart
            for idx, val in enumerate(ints):
                if 0 <= val < 85000 and val != 0:
                    # check if methods_off + val * method_stride has valid method name
                    m_off = methods_off + val * method_stride
                    f.seek(m_off)
                    mn_idx = struct.unpack('<I', f.read(4))[0]
                    m_name = get_str(mn_idx)
                    if m_name:
                        print(f'  field[{idx}]={val} -> method: {m_name}')
