import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

rt_obj = asset.objects[2333].read()
print('ActiveAbilitiesPanel RectTransform:')
print('  m_AnchorMin:', rt_obj.m_AnchorMin)
print('  m_AnchorMax:', rt_obj.m_AnchorMax)
print('  m_AnchoredPosition:', rt_obj.m_AnchoredPosition)
print('  m_SizeDelta:', rt_obj.m_SizeDelta)
print('  m_Pivot:', rt_obj.m_Pivot)

rt_list = asset.objects[3317].read()
print('AbilityList RectTransform:')
print('  m_AnchorMin:', rt_list.m_AnchorMin)
print('  m_AnchorMax:', rt_list.m_AnchorMax)
print('  m_AnchoredPosition:', rt_list.m_AnchoredPosition)
print('  m_SizeDelta:', rt_list.m_SizeDelta)
print('  m_Pivot:', rt_list.m_Pivot)
