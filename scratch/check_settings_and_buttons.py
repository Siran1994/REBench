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

print('=== 1. SettingsButton ===')
# SettingsButton GO
for obj in level1.objects.values():
    if obj.type.name == 'GameObject':
        go = obj.read()
        if 'settingsbutton' in go.m_Name.lower() or go.m_Name == 'SettingsButton':
            print(f'GO: {go.m_Name} (PID={obj.path_id})')
            for c in go.m_Components:
                co = c.deref()
                if co.type.name == 'RectTransform':
                    rt = co.read()
                    print(f'  RectTransform: Pos=({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y}), Size=({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y}), Anchors=[({rt.m_AnchorMin.x},{rt.m_AnchorMin.y})-({rt.m_AnchorMax.x},{rt.m_AnchorMax.y})], Pivot=({rt.m_Pivot.x},{rt.m_Pivot.y})')
                    # check father
                    f_go = rt.m_Father.deref().read().m_GameObject.deref().read()
                    print(f'  Father: {f_go.m_Name}')

print('\n=== 2. Buttons (4 类别按钮) ===')
b_go = level1.objects[1064].read()
print(f'GO: {b_go.m_Name} (PID=1064)')
for c in b_go.m_Components:
    co = c.deref()
    if co.type.name == 'RectTransform':
        rt = co.read()
        print(f'  RectTransform: Pos=({rt.m_AnchoredPosition.x}, {rt.m_AnchoredPosition.y}), Size=({rt.m_SizeDelta.x}, {rt.m_SizeDelta.y}), Anchors=[({rt.m_AnchorMin.x},{rt.m_AnchorMin.y})-({rt.m_AnchorMax.x},{rt.m_AnchorMax.y})], Pivot=({rt.m_Pivot.x},{rt.m_Pivot.y})')
        f_go = rt.m_Father.deref().read().m_GameObject.deref().read()
        print(f'  Father: {f_go.m_Name}')
        print('  Children of Buttons:')
        for ch in rt.m_Children:
            ch_rt = ch.deref().read()
            ch_go = ch_rt.m_GameObject.deref().read()
            print(f'    {ch_go.m_Name}: Pos=({ch_rt.m_AnchoredPosition.x}, {ch_rt.m_AnchoredPosition.y}), Size=({ch_rt.m_SizeDelta.x}, {ch_rt.m_SizeDelta.y})')

print('\n=== 3. 木框 BG 与 Shops ===')
bg_rt = level1.objects[2951].read()
print(f'BG: Pos=({bg_rt.m_AnchoredPosition.x}, {bg_rt.m_AnchoredPosition.y}), Size=({bg_rt.m_SizeDelta.x}, {bg_rt.m_SizeDelta.y})')
