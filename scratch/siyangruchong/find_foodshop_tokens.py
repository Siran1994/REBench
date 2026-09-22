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

    # Class 5271 is FoodShop
    f.seek(hdr[40] + 5271 * 88)
    data = f.read(88)
    vals_32 = struct.unpack('<16I', data[:64])
    vals_16 = struct.unpack('<8H', data[64:80])
    m_start = vals_32[9]
    m_count = vals_16[0]
    print(f'FoodShop m_start={m_start}, m_count={m_count}')
    methods = []
    for m in range(m_start, m_start + m_count):
        f.seek(hdr[12] + m * 32)
        mdata = f.read(32)
        name_idx, dec_type, ret_type, param_start, gen_container, token = struct.unpack('<6I', mdata[:24])
        mname = get_str(name_idx)
        methods.append((m, mname, token))
        if any(k in mname for k in ['Buy', 'CanBuy', 'Action', 'Perform']):
            print(f'  Method {m}: {mname} (token={hex(token)})')
