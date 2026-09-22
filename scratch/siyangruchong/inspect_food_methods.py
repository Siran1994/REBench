import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    f.seek(hdr[6])
    string_table = f.read(hdr[7])

    def get_str(idx):
        if idx >= len(string_table): return ''
        end = string_table.find(b'\x00', idx)
        return string_table[idx:end].decode('utf-8', errors='ignore') if end != -1 else ''

    methods_off = hdr[12]
    methods_size = hdr[13]
    method_stride = 32

    # Let's inspect methods of FoodShopRowUI, FoodShop, TableFoodPlacement, TableDropDeliverySystem
    # Type definitions:
    type_defs_off = hdr[40]
    stride = 88
    
    # We want to find the methods for classes matching target names
    target_classes = ['FoodShopRowUI', 'FoodShop', 'TableFoodPlacement', 'TableDropDeliverySystem', 'ActiveAbilityPanelUI', 'ActiveAbilityButtonUI']
    
    for t_idx in range(5018, 5018 + 346):
        f.seek(type_defs_off + t_idx * stride)
        t_data = f.read(stride)
        n1, n2, _, _, m_start, m_count = struct.unpack('<4I2I', t_data[:24])
        # wait, let's verify offset of methodStart and methodCount
        # In v29:
        # nameIndex (0), namespaceIndex (4), byvalTypeIndex(8), byrefTypeIndex(12),
        # declaringType(16), parentType(20), elementType(24), rgctxStartIndex(28), rgctxCount(32),
        # genericContainerIndex(36), flags(40), fieldStart(44), methodStart(48), eventStart(52),
        # propertyStart(56), nestedTypesStart(60), interfacesStart(64), vtableStart(68),
        # interfaceOffsetsStart(72), methodCount(76), propertyCount(80), fieldCount(84)
        c_name = get_str(n1)
        if any(tc in c_name for tc in target_classes):
            # unpack with proper fields
            fields = struct.unpack('<22I', t_data[:88])
            m_start = fields[12]
            m_count = fields[19]
            f_start = fields[11]
            f_count = fields[21]
            print(f'\n=== Class {c_name} (m_start={m_start}, m_count={m_count}, f_start={f_start}, f_count={f_count}) ===')
            for m_i in range(m_start, m_start + m_count):
                f.seek(methods_off + m_i * method_stride)
                m_data = f.read(method_stride)
                m_name_idx = struct.unpack('<I', m_data[:4])[0]
                m_name = get_str(m_name_idx)
                print(f'  Method: {m_name}')
