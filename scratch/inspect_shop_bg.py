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

print('=== Searching for ShopFrame sprite in sharedassets ===')
shop_frame_sprite_id = None
for asset in env.assets:
    for obj in asset.objects.values():
        if obj.type.name == 'Sprite':
            try:
                sp = obj.read()
                if sp.m_Name == 'ShopFrame':
                    print(f"Found ShopFrame in {asset.name} (pid={obj.path_id})")
                    shop_frame_sprite_id = (asset.name, obj.path_id)
            except Exception:
                pass

print('\n=== Finding all GameObjects in level1 that have components with "Shop" or "Frame" or "BG" ===')
for obj in level1.objects.values():
    if obj.type.name == 'GameObject':
        go = obj.read()
        name = go.m_Name
        if any(k in name for k in ['Shop', 'Shops', 'CurrentBG', 'BGS', 'RoomBGS', 'Frame', 'Board']):
            print(f"GO {name} (pid={obj.path_id}):")
            for cp in go.m_Components:
                c_obj = cp.deref()
                c = c_obj.read()
                c_type = c_obj.type.name
                if c_type == 'RectTransform':
                    print(f"  RectTransform (pid={c_obj.path_id}): Pos=({c.m_AnchoredPosition.x:.1f}, {c.m_AnchoredPosition.y:.1f}) Size=({c.m_SizeDelta.x:.1f}, {c.m_SizeDelta.y:.1f}) Anchors=[({c.m_AnchorMin.x:.2f},{c.m_AnchorMin.y:.2f})-({c.m_AnchorMax.x:.2f},{c.m_AnchorMax.y:.2f})] Pivot=({c.m_Pivot.x:.2f},{c.m_Pivot.y:.2f})")
                elif c_type == 'Transform':
                    print(f"  Transform (pid={c_obj.path_id}): Pos=({c.m_LocalPosition.x:.2f}, {c.m_LocalPosition.y:.2f}, {c.m_LocalPosition.z:.2f}) Scale=({c.m_LocalScale.x:.2f}, {c.m_LocalScale.y:.2f}, {c.m_LocalScale.z:.2f})")
                else:
                    spr = getattr(c, 'm_Sprite', None)
                    script = getattr(c, 'm_Script', None)
                    sc_name = ''
                    if script and script.m_PathID != 0:
                        try:
                            sc_name = script.deref().read().m_ClassName
                        except Exception:
                            pass
                    sp_name = ''
                    if spr and spr.m_PathID != 0:
                        try:
                            sp_name = spr.deref().read().m_Name
                        except Exception:
                            pass
                    print(f"  {c_type} (pid={c_obj.path_id}): script={sc_name} sprite={sp_name}")
