import UnityPy
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')
asset = [a for a in env.assets if a.name == 'level1'][0]

btn_raw = asset.objects[4449].get_raw_data()
print('Button raw length:', len(btn_raw))

# In Unity UI Selectable (which Button inherits from):
# m_GameObject: (4, 8) = 12
# m_Enabled: 1 + 3 = 4
# m_Script: (4, 8) = 12
# Total header = 28
# Selectable fields:
# m_Navigation:
#   m_Mode: int32 (4)
#   m_WrapAround: bool (1) + 3 padding
#   m_SelectOnUp: (4, 8) = 12
#   m_SelectOnDown: (4, 8) = 12
#   m_SelectOnLeft: (4, 8) = 12
#   m_SelectOnRight: (4, 8) = 12
# Total m_Navigation = 4 + 4 + 48 = 56 bytes
# m_Transition: int32 (4)
# m_Colors:
#   m_NormalColor: 4 floats (16)
#   m_HighlightedColor: 4 floats (16)
#   m_PressedColor: 4 floats (16)
#   m_SelectedColor: 4 floats (16)
#   m_DisabledColor: 4 floats (16)
#   m_ColorMultiplier: float (4)
#   m_FadeDuration: float (4)
# Total m_Colors = 88 bytes
# m_SpriteState:
#   m_HighlightedSprite: (4, 8) = 12
#   m_PressedSprite: (4, 8) = 12
#   m_SelectedSprite: (4, 8) = 12
#   m_DisabledSprite: (4, 8) = 12
# Total m_SpriteState = 48 bytes
# m_AnimationTriggers: 4 strings (or empty)
# m_Interactable: bool (1) + 3 padding
# m_TargetGraphic: (4, 8) = 12
# Button:
# m_OnClick: UnityEvent

# Let's inspect bytes from offset 28 to 312
print('Bytes 28 to 100:', list(btn_raw[28:100]))
