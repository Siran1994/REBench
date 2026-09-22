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

print('=== Searching for all Image components in level1 with their sprite and GO name ===')
for obj in level1.objects.values():
    if obj.type.name == 'MonoBehaviour':
        try:
            tree = obj.read_typetree()
            sc = tree.get('m_Script')
            if sc and sc.get('m_PathID'):
                # check if script is Image
                sc_obj = level1.objects.get(sc.get('m_PathID'))
                # Or check m_Sprite field
                if 'm_Sprite' in tree:
                    sp = tree.get('m_Sprite')
                    go_pid = tree['m_GameObject']['m_PathID']
                    go = level1.objects[go_pid].read()
                    sp_pid = sp.get('m_PathID') if sp else 0
                    print(f"GO '{go.m_Name}' (pid={go_pid}) Image m_Sprite=path_id:{sp_pid}")
        except Exception:
            pass
