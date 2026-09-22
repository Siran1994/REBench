import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    f.seek(hdr[6])
    string_table = f.read(hdr[7])
    def get_str(idx):
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    # Let's search all strings in string table containing FoodShopRowUI or FoodShop
    for i in range(len(string_table)):
        # print strings around Food
        pass

# Let's inspect string literals: hdr[8] is stringLiteralOffset, hdr[9] is stringLiteralSize
# hdr[10] stringLiteralDataOffset, hdr[11] stringLiteralDataSize
slit_off = hdr[8]
slit_size = hdr[9]
slit_data_off = hdr[10]
slit_data_size = hdr[11]

with open(meta_path, 'rb') as f:
    f.seek(slit_data_off)
    slit_data = f.read(slit_data_size)

    f.seek(slit_off)
    count = slit_size // 8
    print(f'String literals count: {count}')
    for i in range(count):
        length, offset = struct.unpack('<2I', f.read(8))
        s = slit_data[offset:offset+length].decode('utf-8', errors='ignore')
        if any(w in s.lower() for w in ['crumb', 'bread', 'drag', 'food']):
            print(f'Literal: {s}')
