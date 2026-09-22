import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

def inspect_subtree(go_pid, indent=0):
    go = level1.objects[go_pid].read()
    sp = '  ' * indent
    print(f'{sp}GO {go.m_Name} (pid={go_pid}):')
    for comp_ref in go.m_Components:
        comp_obj = comp_ref.deref()
        comp = comp_obj.read()
        c_type = comp_obj.type.name
        info = ''
        color = getattr(comp, 'm_Color', None)
        if color:
            info += f' m_Color=(r={color.r:.3f}, g={color.g:.3f}, b={color.b:.3f}, a={color.a:.3f})'
        spr = getattr(comp, 'm_Sprite', None)
        if spr and spr.m_PathID != 0:
            spr_obj = spr.deref().read()
            info += f' m_Sprite={getattr(spr_obj, "m_Name", spr.m_PathID)}'
        script = getattr(comp, 'm_Script', None)
        if script and script.m_PathID != 0:
            sc_obj = script.deref().read()
            info += f' script={getattr(sc_obj, "m_ClassName", getattr(sc_obj, "m_Name", script.m_PathID))}'
        print(f'{sp}  Comp {c_type} (pid={comp_obj.path_id}): {info}')
        if c_type == 'RectTransform':
            for c in getattr(comp, 'm_Children', []):
                c_rt = c.deref().read()
                c_go = c_rt.m_GameObject.deref()
                inspect_subtree(c_go.path_id, indent + 1)

print('=== ActiveAbilitiesPanel Subtree ===')
inspect_subtree(1)

print('\n=== OpenSkillTreeButton Subtree ===')
inspect_subtree(594)
