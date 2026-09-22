import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect wasm around exports or known calls
wasm_path = r'cdn_assets/Build/siyangruchong.wasm'

# In Unity WebGL wasm, is there an error message or log string in FoodShop?
# Let's check string table in metadata for strings related to FoodShop
meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'
with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    f.seek(hdr[6])
    string_table = f.read(hdr[7])
    def get_str(idx):
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    # Let's find all string literals
    # In v29: stringLiteral is hdr[8], stringLiteralSize is hdr[9]
    # stringLiteralData is hdr[10], stringLiteralDataSize is hdr[11]
    # Wait, earlier dump returned 537 string literals. Let's print all 537!
    slit_off = hdr[8]
    slit_size = hdr[9]
    slit_data_off = hdr[10]
    slit_data_size = hdr[11]
    f.seek(slit_data_off)
    slit_data = f.read(slit_data_size)
    f.seek(slit_off)
    print(f'Total literals: {slit_size // 8}')
    for i in range(slit_size // 8):
        l, o = struct.unpack('<2I', f.read(8))
        s = slit_data[o:o+l].decode('utf-8', errors='ignore')
        if any(w in s for w in ['Food', 'Shop', 'Buy', 'Breadcrumb', 'Crumb', 'money', 'Space', 'table', 'drop', 'Drop']):
            print(f'  [{i}]: "{s}"')
