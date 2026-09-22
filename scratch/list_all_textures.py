import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load('extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for a in env.assets:
    print(f"\nAsset file: {a.name}")
    for pid, obj in a.objects.items():
        if obj.type.name in ['Texture2D', 'Sprite']:
            try:
                data = obj.read()
                if obj.type.name == 'Texture2D':
                    print(f"  [Texture2D] pid={pid} name='{data.name}' size={data.m_Width}x{data.m_Height} format={data.m_TextureFormat}")
                elif obj.type.name == 'Sprite':
                    print(f"  [Sprite] pid={pid} name='{data.name}' rect={data.m_Rect.width}x{data.m_Rect.height} texture_pid={data.m_RD.texture.path_id if hasattr(data, 'm_RD') and hasattr(data.m_RD, 'texture') else '?'}")
            except Exception as e:
                print(f"  [{obj.type.name}] pid={pid} read error: {e}")
