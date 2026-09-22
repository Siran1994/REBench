import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

# MB 4808 is FoodShopRowUI on BreadcrumbRow
mb = asset.objects[4808]
raw = mb.get_raw_data()
print(f'FoodShopRowUI raw len: {len(raw)}')

# Let's inspect all 4-byte and 8-byte integers in raw data
# to find PPtrs (file_id, path_id)
# Header:
# m_GameObject: (4, 8) = 12
# m_Enabled: 1 + 3 = 4
# m_Script: (4, 8) = 12
# Total header = 28 bytes
offset = 28
print(f'Payload len: {len(raw) - offset}')

# Let's scan for PPtrs in payload:
# In 64-bit Unity editor serialized data: file_id is int32, path_id is int64 (12 bytes)
for pos in range(offset, len(raw) - 11, 4):
    f_id, p_id = struct.unpack('<iq', raw[pos:pos+12])
    if f_id in [0, 1, 2] and p_id > 0 and p_id < 10000:
        target = asset.objects.get(p_id)
        if target:
            go_name = ''
            if target.type.name == 'GameObject':
                go_name = target.read().m_Name
            elif hasattr(target.read(), 'm_GameObject'):
                go_name = target.read().m_GameObject.read().m_Name
            print(f'  offset {pos}: PPtr(file={f_id}, path={p_id}) -> {target.type.name} on {go_name}')
