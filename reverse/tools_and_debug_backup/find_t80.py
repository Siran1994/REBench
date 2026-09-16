import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
sheet4 = d[6][4] # IdleManager

# Find all events in sheet4 that reference t80 or t87
def find_events_with_obj(node, target_obj, results):
    if isinstance(node, list):
        # check conditions or actions
        hit = False
        s = str(node)
        if f", {target_obj}," in s or f"[{target_obj}," in s or f" {target_obj}]" in s:
            hit = True
        # Let's inspect subevents
        if len(node) == 8 and isinstance(node[0], int) and isinstance(node[5], list):
            # C2 event
            cnds_str = str(node[5])
            acts_str = str(node[6])
            if f", {target_obj}," in cnds_str or f"[{target_obj}," in cnds_str or f", {target_obj}," in acts_str or f"[{target_obj}," in acts_str:
                results.append(node)
        for x in node:
            if isinstance(x, list):
                find_events_with_obj(x, target_obj, results)

res80 = []
find_events_with_obj(sheet4[1], 80, res80)
print(f"Total events mentioning t80 in IdleManager: {len(res80)}")

# Print subevents of Spawn_Worker / Refresh_Worker
for ev in res80:
    cnds = ev[5]
    acts = ev[6]
    # Check if there are function conditions or spawn actions
    for c in cnds:
        if len(c) > 8 and isinstance(c[8], list) and len(c[8]) > 0:
            for p in c[8]:
                if isinstance(p, list) and len(p) > 1 and isinstance(p[1], list) and len(p[1]) > 1:
                    val = p[1][1]
                    if isinstance(val, str):
                        print(f"Function/Trigger: {val}")
    for a in acts:
        # Check if action creates an object (act_id 132 is System Create Object)
        if a[0] == -1 and a[1] == 132:
            created_obj = a[4][0][1] if len(a) > 4 and len(a[4]) > 0 else '?'
            created_name = obj_types[created_obj][0] if isinstance(created_obj, int) and 0 <= created_obj < len(obj_types) else created_obj
            print(f"  --> System creates object: {created_name} ({created_obj})")
