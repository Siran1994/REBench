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

def inspect_subtree(go_pid, indent=0, max_depth=5):
    if indent > max_depth:
        return
    go = level1.objects[go_pid].read()
    sp = '  ' * indent
    rt_info = ''
    for comp_ref in go.m_Components:
        comp_obj = comp_ref.deref()
        comp = comp_obj.read()
        c_type = comp_obj.type.name
        if c_type == 'RectTransform':
            rt_info = f" Pos=({comp.m_AnchoredPosition.x:.1f}, {comp.m_AnchoredPosition.y:.1f}) Size=({comp.m_SizeDelta.x:.1f}, {comp.m_SizeDelta.y:.1f}) Anchors=[({comp.m_AnchorMin.x:.2f},{comp.m_AnchorMin.y:.2f})-({comp.m_AnchorMax.x:.2f},{comp.m_AnchorMax.y:.2f})] Pivot=({comp.m_Pivot.x:.2f},{comp.m_Pivot.y:.2f})"
    print(f'{sp}GO {go.m_Name} (pid={go_pid}):{rt_info}')
    for comp_ref in go.m_Components:
        comp_obj = comp_ref.deref()
        comp = comp_obj.read()
        c_type = comp_obj.type.name
        script = getattr(comp, 'm_Script', None)
        s_name = ''
        if script and script.m_PathID != 0:
            try:
                sc_obj = script.deref().read()
                s_name = getattr(sc_obj, 'm_ClassName', getattr(sc_obj, 'm_Name', ''))
            except:
                pass
        if s_name or c_type in ['ScrollRect', 'Mask', 'RectMask2D', 'Scrollbar']:
            print(f'{sp}  Comp {c_type}: {s_name}')
        if c_type in ['RectTransform', 'Transform']:
            for c in getattr(comp, 'm_Children', []):
                try:
                    c_rt = c.deref().read()
                    c_go = c_rt.m_GameObject.deref()
                    inspect_subtree(c_go.path_id, indent + 1, max_depth)
                except Exception:
                    pass

print('=== FoodShopPanel Hierarchy ===')
inspect_subtree(852, max_depth=4)
