import struct

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    lit_offsets_off = hdr[2]
    lit_offsets_size = hdr[3]
    lit_data_off = hdr[4]
    lit_data_size = hdr[5]

    print(f'lit_offsets: {lit_offsets_off} ({lit_offsets_size} bytes, {lit_offsets_size // 8} entries)')
    print(f'lit_data: {lit_data_off} ({lit_data_size} bytes)')

    # Each entry in v29 stringLiteralOffsets: length(4), dataOffset(4)
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

    print(f'Total string literals: {len(strings)}')

    # Search for interesting strings
    keywords = ['Ad', 'Callback', 'SendMessage', 'http', 'www', 'Privacy', 'Banner', 'Reward', 'Interstitial', 'Show', 'Unity', 'Poki', 'Crazy', 'SDK', 'WebGL']
    matched = set()
    for s in strings:
        for kw in keywords:
            if kw.lower() in s.lower() and len(s) < 200:
                matched.add(s)

    print(f'Matched {len(matched)} relevant string literals:')
    for s in sorted(matched):
        print(f'  "{s}"')
