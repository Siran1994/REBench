import UnityPy
import sys

sys.stdout.reconfigure(encoding='utf-8')

bundle_path = "extracted/siyangruchong_package/unpacked_unityweb/data.unity3d"
env = UnityPy.load(bundle_path)

type_counts = {}
names = {}
for obj in env.objects:
    t = str(obj.type)
    type_counts[t] = type_counts.get(t, 0) + 1
    if t in ["MonoBehaviour", "TextAsset", "Font", "Shader", "Texture2D", "Sprite", "AudioClip"]:
        try:
            d = obj.read()
            n = getattr(d, "name", "")
            if n:
                if t not in names:
                    names[t] = []
                names[t].append(n)
        except Exception:
            pass

print("Object type counts:")
for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {t}: {count}")

for t in ["Font", "AudioClip", "TextAsset"]:
    if t in names:
        print(f"\n{t} assets ({len(names[t])}):")
        for n in sorted(set(names[t])):
            print(f"  - {n}")
