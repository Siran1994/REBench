import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
sheet5 = d[6][5] # SpineData

print("Sheet 5 Name:", sheet5[0])
events = sheet5[1]
print("Number of root events:", len(events))

def inspect_event(ev, indent=0):
    cnds = ev[5] if len(ev) > 5 and isinstance(ev[5], list) else []
    acts = ev[6] if len(ev) > 6 and isinstance(ev[6], list) else []
    subs = ev[7] if len(ev) > 7 and isinstance(ev[7], list) else []
    prefix = "  " * indent
    # Print conditions
    cnd_summaries = []
    for c in cnds:
        # Check if function call
        cnd_str = str(c)
        cnd_summaries.append(cnd_str[:60])
    if cnd_summaries:
        print(f"{prefix}CNDS: {cnd_summaries}")
    for a in acts:
        obj_idx = a[0]
        act_idx = a[1]
        obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"sys_{obj_idx}"
        params = a[5] if len(a) > 5 else []
        print(f"{prefix}ACT: {obj_name} ({obj_idx}) act={act_idx} params={str(params)[:80]}")
    for s in subs:
        if isinstance(s, list) and len(s) >= 8:
            inspect_event(s, indent + 1)

for ev in events:
    if isinstance(ev, list) and len(ev) >= 8:
        inspect_event(ev)
