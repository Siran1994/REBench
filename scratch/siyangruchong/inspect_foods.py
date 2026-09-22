import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

raw = asset.objects[4179].get_raw_data()

# Check first 200 bytes for PPtrs
for pos in range(28, 200, 4):
    f_id, p_id = struct.unpack('<iq', raw[pos:pos+12])
    if f_id != 0 and p_id > 0:
        # external asset
        ext = asset.externals[f_id - 1]
        for a in env.assets:
            if a.name == ext.name or ext.name in a.name:
                obj = a.objects.get(p_id)
                if obj:
                    print(f'offset {pos}: PPtr({f_id}, {p_id}) in {a.name} -> type={obj.type.name}')
                    try:
                        d = obj.read()
                        print(f'   name: {getattr(d, "m_Name", "")}')
                    except Exception as e:
                        pass
