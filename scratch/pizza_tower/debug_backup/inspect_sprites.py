import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
for idx in [80, 87, 89, 108, 44, 93, 66, 67, 68, 71, 72, 75]:
    obj = obj_types[idx]
    print(f"Object {idx} ({obj[0]}): plugin {obj[1]}")
    anims = obj[8] if len(obj) > 8 else None
    if anims and isinstance(anims, list):
        for anim in anims:
            anim_name = anim[0]
            frames = anim[6] if len(anim) > 6 else []
            frame_imgs = [f[0] for f in frames if len(f) > 0]
            print(f"  Anim '{anim_name}': {frame_imgs}")
