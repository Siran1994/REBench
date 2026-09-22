import UnityPy
from UnityPy.files import ObjectReader
import pprint

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load('extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level0 = [a for a in env.assets if a.name == 'level0'][0]

print("=== MonoBehaviour 86 (background) ===")
tree86 = level0.objects[86].read_typetree()
pprint.pprint(tree86)

print("\n=== MonoBehaviour 101 (title) ===")
tree101 = level0.objects[101].read_typetree()
pprint.pprint(tree101)
