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

    # Let's inspect fields of Il2CppTypeDefinition in Unity 2021 (Metadata v29)
    # Let's find exact layout of Il2CppTypeDefinition:
    # typedef struct Il2CppTypeDefinition
    # {
    #     uint32_t nameIndex;
    #     uint32_t namespaceIndex;
    #     uint32_t byvalTypeIndex;
    #     uint32_t declaringTypeIndex;
    #     uint32_t parentIndex;
    #     uint32_t elementTypeIndex;
    #     uint32_t genericContainerIndex;
    #     uint32_t flags;
    #     uint32_t fieldStart;
    #     uint32_t methodStart;
    #     uint32_t eventStart;
    #     uint32_t propertyStart;
    #     uint32_t nestedTypesStart;
    #     uint32_t interfacesStart;
    #     uint32_t vtableStart;
    #     uint32_t interfaceOffsetsStart;
    #     uint16_t method_count;
    #     uint16_t property_count;
    #     uint16_t field_count;
    #     uint16_t event_count;
    #     uint16_t nested_type_count;
    #     uint16_t vtable_count;
    #     uint16_t interfaces_count;
    #     uint16_t interface_offsets_count;
    #     uint32_t bitfield;
    #     uint32_t token;
    # } Il2CppTypeDefinition; // 16*4 + 8*2 + 4 + 4 = 64 + 16 + 8 = 88 bytes!

    methods_off = hdr[12]
    method_stride = 32
    type_defs_off = hdr[40]
    stride = 88

    target_names = ['FoodShopRowUI', 'FoodShop', 'FoodDragController', 'ActiveAbilityPanelUI', 'ActiveAbilityButtonUI', 'TableFoodPlacement']

    f.seek(type_defs_off + 5018 * stride)
    for t_idx in range(5018, 5018 + 346):
        data = f.read(stride)
        vals_32 = struct.unpack('<16I', data[:64])
        vals_16 = struct.unpack('<8H', data[64:80])
        name = get_str(vals_32[0])
        ns = get_str(vals_32[1])
        full_name = f'{ns}.{name}' if ns else name
        for tn in target_names:
            if tn == name:
                field_start = vals_32[8]
                method_start = vals_32[9]
                method_count = vals_16[0]
                field_count = vals_16[2]
                print(f'\n=== Class: {full_name} ===')
                print(f'  method_start: {method_start}, method_count: {method_count}')
                print(f'  field_start: {field_start}, field_count: {field_count}')
                # print methods
                for m_i in range(method_start, method_start + method_count):
                    curr_pos = f.tell()
                    f.seek(methods_off + m_i * method_stride)
                    m_data = f.read(method_stride)
                    f.seek(curr_pos)
                    m_name = get_str(struct.unpack('<I', m_data[:4])[0])
                    print(f'    Method: {m_name}')
