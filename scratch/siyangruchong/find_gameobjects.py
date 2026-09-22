import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for asset in env.assets:
    if asset.name not in ['level0', 'level1', 'sharedassets0.assets', 'sharedassets1.assets']:
        continue
    print(f'\n=== Asset: {asset.name} ===')
    for obj in asset.objects.values():
        if obj.type.name == 'GameObject':
            data = obj.read()
            name = data.name
            if any(k in name.lower() for k in ['ability', 'whip', 'food', 'crumb', 'shop', 'button', 'canvas', 'panel', 'ui', 'hud']):
                print(f'  GameObject: {name} (path_id={obj.path_id})')
