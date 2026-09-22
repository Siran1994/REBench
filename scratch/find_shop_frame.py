import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')
env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for asset in env.assets:
    if asset.name != 'level1':
        continue
    for obj in asset.objects.values():
        if obj.type.name == 'MonoBehaviour':
            try:
                tree = obj.read_typetree()
                # Check for sprite or m_Sprite
                sp = tree.get('m_Sprite')
                if sp and sp.get('m_PathID') != 0:
                    go_ref = tree.get('m_GameObject')
                    go_name = 'unknown'
                    if go_ref and go_ref.get('m_PathID') in asset.objects:
                        go_name = asset.objects[go_ref['m_PathID']].read().m_Name
                    print(f"MonoBehaviour={obj.path_id} GO='{go_name}' sprite={sp}")
            except Exception as e:
                pass
