import UnityPy
from UnityPy.enums import ClassIDType
import sys

sys.stdout.reconfigure(encoding='utf-8')

bundle_path = "extracted/siyangruchong_package/unpacked_unityweb/data.unity3d"
env = UnityPy.load(bundle_path)

for obj in env.objects:
    if obj.type in [ClassIDType.Font, ClassIDType.AudioClip, ClassIDType.TextAsset, ClassIDType.Shader]:
        d = obj.read()
        print(f"[{obj.type.name}] {getattr(d, 'name', 'unnamed')}")

# Also check scenes in PlayerSettings or BuildSettings
for obj in env.objects:
    if obj.type == ClassIDType.BuildSettings:
        d = obj.read()
        print("\nScenes in BuildSettings:")
        for s in d.scenes:
            print("  Scene:", s)
    elif obj.type == ClassIDType.PlayerSettings:
        d = obj.read()
        print(f"\nPlayerSettings: companyName={d.companyName}, productName={d.productName}, defaultScreenOrientation={d.defaultScreenOrientation}")
