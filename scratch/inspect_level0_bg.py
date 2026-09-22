import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load('extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level0 = [a for a in env.assets if a.name == 'level0'][0]

for go_pid in [3, 14, 15, 12]:
    go = level0.objects[go_pid].read()
    print(f'GameObject {go_pid}: {go.m_Name}')
    for comp in go.m_Components:
        comp_obj = comp.read()
        print(f'  Component: {type(comp_obj).__name__} (pid={comp.path_id})')
        for attr in ['m_Sprite', 'm_Texture']:
            if hasattr(comp_obj, attr):
                ptr = getattr(comp_obj, attr)
                print(f'    {attr}: path_id={ptr.path_id}, file_id={ptr.file_id}')
                try:
                    target = ptr.read()
                    name = getattr(target, 'name', '') or getattr(target, 'm_Name', '')
                    print(f'      target: {type(target).__name__} -> {name}')
                    if hasattr(target, 'm_RD'): # Sprite
                        tex_ptr = target.m_RD.texture
                        print(f'        texture ptr: path_id={tex_ptr.path_id}, file_id={tex_ptr.file_id}')
                        tex = tex_ptr.read()
                        print(f'        texture: {tex.name} ({tex.m_Width}x{tex.m_Height})')
                except Exception as e:
                    print(f'      target read error: {e}')
