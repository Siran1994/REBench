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

print('=== Root GameObjects in level1 ===')
for obj in level1.objects.values():
    if obj.type.name == 'GameObject':
        go = obj.read()
        for cp in go.m_Components:
            c_obj = cp.deref()
            if c_obj.type.name in ['Transform', 'RectTransform']:
                c = c_obj.read()
                father = getattr(c, 'm_Father', None)
                if not father or father.m_PathID == 0:
                    print(f"Root GO: {go.m_Name} (pid={obj.path_id}) type={c_obj.type.name}")
