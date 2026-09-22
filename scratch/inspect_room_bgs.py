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

room_bgs = level1.objects[415].read()
tr = [c.deref().read() for c in room_bgs.m_Components if c.deref().type.name == 'Transform'][0]

print('=== Children of RoomBGS (GO 415) ===')
for ch in tr.m_Children:
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
        for ch2 in ch_tr.m_Children:
            ch2_tr = ch2.deref().read()
            ch2_go = ch2_tr.m_GameObject.deref().read()
            print(f"    Child2: {ch2_go.m_Name} pos=({ch2_tr.m_LocalPosition.x}, {ch2_tr.m_LocalPosition.y}) scale=({ch2_tr.m_LocalScale.x}, {ch2_tr.m_LocalScale.y})")
            for cp2 in ch2_go.m_Components:
                c2_obj = cp2.deref()
                c2 = c2_obj.read()
                spr2 = getattr(c2, 'm_Sprite', None)
                sp_name2 = ''
                if spr2 and spr2.m_PathID != 0:
                    try:
                        sp_name2 = spr2.deref().read().m_Name
                    except Exception:
                        sp_name2 = f'path_id:{spr2.m_PathID}'
                print(f"      {c2_obj.type.name}: sprite={sp_name2}")
