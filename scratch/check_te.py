import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

for pid in [4744, 4745]:
    mb = level1.objects[pid].read()
    sc = mb.m_Script.deref().read()
    sname = getattr(sc, 'm_ClassName', getattr(sc, 'm_Name', ''))
    print(f'PID {pid}: script={sname}')
    try:
        tree = level1.objects[pid].read_typetree()
        for k, v in tree.items():
            if k not in ['m_GameObject', 'm_Enabled', 'm_Script', 'm_Name']:
                print(f'  {k}: {v}')
    except Exception as e:
        print('  err:', e)
