import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
sheet5 = d[6][5]
for ev in sheet5[1]:
    if ev[0] == 1 and ev[1] in ['JSON_CHEF_COOKING', 'JSON_CHEF_WALK', 'JSON_LIFT_MAN', 'JSON_FLOOR_MANAGER', 'JSON_PARKING_MANAGER']:
        skel = json.loads(ev[3])
        print(f"{ev[1]}: width={skel.get('skeleton', {}).get('width')}, height={skel.get('skeleton', {}).get('height')}")
