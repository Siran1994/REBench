import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')
env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
level1 = [a for a in env.assets if a.name == 'level1'][0]

for pid in [1311, 1314]:
    obj = level1.objects[pid]
    sr = obj.read_typetree()
    go = level1.objects[sr['m_GameObject']['m_PathID']].read()
    print(f"SpriteRenderer {pid} on '{go.m_Name}':")
    print(f"  SortingLayerID={sr.get('m_SortingLayerID')}, SortingOrder={sr.get('m_SortingOrder')}")
    print(f"  Color={sr.get('m_Color')}, Material={sr.get('m_Materials')}")
