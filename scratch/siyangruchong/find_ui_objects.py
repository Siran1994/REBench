import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

print(f'Total assets in data.unity3d: {len(env.assets)}')

for asset in env.assets:
    print(f'Asset file: {asset.name}')
    for obj_id, obj in asset.objects.items():
        if obj.type.name in ['GameObject', 'RectTransform', 'MonoBehaviour']:
            try:
                data = obj.read()
                name = getattr(data, 'name', '')
                if any(k in name.lower() for k in ['ability', 'whip', 'food', 'crumb', 'shop', 'button', 'canvas']):
                    print(f'  [{obj.type.name}] {name} (path_id={obj.path_id})')
            except Exception as e:
                pass
