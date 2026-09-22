import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    string_table = f.read(hdr[7])
    def get_str(idx):
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    type_defs_off = hdr[40]
    stride = 88
    methods_off = hdr[12]
    method_stride = 32

    for t_idx in range(5018, 5018 + 346):
        f.seek(type_defs_off + t_idx * stride)
        data = f.read(stride)
        vals_32 = struct.unpack('<16I', data[:64])
        vals_16 = struct.unpack('<8H', data[64:80])
        name = get_str(vals_32[0])
        if name in ['MoneyShopTooltipTrigger', 'ShopButtonUX', 'FoodShopRowUI', 'ButtonCursorFeedback']:
            m_start = vals_32[9]
            m_count = vals_16[0]
            print(f'\n=== Class: {name} (m_count={m_count}) ===')
            for m in range(m_start, m_start + m_count):
                f.seek(methods_off + m * method_stride)
                mdata = f.read(method_stride)
                mname = get_str(struct.unpack('<I', mdata[:4])[0])
                print(f'  Method: {mname}')
