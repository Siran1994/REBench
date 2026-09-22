import UnityPy
from UnityPy.files import ObjectReader

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

go = level1.objects[716].read()
print('GO ActiveAbilityManager components:')
for c_ref in go.m_Components:
    comp = c_ref.deref().read()
    print('  Comp:', type(comp).__name__, getattr(comp, 'm_Script', None))
    # print raw fields
    for k in dir(comp):
        if not k.startswith('_') and k not in ['type', 'assets_file', 'object_reader']:
            val = getattr(comp, k)
            if not callable(val):
                print(f'    {k} = {val}')
