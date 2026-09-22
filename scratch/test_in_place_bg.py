import os
import sys
import gzip
import struct
from PIL import Image
import UnityPy
from UnityPy.files import ObjectReader

sys.stdout.reconfigure(encoding='utf-8')

# 读取原始备份中的 sharedassets0.assets 中的 Texture2D PID 12
with gzip.open('extracted/siyangruchong_package/Build/siyangruchong.data.unityweb', 'rb') as f:
    buf = f.read()

header_len = struct.unpack('<I', buf[16:20])[0]
pos = 20
while pos < header_len:
    offset, length, path_len = struct.unpack('<III', buf[pos:pos+12])
    pos += 12
    rel_path = buf[pos:pos+path_len].decode('utf-8', errors='replace')
    pos += path_len
    if rel_path == 'data.unity3d':
        orig_unity3d_bytes = buf[offset:offset+length]
        break

env_orig = UnityPy.load(orig_unity3d_bytes)
sa0_orig = [a for a in env_orig.assets if a.name == 'sharedassets0.assets'][0]
obj_orig = sa0_orig.objects[12]
raw_orig = obj_orig.get_raw_data()
assert len(raw_orig) == 498244, f"原始 raw 长度异常: {len(raw_orig)}"

header_124 = raw_orig[:124]
prefix_4 = raw_orig[120:124]
prefix_len = struct.unpack('<I', prefix_4)[0]
assert prefix_len == 498078
tail_42 = raw_orig[124 + 498078:]
assert len(tail_42) == 42

print("✓ 原始 124 字节头部与 42 字节尾部提取成功")

# 从 bg.png 生成 9 级 mipmap
bg_path = 'reverse/siyangruchong-tt-minigame/bg.png'
base_img = Image.open(bg_path).convert('RGB')
assert base_img.size == (511, 244)

w, h = 511, 244
mip_bytes = bytearray()

for i in range(9):
    mw = max(1, w >> i)
    mh = max(1, h >> i)
    if i == 0:
        mip_img = base_img
    else:
        mip_img = base_img.resize((mw, mh), Image.Resampling.LANCZOS)
    
    # Unity OpenGL 格式上下翻转
    flipped = mip_img.transpose(Image.FLIP_TOP_BOTTOM)
    b = flipped.tobytes()
    assert len(b) == mw * mh * 3, f"Mip {i} 大小不符"
    mip_bytes.extend(b)
    print(f"  Mip {i}: {mw}x{mh} ({len(b)} 字节)")

assert len(mip_bytes) == 498078, f"总字节数 {len(mip_bytes)} != 498078"
print(f"✓ 9 级 Mipmap 生成完毕，总长度: {len(mip_bytes)} 字节")

# 拼接全新 raw 字节
new_raw = header_124 + bytes(mip_bytes) + tail_42
assert len(new_raw) == 498244, f"新 raw 长度 {len(new_raw)} != 498244"
print(f"✓ 新 raw 二进制数据构造完成，长度严格等于原始 498244 字节")
