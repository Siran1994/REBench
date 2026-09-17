import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
ev73 = d[6][4][1][73]
spawn_worker = ev73[7][0]
subsubs = spawn_worker[7]

print(f"Total subsubs in Spawn_Worker: {len(subsubs)}")
for i, ss in enumerate(subsubs):
    cnds = ss[5] if len(ss) > 5 else []
    acts = ss[6] if len(ss) > 6 else []
    print(f"--- Subsub {i} ---")
    print(f"  CNDS: {str(cnds)[:120]}")
    for a in acts:
        obj_idx = a[0]
        act_idx = a[1]
        obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"sys_{obj_idx}"
        print(f"    ACT: {obj_name} ({obj_idx}) act={act_idx} params={str(a[5])[:80]}")
    if len(ss) > 7 and len(ss[7]) > 0:
        print(f"    has {len(ss[7])} nested subevents")
        for j, nss in enumerate(ss[7]):
            n_acts = nss[6] if len(nss) > 6 else []
            for na in n_acts:
                obj_idx = na[0]
                act_idx = na[1]
                obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"sys_{obj_idx}"
                print(f"      NestedACT [{j}]: {obj_name} ({obj_idx}) act={act_idx} params={str(na[5])[:80]}")
