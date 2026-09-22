import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
s1 = [a for a in env.assets if a.name == 'sharedassets1.assets'][0]
l1 = [a for a in env.assets if a.name == 'level1'][0]

def inspect_full_hierarchy(asset, go_pid, indent=0):
    go = asset.objects[go_pid].read()
    sp = '  ' * indent
    print(f'{sp}GO {go.m_Name} (pid={go_pid}):')
    for comp_ref in go.m_Components:
        comp_obj = comp_ref.deref()
        comp = comp_obj.read()
        c_type = comp_obj.type.name
        color = getattr(comp, 'm_Color', None)
        col_str = f'm_Color=(r={color.r:.3f}, g={color.g:.3f}, b={color.b:.3f}, a={color.a:.3f}) hex=#{int(color.r*255):02x}{int(color.g*255):02x}{int(color.b*255):02x}' if color else ''
        spr = getattr(comp, 'm_Sprite', None)
        spr_str = ''
        if spr and spr.m_PathID != 0:
            spr_obj = spr.deref().read()
            spr_str = f'm_Sprite={getattr(spr_obj, "m_Name", spr.m_PathID)}'
        sc = getattr(comp, 'm_Script', None)
        sc_str = ''
        if sc and sc.m_PathID != 0:
            sc_obj = sc.deref().read()
            sc_str = f'script={getattr(sc_obj, "m_ClassName", getattr(sc_obj, "m_Name", sc.m_PathID))}'
        print(f'{sp}  Comp {c_type} (pid={comp_obj.path_id}): {sc_str} {spr_str} {col_str}')
        if c_type == 'RectTransform':
            for c in getattr(comp, 'm_Children', []):
                c_rt = c.deref().read()
                c_go = c_rt.m_GameObject.deref()
                inspect_full_hierarchy(asset, c_go.path_id, indent + 1)

print('=== 1. ActiveButton Hierarchy in sharedassets1.assets ===')
inspect_full_hierarchy(s1, 386)

print('\n=== 2. OpenSkillTreeButton Hierarchy in level1 ===')
inspect_full_hierarchy(l1, 594)
