import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')
meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    slit_off = hdr[8]
    slit_size = hdr[9]
    slit_data_off = hdr[10]
    slit_data_size = hdr[11]
    f.seek(slit_data_off)
    slit_data = f.read(slit_data_size)
    f.seek(slit_off)
    for i in range(slit_size // 8):
        length, offset = struct.unpack('<2I', f.read(8))
        s = slit_data[offset:offset+length].decode('utf-8', errors='ignore')
        low = s.lower()
        if any(w in low for w in ['save', 'playerprefs', 'persistentdata', 'autosave', '.json', '.dat', '.sav']):
            if len(s) < 100:
                print(f'[{i}]: "{s}"')
