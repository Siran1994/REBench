import UnityPy
from UnityPy.files import ObjectReader
import sys

sys.stdout.reconfigure(encoding='utf-8')

orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

env = UnityPy.load(r'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d')

for asset in env.assets:
    for obj in asset.objects.values():
        raw = obj.get_raw_data()
        # 259 as uint32/int64: 259 = 0x0103 = 03 01 00 00
        if b'\x03\x01\x00\x00' in raw:
            go_name = ''
            try:
                tree = obj.read_typetree()
                go_ref = tree.get('m_GameObject')
                if go_ref and go_ref.get('m_PathID') in asset.objects:
                    go_name = asset.objects[go_ref.get('m_PathID')].read().m_Name
            except Exception:
                pass
            print(f"Asset '{asset.name}' obj pid={obj.path_id} ({obj.type.name}) GO='{go_name}' contains 259")
