import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_names = {i: d[3][i][0] for i in range(len(d[3]))}
spine_objs = {4: 't4', 5: 't5', 10: 't10', 32: 't32', 81: 't81', 88: 't88', 147: 't147', 165: 't165'}

# Let's inspect function names in UnitsManager
# Functions are often defined with condition [0, 38, None, 2, ...] where param is function name
def find_functions(node, path=""):
    if isinstance(node, list):
        if len(node) >= 4 and isinstance(node[0], list):
            # Check conditions
            cnds = node[0]
            # Wait, in C2 events: [is_subevent, variable_list, is_include, cnds, acts, subevents]
            pass
        for i, item in enumerate(node):
            find_functions(item, f"{path}[{i}]")
    elif isinstance(node, dict):
        pass

# Let's search string constants in UnitsManager
strings_in_units = []
def get_strings(node):
    if isinstance(node, str):
        strings_in_units.append(node)
    elif isinstance(node, list):
        for item in node:
            get_strings(item)

get_strings(d[6][6])
print("Sample strings in UnitsManager:")
print([s for s in set(strings_in_units) if any(k in s.lower() for k in ['chef', 'worker', 'manager', 'cashier', 'spawn', 'anim', 'skin', 'spine', 'load'])][:50])
