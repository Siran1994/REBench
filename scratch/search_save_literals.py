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

    sl_off = hdr[8]
    sl_size = hdr[9]
    sld_off = hdr[10]
    sld_size = hdr[11]

    f.seek(sld_off)
    sld_data = f.read(sld_size)

    for i in range(sl_size // 8):
        f.seek(sl_off + i * 8)
        length, data_idx = struct.unpack('<2I', f.read(8))
        s = sld_data[data_idx : data_idx + length].decode('utf-8', errors='ignore')
        low = s.lower()
        if any(k in low for k in ['save', 'playerprefs', '.dat', '.json', 'persistent', 'autosave', 'savefile']):
            if len(s) < 120 and not low.startswith('system.') and not low.startswith('microsoft.'):
                print(f'SL [{i}]: "{s}"')
