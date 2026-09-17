import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
sheet5 = d[6][5]

for i, ev in enumerate(sheet5[1]):
    print(f"--- Event {i} (len {len(ev)}) ---")
    for j, val in enumerate(ev):
        print(f"  [{j}] {type(val).__name__}: {str(val)[:80]}")
    if i >= 4: break
