import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for asset in env.assets:
    if asset.name != 'level1':
        continue
    for go_id in [1, 1030, 1184]:
        go = asset.objects[go_id].read()
        print(f'=== {go.m_Name} (go_id={go_id}) ===')
        for cp in go.m_Component:
            path_id = cp.component.path_id
            target = asset.objects.get(path_id)
            type_name = target.type.name if target else 'None'
            print(f'  comp path_id={path_id}, type={type_name}')
            if target and type_name == 'RectTransform':
                rt = target.read()
                print(f'    AnchorMin: ({rt.m_AnchorMin.x}, {rt.m_AnchorMin.y})')
                print(f'    AnchorMax: ({rt.m_AnchorMax.x}, {rt.m_AnchorMax.y})')
                print(f'    AnchoredPos: ({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y})')
                print(f'    SizeDelta: ({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y})')
                print(f'    Pivot: ({rt.m_Pivot.x}, {rt.m_Pivot.y})')
                if rt.m_Father:
                    father_rt = rt.m_Father.read()
                    father_go = father_rt.m_GameObject.read()
                    print(f'    Father: {father_go.m_Name}')
