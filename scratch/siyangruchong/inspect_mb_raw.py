import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

def get_script_name(obj):
    raw = obj.get_raw_data()
    # In 64-bit Unity (WebGL is 32-bit):
    # m_GameObject: 4 bytes file_id, 4 bytes path_id
    # m_Enabled: 1 byte, 3 bytes padding
    # m_Script: 4 bytes file_id, 4 bytes path_id
    # Let's inspect raw bytes:
    file_id, path_id = struct.unpack('<2i', raw[8:16])
    # or file_id, path_id in 32-bit:
    # m_GameObject: file_id(4), path_id(4 or 8)
    # Let's check:
    return raw[:32]

for mb_id in [4808, 4809, 4450, 4449, 4448, 4451, 4452, 4453]:
    target = asset.objects.get(mb_id)
    raw = target.get_raw_data()
    # let's find PPtr in raw
    # Usually in UnityPy:
    print(f'MB {mb_id}: raw len={len(raw)}')
