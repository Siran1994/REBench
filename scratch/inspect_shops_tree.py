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

def inspect_node(go_pid, indent=0):
    go = level1.objects[go_pid].read()
    sp = '  ' * indent
    rt_info = ''
    for cp in go.m_Components:
        c_obj = cp.deref()
        c = c_obj.read()
        if c_obj.type.name == 'RectTransform':
            rt_info = f" Pos=({c.m_AnchoredPosition.x:.1f}, {c.m_AnchoredPosition.y:.1f}) Size=({c.m_SizeDelta.x:.1f}, {c.m_SizeDelta.y:.1f}) Anchors=[({c.m_AnchorMin.x:.2f},{c.m_AnchorMin.y:.2f})-({c.m_AnchorMax.x:.2f},{c.m_AnchorMax.y:.2f})] Pivot=({c.m_Pivot.x:.2f},{c.m_Pivot.y:.2f})"
        elif c_obj.type.name == 'Transform':
            rt_info = f" Pos=({c.m_LocalPosition.x:.2f}, {c.m_LocalPosition.y:.2f}) Scale=({c.m_LocalScale.x:.2f}, {c.m_LocalScale.y:.2f})"
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
                pass
        if sp_name or sc_name:
            print(f"{sp}  {c_obj.type.name}: script={sc_name} sprite={sp_name}")
        if c_obj.type.name in ['RectTransform', 'Transform']:
            for ch in getattr(c, 'm_Children', []):
                ch_rt = ch.deref().read()
                inspect_node(ch_rt.m_GameObject.deref().path_id, indent + 1)

print('=== Tree of Shops (GO pid=518) ===')
inspect_node(518)
