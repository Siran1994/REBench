import UnityPy
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

    fields_off = hdr[14] # fieldOffsets in metadata
    fields_size = hdr[15]
    # In v29: fields definition is hdr[16] and hdr[17] (fieldDefaultValues), let's check field table
    # hdr:
    # 0,1: reserved
    # 2,3: stringLiteral
    # 4,5: stringLiteralData
    # 6,7: string
    # 8,9: events
    # 10,11: properties
    # 12,13: methods
    # 14,15: parameterDefaultValues
    # 16,17: fieldDefaultValues
    # 18,19: fieldAndParameterDefaultValueData
    # 20,21: fieldMarshaledSizes
    # 22,23: parameters
    # 24,25: fields
    # 26,27: genericParameters
    # 28,29: genericParameterConstraints
    # 30,31: genericContainers
    # 32,33: nestedTypes
    # 34,35: interfaces
    # 36,37: vtableMethods
    # 38,39: interfaceOffsets
    # 40,41: typeDefinitions
    
    fields_def_off = hdr[24]
    field_stride = 12 # nameIndex(4), typeIndex(4), token(4)

    # Let's inspect fields of FoodShopRowUI (field_start: 23378, field_count: 27)
    print('=== Fields of FoodShopRowUI ===')
    f.seek(fields_def_off + 23378 * field_stride)
    for i in range(27):
        data = f.read(field_stride)
        name_idx = struct.unpack('<I', data[:4])[0]
        print(f'  Field {i}: {get_str(name_idx)}')

    # Fields of FoodShop (field_start: 24843, field_count: 15)
    print('\n=== Fields of FoodShop ===')
    f.seek(fields_def_off + 24843 * field_stride)
    for i in range(15):
        data = f.read(field_stride)
        name_idx = struct.unpack('<I', data[:4])[0]
        print(f'  Field {i}: {get_str(name_idx)}')
