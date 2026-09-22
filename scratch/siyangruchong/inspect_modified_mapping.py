import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

names = [
    'UpgradeFrame', 'UpgradePanel', 'Peashooter', 'AppleRipe', 'Burger2', 'Cookie',
    'floor_1_2', 'FoodIcon (1)', 'TableExpansionIcon', 'TableIcon (1)', 'TableMedium', 'TableSmall2_2'
]

for a in env.assets:
    for obj in a.objects.values():
        if obj.type.name == 'Texture2D':
            d = obj.read()
            n = getattr(d, 'm_Name', '')
            if n in names:
                w = getattr(d, 'm_Width', 0)
                h = getattr(d, 'm_Height', 0)
                print(f'MATCH Texture2D: asset={a.name}, path_id={obj.path_id}, name={n}, size=({w}, {h})')
        elif obj.type.name == 'Sprite':
            d = obj.read()
            n = getattr(d, 'm_Name', '')
            if n in names:
                tex_ptr = getattr(d.m_RD, 'texture', None)
                print(f'MATCH Sprite: asset={a.name}, path_id={obj.path_id}, name={n}, tex_ptr=({tex_ptr.m_FileID}, {tex_ptr.m_PathID})')
