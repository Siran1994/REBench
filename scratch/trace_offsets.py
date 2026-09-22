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

# Check FoodShopPanel (852)
f_rt = level1.objects[3147].read()
print('FoodShopPanel (3147): Pos=', f_rt.m_AnchoredPosition, 'Size=', f_rt.m_SizeDelta)

# Check FoodScrollView (562)
sv_rt = level1.objects[2869].read()
print('FoodScrollView (2869): Pos=', sv_rt.m_AnchoredPosition, 'Size=', sv_rt.m_SizeDelta, 'Pivot=', sv_rt.m_Pivot)

# Check Viewport (317)
vp_rt = level1.objects[2635].read()
print('Viewport (2635): Pos=', vp_rt.m_AnchoredPosition, 'Size=', vp_rt.m_SizeDelta, 'Pivot=', vp_rt.m_Pivot)

# Check Content (65)
c_rt = level1.objects[2395].read()
print('Content (2395): Pos=', c_rt.m_AnchoredPosition, 'Size=', c_rt.m_SizeDelta, 'Pivot=', c_rt.m_Pivot)

# Check BreadcrumbRow (774)
r_rt = level1.objects[3072].read()
print('BreadcrumbRow (3072): Pos=', r_rt.m_AnchoredPosition, 'Size=', r_rt.m_SizeDelta, 'Pivot=', r_rt.m_Pivot)

# Check BreadcrumbBuyButton
btn_rt = level1.objects[3072].read().m_Children[0].deref().read()
print('BreadcrumbBuyButton: Pos=', btn_rt.m_AnchoredPosition, 'Size=', btn_rt.m_SizeDelta, 'Pivot=', btn_rt.m_Pivot)
