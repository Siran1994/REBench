import UnityPy
from UnityPy.files import ObjectReader
import sys

sys.stdout.reconfigure(encoding='utf-8')
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

print('=== 检查所有 Camera ===')
for obj in level1.objects.values():
    if obj.type.name == 'Camera':
        cam = obj.read()
        go = cam.m_GameObject.deref().read()
        # Find transform
        for comp_ref in go.m_Components:
            comp = comp_ref.deref().read()
            if comp_ref.deref().type.name == 'Transform':
                print(f'Camera GO "{go.m_Name}" (pid={cam.m_GameObject.path_id}):')
                print(f'  Pos=({comp.m_LocalPosition.x}, {comp.m_LocalPosition.y}, {comp.m_LocalPosition.z})')
                print(f'  orthographic={cam.orthographic}, size={cam.orthographic_size}')
                pass

print('\n=== 检查 BGS / RoomBGS / CurrentBG / Table / TableArea ===')
for obj in level1.objects.values():
    if obj.type.name == 'GameObject':
        go = obj.read()
        name = go.m_Name
        if any(k in name.lower() for k in ['bg', 'cabbage', 'room', 'table']):
            tr_info = ''
            for c_ref in go.m_Components:
                c = c_ref.deref().read()
                if c_ref.deref().type.name == 'Transform':
                    tr_info = f'Pos=({c.m_LocalPosition.x}, {c.m_LocalPosition.y}, {c.m_LocalPosition.z}), Scale=({c.m_LocalScale.x}, {c.m_LocalScale.y}, {c.m_LocalScale.z})'
                    father = getattr(c, 'm_Father', None)
                    if father and father.m_PathID != 0:
                        try:
                            f_go = father.deref().read().m_GameObject.deref().read()
                            tr_info += f', Father="{f_go.m_Name}"'
                        except Exception:
                            pass
                elif c_ref.deref().type.name == 'SpriteRenderer':
                    sp = getattr(c, 'm_Sprite', None)
                    if sp and sp.m_PathID != 0:
                        try:
                            tr_info += f', Sprite="{sp.deref().read().m_Name}"'
                        except Exception:
                            pass
            print(f'GO "{name}" (pid={obj.path_id}): {tr_info}')
