import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
for l_idx, layout in enumerate(d[5]):
    l_name = layout[0]
    layers = layout[6]
    print(f"Layout {l_name} has {len(layers)} layers")
    for layer in layers:
        print(f"  Layer {layer[0]} (len {len(layer)}): {[type(x).__name__ for x in layer]}")
        # find where instances are in layer
        for idx, item in enumerate(layer):
            if isinstance(item, list) and len(item) > 0 and isinstance(item[0], list):
                # check if items look like instances
                sample = item[0]
                if len(sample) >= 6:
                    types = [x[1] for x in item if len(x) >= 2 and isinstance(x[1], int)]
                    spine_types = [t for t in types if t in [4, 5, 10, 32, 81, 88, 147, 165]]
                    if spine_types:
                        print(f"    layer[{idx}] has spine types: {spine_types}")
