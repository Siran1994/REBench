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
    num_entries = lit_offsets_size // 8
    entries = [struct.unpack('<II', f.read(8)) for _ in range(num_entries)]

    strings = []
    for length, offset in entries:
        f.seek(lit_data_off + offset)
        s = f.read(length).decode('utf-8', errors='replace')
        strings.append(s)

    # Let's inspect strings related to ads, callbacks, externals
    for s in strings:
        if any(w in s.lower() for w in ['adcallback', 'myadmanager', 'showad', 'showreward', 'rewardedad', 'interstitial', 'calljs', 'externalcall', 'privacy']):
            print(f'Match: {repr(s)}')
