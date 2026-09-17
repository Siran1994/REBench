import UnityPy
import sys
import os
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

bundle_path = r'D:\Desktop\REBench\extracted\perfect_landing_plane_pilot_package\unpacked_unityweb\data.unity3d'
env = UnityPy.load(bundle_path)

type_counts = Counter()
named_objects = []

for obj in env.objects:
    type_counts[obj.type.name] += 1
    if obj.type.name in ('MonoBehaviour', 'GameObject', 'TextAsset', 'AudioClip', 'Texture2D', 'Shader'):
        try:
            data = obj.read()
            name = getattr(data, 'name', '') or getattr(data, 'm_Name', '')
            if name:
                named_objects.append((obj.type.name, name))
        except Exception:
            pass

print("=== Asset Types in data.unity3d ===")
for t, c in type_counts.most_common(20):
    print(f"  {t:25s}: {c}")

print(f"\nTotal Objects: {len(env.objects)}")

# Categorize and print interesting assets
print("\n=== Scenes & GameObjects / MonoBehaviours ===")
for t, n in named_objects:
    if t == 'TextAsset':
        print(f"  [TextAsset] {n}")

print("\n=== Audio Clips ===")
audio_clips = [n for t, n in named_objects if t == 'AudioClip']
print(f"  Total Audio: {len(audio_clips)}")
for a in audio_clips[:20]:
    print(f"  - {a}")

print("\n=== Internal Files in data.unity3d ===")
for f in env.files.keys():
    print(' ', f)

for obj in env.objects:
    if obj.type.name in ('PlayerSettings', 'BuildSettings', 'EditorBuildSettings'):
        try:
            d = obj.read()
            print(f"\n[{obj.type.name}]")
            for attr in ['companyName', 'productName', 'bundleVersion', 'scenes', 'levels']:
                if hasattr(d, attr):
                    print(f"  {attr}: {getattr(d, attr)}")
        except Exception as e:
            print(f"  Error reading {obj.type.name}: {e}")

