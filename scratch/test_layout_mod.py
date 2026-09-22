import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

# 1. Test modifying TableVisual Transform (pid 1207)
tv_tr = level1.objects[1207].read()
print('Original TableVisual Pos:', tv_tr.m_LocalPosition)
tv_tr.m_LocalPosition.y = -0.190
tv_tr.save()
print('Modified TableVisual Pos:', tv_tr.m_LocalPosition)

# 2. Test modifying BG RectTransform (pid 2951)
bg_rt = level1.objects[2951].read()
print('Original BG Pos:', bg_rt.m_AnchoredPosition, 'Size:', bg_rt.m_SizeDelta)
bg_rt.m_SizeDelta.x = 520.0
bg_rt.m_SizeDelta.y = 1000.0
bg_rt.m_AnchoredPosition.x = 905.0
bg_rt.m_AnchoredPosition.y = 0.0
bg_rt.save()
print('Modified BG Pos:', bg_rt.m_AnchoredPosition, 'Size:', bg_rt.m_SizeDelta)

# 3. Test modifying Buttons RectTransform (pid 3350)
b_rt = level1.objects[3350].read()
print('Original Buttons Pos:', b_rt.m_AnchoredPosition)
b_rt.m_AnchoredPosition.x = 905.0
b_rt.save()
print('Modified Buttons Pos:', b_rt.m_AnchoredPosition)
