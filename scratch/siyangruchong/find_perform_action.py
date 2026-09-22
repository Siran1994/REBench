import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

meta_path = r'extracted/siyangruchong_package/unpacked_unityweb/Il2CppData/Metadata/global-metadata.dat'

# Method 48911 is FoodShopRowUI.PerformAction
# In global-metadata.dat, let's find the method definition
with open(meta_path, 'rb') as f:
    hdr = struct.unpack('<64I', f.read(256))
    methods_off = hdr[12]
    method_stride = 32
    f.seek(methods_off + 48911 * method_stride)
    data = f.read(method_stride)
    # v29 Il2CppMethodDefinition:
    # nameIndex (4), declaringType (4), returnType (4), parameterStart (4), genericContainerIndex (4), token (4)
    name_idx, dec_type, ret_type, param_start, gen_container, token = struct.unpack('<6I', data[:24])
    print(f'PerformAction: token={hex(token)}, dec_type={dec_type}')

    # Let's inspect string literals used in the assembly
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
        if any(k in s for k in ['BuyFood', 'CanBuy', 'FoodShop', 'Breadcrumb', 'crumb', 'delivery']):
            print(f'String literal: {s}')
