import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]

# Find actions with act_idx in [178, 215]
found_acts = []
def search_acts(node, path=""):
    if isinstance(node, list):
        if len(node) >= 6 and isinstance(node[0], int) and isinstance(node[1], int):
            if node[1] in [178, 215]:
                found_acts.append((path, node))
        for i, x in enumerate(node):
            search_acts(x, f"{path}[{i}]")

search_acts(d[6], "sheets")
print(f"Total LoadSkeleton / LoadRawSkeleton calls: {len(found_acts)}")
for path, act in found_acts:
    obj_idx = act[0]
    act_id = act[1]
    obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"obj_{obj_idx}"
    print(f"Path: {path}")
    print(f"  Object: {obj_name} ({obj_idx}), Action: {act_id}")
    print(f"  Params: {act[5]}")
