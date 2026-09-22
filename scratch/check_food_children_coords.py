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

# 检查 FoodShopPanel, FoodText, FoodScrollView 当前坐标
f_rt = level1.objects[3147].read()
t_rt = level1.objects[2997].read() # FoodText
sv_rt = level1.objects[2869].read() # FoodScrollView

print(f"当前 FoodShopPanel (pid=3147): Pos=({f_rt.m_AnchoredPosition.x}, {f_rt.m_AnchoredPosition.y}), Size=({f_rt.m_SizeDelta.x}, {f_rt.m_SizeDelta.y})")
print(f"当前 FoodText (pid=2997): Pos=({t_rt.m_AnchoredPosition.x}, {t_rt.m_AnchoredPosition.y}), Size=({t_rt.m_SizeDelta.x}, {t_rt.m_SizeDelta.y})")
print(f"当前 FoodScrollView (pid=2869): Pos=({sv_rt.m_AnchoredPosition.x}, {sv_rt.m_AnchoredPosition.y}), Size=({sv_rt.m_SizeDelta.x}, {sv_rt.m_SizeDelta.y})")
