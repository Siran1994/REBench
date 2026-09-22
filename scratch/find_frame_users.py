import UnityPy
from UnityPy.files import ObjectReader
import sys

sys.stdout.reconfigure(encoding='utf-8')

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

# Collect all sprite names by (asset_name, path_id)
sprites = {}
for asset in env.assets:
    for obj in asset.objects.values():
        if obj.type.name == 'Sprite':
            try:
                sp = obj.read()
                sprites[(asset.name, obj.path_id)] = sp.m_Name
            except Exception:
                pass

print(f"Total sprites collected: {len(sprites)}")
for k, v in sprites.items():
    if any(w in v.lower() for w in ['frame', 'shop', 'board', 'wood', 'panel', 'bg', 'leaf', 'cabbage']):
        print(f"  {k} -> {v}")

level1 = [a for a in env.assets if a.name == 'level1'][0]
for obj in level1.objects.values():
    if obj.type.name == 'MonoBehaviour':
        try:
            tree = obj.read_typetree()
            sp_ref = tree.get('m_Sprite')
            if sp_ref and sp_ref.get('m_PathID'):
                # find sprite name
                pid = sp_ref.get('m_PathID')
                # find matching in sprites
                matched = [name for (aname, spid), name in sprites.items() if spid == pid]
                go_ref = tree.get('m_GameObject')
                go_name = ''
                if go_ref and go_ref.get('m_PathID') in level1.objects:
                    go_name = level1.objects[go_ref.get('m_PathID')].read().m_Name
                print(f"MonoBehaviour pid={obj.path_id} on GO '{go_name}' uses sprite pid={pid}: {matched}")
        except Exception:
            pass
