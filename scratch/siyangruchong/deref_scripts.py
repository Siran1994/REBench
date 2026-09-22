import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

for mb_id in [4808, 4809, 4450, 4449, 4448, 4451, 4452, 4453]:
    target = asset.objects.get(mb_id)
    raw = target.get_raw_data()
    # Let's inspect first 32 bytes
    f_id, p_id = struct.unpack('<iq', raw[:12])
    # enabled at 12
    enabled = raw[12]
    # script at 16: file_id(4), path_id(8)
    sf_id, sp_id = struct.unpack('<iq', raw[16:28])
    # deref script
    script_obj = None
    if sf_id == 0:
        script_obj = asset.objects.get(sp_id)
    else:
        # external ref
        ext = asset.externals[sf_id - 1]
        for a in env.assets:
            if a.name == ext.name or ext.name in a.name:
                script_obj = a.objects.get(sp_id)
    s_name = 'Unknown'
    if script_obj:
        try:
            sd = script_obj.read()
            s_name = getattr(sd, 'm_ClassName', getattr(sd, 'm_Name', 'MonoScript'))
        except Exception as e:
            s_name = f'Err: {e}'
    print(f'MB {mb_id}: script_id={sp_id} (file {sf_id}) -> {s_name}')
