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

def inspect_subtree(go_pid, indent=0):
    go = level1.objects[go_pid].read()
    sp = '  ' * indent
    rt_info = ''
    for cp in go.m_Components:
        c_obj = cp.deref()
        c = c_obj.read()
        if c_obj.type.name == 'RectTransform':
            rt_info = f" Pos=({c.m_AnchoredPosition.x:.1f}, {c.m_AnchoredPosition.y:.1f}) Size=({c.m_SizeDelta.x:.1f}, {c.m_SizeDelta.y:.1f}) Anchors=[({c.m_AnchorMin.x:.2f},{c.m_AnchorMin.y:.2f})-({c.m_AnchorMax.x:.2f},{c.m_AnchorMax.y:.2f})] Pivot=({c.m_Pivot.x:.2f},{c.m_Pivot.y:.2f})"
    print(f"{sp}GO {go.m_Name} (pid={go_pid}):{rt_info}")
    for cp in go.m_Components:
        c_obj = cp.deref()
        c = c_obj.read()
        spr = getattr(c, 'm_Sprite', None)
        sp_name = ''
        if spr and spr.m_PathID != 0:
            try:
                sp_name = spr.deref().read().m_Name
            except Exception:
                sp_name = f'path_id:{spr.m_PathID}'
        sc_name = ''
        script = getattr(c, 'm_Script', None)
        if script and script.m_PathID != 0:
            try:
                sc_name = script.deref().read().m_ClassName
            except Exception:
                sc_name = ''
        if sp_name or sc_name or c_obj.type.name == 'Image':
            print(f"{sp}  {c_obj.type.name}: script={sc_name} sprite={sp_name}")
    for cp in go.m_Components:
        c_obj = cp.deref()
        if c_obj.type.name == 'RectTransform':
            c = c_obj.read()
            for ch in getattr(c, 'm_Children', []):
                inspect_subtree(ch.deref().read().m_GameObject.deref().path_id, indent + 1)

print('=== FoodShopPanel (pid=852) ===')
inspect_subtree(852)
