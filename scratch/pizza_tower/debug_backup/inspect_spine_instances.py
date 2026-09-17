import json

with open('data/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)['project']

for layout in d[7]:
    layout_name = layout[0]
    layers = layout[1]
    for layer in layers:
        layer_name = layer[0]
        instances = layer[2]
        for inst in instances:
            obj_idx = inst[1]
            if obj_idx in [4, 5, 10, 32, 81, 88, 147, 165]:
                print(f"Layout '{layout_name}', Layer '{layer_name}': obj {obj_idx} at ({inst[2]}, {inst[3]}), size ({inst[4]}, {inst[5]})")
