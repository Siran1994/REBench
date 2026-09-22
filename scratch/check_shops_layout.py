import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

shops = level1.objects[518].read()
for c in shops.m_Components:
    if c.deref().type.name == 'RectTransform':
        rt = c.deref().read()
        print('Shops RT: Pos=', rt.m_AnchoredPosition, 'Size=', rt.m_SizeDelta)
        for ch in rt.m_Children:
            ch_rt = ch.deref().read()
            ch_go = ch_rt.m_GameObject.deref().read()
            print(f'  {ch_go.m_Name}: Pos=({ch_rt.m_AnchoredPosition.x}, {ch_rt.m_AnchoredPosition.y}), Size=({ch_rt.m_SizeDelta.x}, {ch_rt.m_SizeDelta.y}), Anchors=[({ch_rt.m_AnchorMin.x}, {ch_rt.m_AnchorMin.y})-({ch_rt.m_AnchorMax.x}, {ch_rt.m_AnchorMax.y})], Pivot=({ch_rt.m_Pivot.x}, {ch_rt.m_Pivot.y})')
