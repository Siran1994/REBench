import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

def inspect_gameobject(asset, go_id):
    go = asset.objects[go_id].read()
    print(f'\n=== GameObject: {go.m_Name} (id={go_id}) ===')
    for comp_ptr in go.m_Component:
        # comp_ptr is PPtr
        comp_obj = comp_ptr.read()
        print(f'  Component: {comp_obj.type.name} (id={comp_ptr.path_id})')
        if comp_obj.type.name == 'RectTransform':
            rt = comp_obj
            print(f'    m_AnchorMin: ({rt.m_AnchorMin.x}, {rt.m_AnchorMin.y})')
            print(f'    m_AnchorMax: ({rt.m_AnchorMax.x}, {rt.m_AnchorMax.y})')
            print(f'    m_AnchoredPosition: ({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y})')
            print(f'    m_SizeDelta: ({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y})')
            print(f'    m_Pivot: ({rt.m_Pivot.x}, {rt.m_Pivot.y})')
            # check parent
            if rt.m_Father:
                father = rt.m_Father.read()
                father_go = father.m_GameObject.read()
                print(f'    Parent: {father_go.m_Name}')
            # check children
            for child_ptr in rt.m_Children:
                child = child_ptr.read()
                child_go = child.m_GameObject.read()
                print(f'    Child: {child_go.m_Name} (go_id={child.m_GameObject.path_id})')
        elif comp_obj.type.name == 'MonoBehaviour':
            # print script name
            try:
                script = comp_obj.m_Script.read()
                print(f'    Script: {script.m_Name}')
            except Exception as e:
                pass

for asset in env.assets:
    if asset.name == 'level1':
        for go_id in [1, 1030]:
            inspect_gameobject(asset, go_id)
    elif asset.name == 'sharedassets1.assets':
        for go_id in [386]:
            inspect_gameobject(asset, go_id)
