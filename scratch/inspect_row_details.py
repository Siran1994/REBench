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

def inspect_go_details(go_pid):
    go = level1.objects[go_pid].read()
    print(f'GO: {go.m_Name} (PID={go_pid})')
    for comp_ref in go.m_Components:
        comp_obj = comp_ref.deref()
        comp = comp_obj.read()
        c_type = comp_obj.type.name
        if c_type == 'RectTransform':
            print(f'  RectTransform (pid={comp_obj.path_id}):')
            print(f'    Pos=({comp.m_AnchoredPosition.x}, {comp.m_AnchoredPosition.y})')
            print(f'    Size=({comp.m_SizeDelta.x}, {comp.m_SizeDelta.y})')
            print(f'    Anchors=[({comp.m_AnchorMin.x}, {comp.m_AnchorMin.y})-({comp.m_AnchorMax.x}, {comp.m_AnchorMax.y})]')
            print(f'    Pivot=({comp.m_Pivot.x}, {comp.m_Pivot.y})')
        else:
            try:
                tree = comp_obj.read_typetree()
                sc = tree.get('m_Script', {})
                sc_name = ''
                if sc.get('m_PathID') in level1.objects:
                    sc_name = level1.objects[sc['m_PathID']].read().m_Name
                print(f'  Component {c_type} (pid={comp_obj.path_id}): script={sc_name}')
                # print some fields
                for k, v in tree.items():
                    if any(w in k.lower() for w in ['size', 'width', 'height', 'cell', 'spacing', 'padding', 'fit']):
                        print(f'    {k}: {v}')
            except:
                pass

print('--- Content (pid=65) ---')
inspect_go_details(65)

print('\n--- Viewport (pid=317) ---')
inspect_go_details(317)

print('\n--- FoodScrollView (pid=562) ---')
inspect_go_details(562)

print('\n--- BreadcrumbRow (pid=774) ---')
inspect_go_details(774)
