import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

for go_id in [1192, 1156]:
    go = asset.objects[go_id].read()
    print(f'\n=== GameObject: {go.m_Name} (id={go_id}) ===')
    print(f'  m_IsActive: {go.m_IsActive}')
    for cp in go.m_Component:
        path_id = cp.component.path_id
        target = asset.objects.get(path_id)
        if target:
            print(f'  comp id={path_id}, type={target.type.name}')
            raw = target.get_raw_data()
            print(f'    raw len={len(raw)}')
            if target.type.name == 'MonoBehaviour':
                # check script
                try:
                    import struct
                    sf_id, sp_id = struct.unpack('<iq', raw[16:28])
                    ext = asset.externals[sf_id - 1]
                    for a in env.assets:
                        if a.name == ext.name or ext.name in a.name:
                            so = a.objects.get(sp_id)
                            if so:
                                print(f'    Script: {so.read().m_ClassName}')
                except Exception as e:
                    print(f'    Script err: {e}')
