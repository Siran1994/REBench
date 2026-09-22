import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

for go_id in [774, 367]:
    go = asset.objects[go_id].read()
    print(f'\n=== GameObject: {go.m_Name} (id={go_id}) ===')
    for cp in go.m_Component:
        path_id = cp.component.path_id
        target = asset.objects.get(path_id)
        if target:
            print(f'  comp id={path_id}, type={target.type.name}')
            if target.type.name == 'MonoBehaviour':
                # let's see script name
                try:
                    mb = target.read()
                    script = mb.m_Script.read()
                    print(f'    Script: {script.m_Name}')
                except Exception as e:
                    print(f'    Script read error: {e}')
            elif target.type.name == 'RectTransform':
                rt = target.read()
                print(f'    RectTransform: pos=({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y}), size=({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y})')
