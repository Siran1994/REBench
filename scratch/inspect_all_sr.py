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

for obj in level1.objects.values():
    if obj.type.name == 'SpriteRenderer':
        sr = obj.read()
        go = sr.m_GameObject.deref().read()
        sp_name = 'none'
        if sr.m_Sprite and sr.m_Sprite.m_PathID != 0:
            try:
                sp_name = sr.m_Sprite.deref().read().m_Name
            except:
                sp_name = f'pid:{sr.m_Sprite.m_PathID}'
        tr = None
        for c in go.m_Components:
            if c.deref().type.name == 'Transform':
                tr = c.deref().read()
        pos_str = f'Pos=({tr.m_LocalPosition.x:.3f}, {tr.m_LocalPosition.y:.3f}), Scale=({tr.m_LocalScale.x:.3f}, {tr.m_LocalScale.y:.3f})' if tr else ''
        print(f'SpriteRenderer on "{go.m_Name}" (go_pid={sr.m_GameObject.path_id}, sr_pid={obj.path_id}): Sprite="{sp_name}", {pos_str}')
