import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

# FoodShop GameObject is id=66
go = asset.objects[66].read()
print(f'=== GameObject: {go.m_Name} (id=66) ===')
for cp in go.m_Component:
    path_id = cp.component.path_id
    target = asset.objects.get(path_id)
    if target:
        print(f'  comp id={path_id}, type={target.type.name}')
        if target.type.name == 'MonoBehaviour':
            raw = target.get_raw_data()
            print(f'    raw len={len(raw)}')
            # find all PPtrs in raw data
            offset = 28
            for pos in range(offset, len(raw) - 11, 4):
                f_id, p_id = struct.unpack('<iq', raw[pos:pos+12])
                if f_id in [0, 1, 2] and 0 < p_id < 20000:
                    t_obj = asset.objects.get(p_id)
                    t_name = t_obj.type.name if t_obj else 'None'
                    go_name = ''
                    if t_obj and t_obj.type.name == 'GameObject':
                        go_name = t_obj.read().m_Name
                    print(f'      offset {pos}: PPtr({f_id}, {p_id}) -> {t_name} {go_name}')
