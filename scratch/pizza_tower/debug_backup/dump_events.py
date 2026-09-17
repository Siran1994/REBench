import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
obj_types = d[3]
sheet4 = d[6][4] # IdleManager

# Let's inspect events in sheet4
# C2 event structure:
# [is_subevent (0 or 1), group_name/None, is_group, parent_id, event_id, conditions, actions, subevents]
def dump_function_events(events, target_fn):
    found = False
    for ev in events:
        # Check if event defines target_fn
        # condition for OnFunction is typically [plugin_idx, 0, None, 2, False, False, False, id, False, [[param_type, [2, fn_name]]]]
        ev_str = str(ev)
        if target_fn in ev_str:
            print(f"=== Found {target_fn} ===")
            # Pretty print conditions and actions
            print("Event length:", len(ev))
            if len(ev) >= 7:
                cnds = ev[5] if isinstance(ev[5], list) else []
                acts = ev[6] if isinstance(ev[6], list) else []
                subs = ev[7] if len(ev) > 7 and isinstance(ev[7], list) else []
                print(f"Conditions: {cnds}")
                print(f"Actions count: {len(acts)}")
                for a in acts:
                    obj_idx = a[0]
                    act_idx = a[1]
                    obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"sys/obj_{obj_idx}"
                    print(f"  Act on {obj_name} ({obj_idx}), act_id {act_idx}: {a[5] if len(a) > 5 else a}")
                print(f"Subevents count: {len(subs)}")
                for sub in subs:
                    sub_acts = sub[6] if len(sub) > 6 and isinstance(sub[6], list) else []
                    print(f"  Sub conditions: {sub[5] if len(sub) > 5 else []}")
                    for sa in sub_acts:
                        obj_idx = sa[0]
                        act_idx = sa[1]
                        obj_name = obj_types[obj_idx][0] if 0 <= obj_idx < len(obj_types) else f"sys/obj_{obj_idx}"
                        print(f"    SubAct on {obj_name} ({obj_idx}), act_id {act_idx}: {sa[5] if len(sa) > 5 else sa}")

dump_function_events(sheet4[1], "Spawn_Worker")
dump_function_events(sheet4[1], "Spawn_Manager")
