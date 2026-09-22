import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')
env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for asset in env.assets:
    if asset.name != 'level1':
        continue
    target_ids = [274, 405, 415, 133, 287, 985, 1000, 518]
    for go_id in target_ids:
        if go_id not in asset.objects:
            continue
        go = asset.objects[go_id].read()
        print(f'=== {go.m_Name} (go_id={go_id}) ===')
        for cp in go.m_Component:
            path_id = cp.component.path_id
            target = asset.objects.get(path_id)
            type_name = target.type.name if target else 'None'
            print(f'  comp {type_name} (path_id={path_id})')
            try:
                data = target.read()
                if type_name == 'Transform':
                    print(f'    Pos: ({data.m_LocalPosition.x}, {data.m_LocalPosition.y}, {data.m_LocalPosition.z})')
                    print(f'    Scale: ({data.m_LocalScale.x}, {data.m_LocalScale.y}, {data.m_LocalScale.z})')
                elif type_name == 'RectTransform':
                    print(f'    AnchorMin: ({data.m_AnchorMin.x}, {data.m_AnchorMin.y}), AnchorMax: ({data.m_AnchorMax.x}, {data.m_AnchorMax.y})')
                    print(f'    Pos: ({data.m_AnchoredPosition.x}, {data.m_AnchoredPosition.y}), Size: ({data.m_SizeDelta.x}, {data.m_SizeDelta.y})')
                    print(f'    Pivot: ({data.m_Pivot.x}, {data.m_Pivot.y})')
                elif type_name == 'Camera':
                    d = data.to_dict()
                    print(f'    orthographic: {d.get("orthographic")}, ortho size: {d.get("orthographic size")}')
                    print(f'    rect: {d.get("m_NormalizedViewPortRect")}')
                elif type_name == 'CanvasScaler':
                    d = data.to_dict()
                    print(f'    scaleMode: {d.get("m_UiScaleMode")}, refRes: {d.get("m_ReferenceResolution")}')
                    print(f'    match: {d.get("m_MatchWidthOrHeight")}, screenMatchMode: {d.get("m_ScreenMatchMode")}')
                elif type_name == 'SpriteRenderer':
                    d = data.to_dict()
                    print(f'    Sprite: {d.get("m_Sprite")}, Color: {d.get("m_Color")}')
            except Exception as e:
                print('    err:', e)
