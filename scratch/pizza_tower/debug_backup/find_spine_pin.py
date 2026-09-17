import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
sheet4 = d[6][4]

# Find where t81 (81), t147 (147), t88 (88) are created or handled
def find_spine_creation(node, path=""):
    if isinstance(node, list):
        if len(node) >= 6 and isinstance(node[0], int) and isinstance(node[1], int):
            # Check if creating 81, 147, 88
            if node[0] == -1 and node[1] == 132:
                created_obj = node[5][0][1]
                if created_obj in [81, 88, 147]:
                    print(f"Path: {path}")
                    print(f"  System Create {obj_types[created_obj][0]} ({created_obj}) on layer {node[5][1][1]}")
            # Check if Pin action
            if node[0] in [81, 88, 147]:
                print(f"  Action on {obj_types[node[0]][0]} ({node[0]}): act_id={node[1]}, params={node[5]}")
        for i, x in enumerate(node):
            find_spine_creation(x, f"{path}[{i}]")

find_spine_creation(sheet4, "IdleManager")
