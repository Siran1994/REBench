import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
sheet4 = d[6][4] # IdleManager

# Find events with "hire_manager" or manager hiring
def find_text_events(node, search_str):
    if isinstance(node, list):
        if len(node) >= 7 and isinstance(node[5], list) and isinstance(node[6], list):
            s = str(node)
            if search_str in s:
                print(f"=== Event with '{search_str}' ===")
                print(f"CNDS: {node[5]}")
                print(f"ACTS: {node[6]}")
        for x in node:
            find_text_events(x, search_str)

find_text_events(sheet4, "hire_manager")
