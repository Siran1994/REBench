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

    fields_def_off = hdr[24]
    field_stride = 12

    # FoodDragController (field_start: 24803, field_count: 13)
    print('=== Fields of FoodDragController ===')
    f.seek(fields_def_off + 24803 * field_stride)
    for i in range(13):
        data = f.read(field_stride)
        name_idx = struct.unpack('<I', data[:4])[0]
        print(f'  Field {i}: {get_str(name_idx)}')

    # TableFoodPlacement (field_start: 24867, field_count: 8)
    print('\n=== Fields of TableFoodPlacement ===')
    f.seek(fields_def_off + 24867 * field_stride)
    for i in range(8):
        data = f.read(field_stride)
        name_idx = struct.unpack('<I', data[:4])[0]
        print(f'  Field {i}: {get_str(name_idx)}')
