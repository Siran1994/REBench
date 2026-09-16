import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
sheet4 = d[6][4]

with open('scripts/c2runtime.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
table_start = -1
for i, l in enumerate(lines):
    if 'cr.getObjectRefTable = function ()' in l:
        table_start = i
        break
ref_table = [l.strip().rstrip(',') for l in lines[table_start+1:table_start+500]]

def get_ref(idx):
    if 0 <= idx < len(ref_table):
        return ref_table[idx]
    return f"ref_{idx}"

def print_acts_on_spine(node):
    if isinstance(node, list):
        if len(node) >= 6 and isinstance(node[0], int) and isinstance(node[1], int):
            if node[0] in [81, 88, 147]:
                act_name = get_ref(node[1])
                print(f"Object {obj_types[node[0]][0]} ({node[0]}): {act_name}")
                print(f"  params: {node[5]}")
        for x in node:
            print_acts_on_spine(x)

print_acts_on_spine(sheet4)
