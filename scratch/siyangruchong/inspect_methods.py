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

    # Let's inspect methods table
    # hdr[12]: methodsOffset, hdr[13]: methodsSize
    methods_off = hdr[12]
    methods_size = hdr[13]
    print(f'Methods table off={methods_off}, size={methods_size}')

    # Let's search all method names in string table that look like ad callbacks
    # In Il2CppMethodDefinition in v29:
    # nameIndex is at offset 0 (4 bytes uint32)
    # Stride of Il2CppMethodDefinition:
    # In v29: nameIndex(4), declaringType(4), returnType(4), parameterStart(4), genericContainerIndex(4), token(4), flags(2), iflags(2), slot(2), parameterCount(2) = 28 bytes or 32 bytes or 36 bytes?
    # Let's check:
    for stride in [28, 32, 36, 40, 44]:
        if methods_size % stride == 0:
            count = methods_size // stride
            print(f'Possible method stride {stride}, count={count}')
            # test first 5 methods
            f.seek(methods_off)
            valid = True
            for _ in range(5):
                m_data = f.read(stride)
                n_idx = struct.unpack('<I', m_data[:4])[0]
                s = get_str(n_idx)
                if not s or len(s) > 100:
                    valid = False
                    break
            if valid:
                print(f'  Stride {stride} looks valid!')
                method_stride = stride
                break

    # Search methods for Ad / Callback / Video / Reward
    f.seek(methods_off)
    for m_idx in range(methods_size // method_stride):
        f.seek(methods_off + m_idx * method_stride)
        m_data = f.read(method_stride)
        n_idx = struct.unpack('<I', m_data[:4])[0]
        s = get_str(n_idx)
        if any(k in s.lower() for k in ['ad', 'reward', 'banner', 'video', 'interstitial']) and not s.startswith('<'):
            print(f'Method: {s} (index {m_idx})')
