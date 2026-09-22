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

shops_go = level1.objects[518].read()
shops_rt = [c.deref().read() for c in shops_go.m_Components if c.deref().type.name == 'RectTransform'][0]
father = shops_rt.m_Father.deref().read()
father_go = father.m_GameObject.deref().read()

print(f"Father of Shops: {father_go.m_Name}")
print(f"Father RectTransform: Pos=({father.m_AnchoredPosition.x}, {father.m_AnchoredPosition.y}) Size=({father.m_SizeDelta.x}, {father.m_SizeDelta.y}) Anchors=[({father.m_AnchorMin.x},{father.m_AnchorMin.y})-({father.m_AnchorMax.x},{father.m_AnchorMax.y})]")

print(f"\nSiblings of Shops (children of {father_go.m_Name}):")
for ch in father.m_Children:
    ch_rt = ch.deref().read()
    ch_go = ch_rt.m_GameObject.deref().read()
    print(f"  Child: {ch_go.m_Name} Pos=({ch_rt.m_AnchoredPosition.x}, {ch_rt.m_AnchoredPosition.y}) Size=({ch_rt.m_SizeDelta.x}, {ch_rt.m_SizeDelta.y}) Anchors=[({ch_rt.m_AnchorMin.x},{ch_rt.m_AnchorMin.y})-({ch_rt.m_AnchorMax.x},{ch_rt.m_AnchorMax.y})]")
    for cp in ch_go.m_Components:
        c_obj = cp.deref()
        c = c_obj.read()
        spr = getattr(c, 'm_Sprite', None)
        if spr and spr.m_PathID != 0:
            try:
                sp_name = spr.deref().read().m_Name
            except Exception:
                sp_name = f'path_id:{spr.m_PathID}'
            print(f"    Sprite: {sp_name}")
        script = getattr(c, 'm_Script', None)
        if script and script.m_PathID != 0:
            try:
                sc_name = script.deref().read().m_ClassName
            except Exception:
                sc_name = ''
            print(f"    Script: {sc_name}")
