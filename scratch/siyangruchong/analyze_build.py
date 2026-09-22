import gzip
import re

# Decompress framework.js
fw_gz_path = "extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb"
with gzip.open(fw_gz_path, "rt", encoding="utf-8", errors="replace") as f:
    fw_content = f.read()

print("Framework JS length:", len(fw_content))

# Look for Unity version
ver_match = re.search(r"(\d+\.\d+\.\d+[a-z0-9]*)", fw_content[:5000])
if ver_match:
    print("Potential Unity version in header:", ver_match.group(0))

# Search for SDKs or bridge symbols
sdks = ["CrazySDK", "PokiSDK", "GameDistribution", "gamedistribution", "crazygames", "poki", "yandex", "Yandex", "instant", "FBInstant"]
for sdk in sdks:
    matches = len(re.findall(re.escape(sdk), fw_content))
    if matches > 0:
        print(f"Found SDK reference: {sdk} (count: {matches})")

# Check common Emscripten / Unity WebGL methods
methods = [
    "_JS_SystemInfo_GetCanvasClientSize",
    "_JS_SystemInfo_GetDocumentURL",
    "unityFileSystemInit",
    "JS_FileSystem_Mount",
    "randomDevice",
    "deinitializers",
    "SystemInfo",
    "webglContextAttributes",
    "createPanner",
    "abort",
    "SendMessage",
    "invoke_iiii"
]
for m in methods:
    if m in fw_content:
        print(f"Method present: {m}")

# Check loader.js
with open("extracted/siyangruchong_package/Build/siyangruchong.loader.js", "r", encoding="utf-8", errors="replace") as f:
    loader_content = f.read()

loader_ver = re.search(r"UnityLoader|Unity\s*(\d+\.\d+\.\d+)", loader_content)
print("Loader info:", loader_ver.group(0) if loader_ver else "no direct version match")
match_unity = re.search(r"unityVersion\s*:\s*[\"']([^\"']+)[\"']", loader_content)
if match_unity:
    print("Unity version in loader:", match_unity.group(1))
