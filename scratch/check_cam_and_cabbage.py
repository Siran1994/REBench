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

# 检查相机参数
cam = level1.objects[1266].read()
cam_tr = level1.objects[1217].read()
print(f"相机位置: ({cam_tr.m_LocalPosition.x}, {cam_tr.m_LocalPosition.y}, {cam_tr.m_LocalPosition.z})")
print(f"相机 orthographic size: {cam.orthographic_size}")

# 当前 TableVisual 参数
tv_tr = level1.objects[1207].read()
print(f"当前 TableVisual Pos: ({tv_tr.m_LocalPosition.x}, {tv_tr.m_LocalPosition.y}, {tv_tr.m_LocalPosition.z})")
print(f"当前 TableVisual Scale: ({tv_tr.m_LocalScale.x}, {tv_tr.m_LocalScale.y}, {tv_tr.m_LocalScale.z})")

# 测量当前截图中的菜叶边界:
# 截图尺寸 992 x 593
# 当前菜叶范围 (在 Scale = (0.810, 0.927, 0.850), Pos.y = -0.190 下):
# 红色方框: Left=169, Right=736 (宽=567), Top=124, Bottom=505 (高=381)
# 中心: X=452.5, Y=314.5
