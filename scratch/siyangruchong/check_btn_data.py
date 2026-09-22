import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

# MB 4449 is the Button on BreadcrumbBuyButton
btn_obj = asset.objects[4449]
raw = btn_obj.get_raw_data()
print(f'Button raw len: {len(raw)}')

# Let's inspect the Button fields
# In Unity UI Button:
# Selectable fields:
# m_Script (12)
# m_Name (string)
# m_Navigation
# m_Transition
# m_Colors
# m_SpriteState
# m_AnimationTriggers
# m_Interactable (bool)
# m_TargetGraphic
# Button fields:
# m_OnClick (UnityEvent)
# Let's check m_Interactable and m_OnClick!
