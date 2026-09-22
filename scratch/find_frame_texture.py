import UnityPy
from UnityPy.files import ObjectReader
import sys

sys.stdout.reconfigure(encoding='utf-8')

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

# Let's check all Sprites and Textures in all assets
# Find which texture contains the wooden border with green leaves!
# In Image 1, the wooden border has green leaves on top-left, top-right, bottom-left, bottom-right.
# Let's search all textures in sharedassets0, sharedassets1, etc.
for asset in env.assets:
    for obj in asset.objects.values():
        if obj.type.name in ['Texture2D', 'Sprite']:
            try:
                name = getattr(obj.read(), 'm_Name', '')
                if any(k in name.lower() for k in ['shop', 'frame', 'board', 'wood', 'menu', 'panel', 'table', 'bg']):
                    print(f"{asset.name} {obj.type.name} pid={obj.path_id}: {name}")
            except Exception:
                pass
