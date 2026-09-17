import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']

names = ['chef_cooking', 'chef_walk', 'elevator_manager', 'floor_manager', 'cashier', 'delivery_man', 'general_manager', 'mine_worker', 'parking_manager']

for idx, sheet in enumerate(d[6]):
    s = str(sheet)
    found = [n for n in names if n in s]
    if found:
        print(f"Sheet {idx} ({sheet[0]}): {found}")

# Also check layout initial instances (d[5])
for idx, layout in enumerate(d[5]):
    s = str(layout)
    found = [n for n in names if n in s]
    if found:
        print(f"Layout {idx} ({layout[0]}): {found}")
