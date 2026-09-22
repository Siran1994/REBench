import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's test reading, modifying, and saving RectTransform using UnityPy
data_path = r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
env = UnityPy.load(data_path)

asset = [a for a in env.assets if a.name == 'level1'][0]
rt_obj = asset.objects[2333].read()
print(f'Original AnchoredPosition: {rt_obj.m_AnchoredPosition.x}, {rt_obj.m_AnchoredPosition.y}')

# Modify
rt_obj.m_AnchoredPosition.y = 200.0
rt_obj.save()
print(f'Modified AnchoredPosition: {rt_obj.m_AnchoredPosition.x}, {rt_obj.m_AnchoredPosition.y}')

# Let's see if env.file.save() works
# Or asset.save()
try:
    with open(r'scratch/siyangruchong/test_saved.unity3d', 'wb') as f:
        f.write(env.file.save())
    print('✅ Saved successfully!')
    
    # Reload and verify
    env2 = UnityPy.load(r'scratch/siyangruchong/test_saved.unity3d')
    asset2 = [a for a in env2.assets if a.name == 'level1'][0]
    rt_obj2 = asset2.objects[2333].read()
    print(f'Reloaded AnchoredPosition: {rt_obj2.m_AnchoredPosition.x}, {rt_obj2.m_AnchoredPosition.y}')
except Exception as e:
    print(f'Err: {e}')
