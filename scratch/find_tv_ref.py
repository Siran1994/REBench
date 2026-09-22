import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

for obj in level1.objects.values():
    if obj.type.name == 'MonoBehaviour':
        try:
            tree = obj.read_typetree()
            s = str(tree)
            if '1310' in s or '1207' in s:
                go_id = tree.get('m_GameObject', {}).get('m_PathID')
                go_name = 'unknown'
                if go_id and go_id in level1.objects:
                    go_name = level1.objects[go_id].read().m_Name
                print(f'Ref in MB pid={obj.path_id} on GO {go_name}')
                # find which field
                for k, v in tree.items():
                    if '1310' in str(v) or '1207' in str(v):
                        print(f'  field: {k} -> {v}')
        except:
            pass
