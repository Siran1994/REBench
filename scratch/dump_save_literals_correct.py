import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')
meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    lit_offsets_off = hdr[2]
    lit_offsets_size = hdr[3]
    lit_data_off = hdr[4]
    lit_data_size = hdr[5]

    f.seek(lit_offsets_off)
    entries = []
    num_entries = lit_offsets_size // 8
    for i in range(num_entries):
        length, offset = struct.unpack('<II', f.read(8))
        entries.append((length, offset))

    strings = []
    for length, offset in entries:
        f.seek(lit_data_off + offset)
        s = f.read(length).decode('utf-8', errors='replace')
        strings.append(s)

    keywords = ['save', 'playerprefs', 'persistent', 'autosave', 'savefile', 'savedata', '.json', '.dat', '.sav', 'envelope']
    matched = set()
    for s in strings:
        low = s.lower()
        if any(kw in low for kw in keywords) and len(s) < 150:
            matched.add(s)

    print(f'Matched {len(matched)} relevant string literals:')
    for s in sorted(matched):
        print(f'  "{s}"')
