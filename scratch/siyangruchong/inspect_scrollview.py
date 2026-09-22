import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

# FoodScrollView is id=562
def print_children(go_id, depth=0):
    go = asset.objects[go_id].read()
    indent = '  ' * depth
    rt_pos = ''
    rt_size = ''
    for cp in go.m_Component:
        path_id = cp.component.path_id
        target = asset.objects.get(path_id)
        if target and target.type.name == 'RectTransform':
            rt = target.read()
            rt_pos = f'pos=({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y})'
            rt_size = f'size=({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y})'
            print(f'{indent}- {go.m_Name} (id={go_id}) {rt_pos} {rt_size}')
            for child_ptr in rt.m_Children:
                child_rt = child_ptr.read()
                child_go = child_rt.m_GameObject.read()
                print_children(child_rt.m_GameObject.path_id, depth + 1)
            return
    print(f'{indent}- {go.m_Name} (id={go_id})')

print('=== FoodScrollView Hierarchy ===')
print_children(562)
