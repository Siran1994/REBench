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
    if obj.type.name in ['SpriteRenderer', 'Image']:
        try:
            tree = obj.read_typetree()
            sp = tree.get('m_Sprite')
            if sp and sp.get('m_PathID') == 327:
                go_pid = tree['m_GameObject']['m_PathID']
                go = level1.objects[go_pid].read()
                print(f"GO '{go.m_Name}' (pid={go_pid}) uses floor_1_2")
                for cp in go.m_Components:
                    c_obj = cp.deref()
                    c_type = c_obj.type.name
                    if c_type in ['Transform', 'RectTransform']:
                        c = c_obj.read()
                        if c_type == 'Transform':
                            print(f"  Transform: pos=({c.m_LocalPosition.x}, {c.m_LocalPosition.y}, {c.m_LocalPosition.z}) scale=({c.m_LocalScale.x}, {c.m_LocalScale.y}, {c.m_LocalScale.z})")
                        else:
                            print(f"  RectTransform: pos=({c.m_AnchoredPosition.x}, {c.m_AnchoredPosition.y}) size=({c.m_SizeDelta.x}, {c.m_SizeDelta.y}) anchors=[({c.m_AnchorMin.x},{c.m_AnchorMin.y})-({c.m_AnchorMax.x},{c.m_AnchorMax.y})]")
        except Exception as e:
            print('err:', e)
