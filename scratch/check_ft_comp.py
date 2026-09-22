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

ft_go = level1.objects[704].read()
print('FoodText components:')
for c in ft_go.m_Components:
    co = c.deref()
    print(' ', co.type.name, co.path_id)
    if co.type.name == 'RectTransform':
        rt = co.read()
        print('    Pos=', rt.m_AnchoredPosition, 'Size=', rt.m_SizeDelta, 'Anchors=', rt.m_AnchorMin, rt.m_AnchorMax)
