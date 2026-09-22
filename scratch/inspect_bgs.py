import UnityPy
from UnityPy.files import ObjectReader
import sys

sys.stdout.reconfigure(encoding='utf-8')

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

bgs_go = level1.objects[405].read()
bgs_tr = [c.deref().read() for c in bgs_go.m_Components if c.deref().type.name == 'Transform'][0]

print('=== Children of BGS (GO 405) ===')
for ch in bgs_tr.m_Children:
    ch_tr = ch.deref().read()
    ch_go = ch_tr.m_GameObject.deref().read()
    print(f"Child: {ch_go.m_Name} pos=({ch_tr.m_LocalPosition.x}, {ch_tr.m_LocalPosition.y}, {ch_tr.m_LocalPosition.z}) scale=({ch_tr.m_LocalScale.x}, {ch_tr.m_LocalScale.y})")
    for cp in ch_go.m_Components:
        c_obj = cp.deref()
        c = c_obj.read()
        spr = getattr(c, 'm_Sprite', None)
        sp_name = ''
        if spr and spr.m_PathID != 0:
            try:
                sp_name = spr.deref().read().m_Name
            except Exception:
                sp_name = f'path_id:{spr.m_PathID}'
        print(f"  {c_obj.type.name}: sprite={sp_name}")
