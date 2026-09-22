import gzip
import re

fw_src = "extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb"
with gzip.open(fw_src, "rt", encoding="utf-8", errors="replace") as f:
    code = f.read()

print(f"Original framework.js length: {len(code)}")

# Check pattern 1: abort("no native wasm support detected")
p1 = re.findall(r'if\s*\(\s*typeof\s+WebAssembly\s*!=\s*["\']object["\']\s*\)\s*abort\([^)]+\);?', code)
print(f"Pattern 1 (Wasm check): found {len(p1)}")

# Check pattern 2: lengthBytesUTF8
p2 = re.findall(r'function\s+lengthBytesUTF8\s*\([^)]*\)\s*\{', code)
print(f"Pattern 2 (lengthBytesUTF8): found {len(p2)}")

# Check pattern 3: stringToUTF8Array
p3 = re.findall(r'function\s+stringToUTF8Array\s*\([^)]*\)\s*\{', code)
print(f"Pattern 3 (stringToUTF8Array): found {len(p3)}")

# Check pattern 4: getRandomDevice
p4 = re.findall(r'function\s+getRandomDevice\s*\([^)]*\)\s*\{', code)
print(f"Pattern 4 (getRandomDevice): found {len(p4)}")

# Check pattern 5: _JS_SystemInfo_GetCanvasClientSize
p5 = re.findall(r'function\s+_JS_SystemInfo_GetCanvasClientSize\s*\([^)]*\)\s*\{', code)
print(f"Pattern 5 (_JS_SystemInfo_GetCanvasClientSize): found {len(p5)}")

# Check pattern 6: unityFileSystemInit
p6 = re.findall(r'function\s+unityFileSystemInit\s*\([^)]*\)\s*\{', code)
print(f"Pattern 6 (unityFileSystemInit): found {len(p6)}")
