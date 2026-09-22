import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

asset = [a for a in env.assets if a.name == 'level1'][0]

for go_id, obj in asset.objects.items():
    if obj.type.name == 'GameObject':
        go = obj.read()
        if any(k in go.m_Name.lower() for k in ['coin', 'gold', 'money', 'canvas']):
            for cp in go.m_Component:
                path_id = cp.component.path_id
                target = asset.objects.get(path_id)
                if target and target.type.name == 'RectTransform':
                    rt = target.read()
                    print(f'{go.m_Name} (id={go_id}): pos=({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y}), size=({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y}), anchorMin=({rt.m_AnchorMin.x}, {rt.m_AnchorMin.y}), anchorMax=({rt.m_AnchorMax.x}, {rt.m_AnchorMax.y})')
