import gzip
import struct
import os

data_path = "extracted/siyangruchong_package/Build/siyangruchong.data.unityweb"
out_dir = "extracted/siyangruchong_package/unpacked_unityweb"
os.makedirs(out_dir, exist_ok=True)

with gzip.open(data_path, "rb") as f:
    buf = f.read()

print(f"Read {len(buf)} bytes")
assert buf.startswith(b"UnityWebData1.0")

header_len = struct.unpack("<I", buf[16:20])[0]
pos = 20
files = []
while pos < header_len:
    offset, length, path_len = struct.unpack("<III", buf[pos:pos+12])
    pos += 12
    rel_path = buf[pos:pos+path_len].decode("utf-8", errors="replace")
    pos += path_len
    files.append((rel_path, offset, length))

print(f"Extracting {len(files)} files into {out_dir}:")
for rel_path, offset, length in files:
    target = os.path.join(out_dir, rel_path)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "wb") as out_f:
        out_f.write(buf[offset:offset+length])
    print(f"  Extracted: {rel_path} ({length} bytes)")

print("Done unpacking!")
