import json

d = json.load(open('data/data.json', encoding='utf-8'))['project']
ev73 = d[6][4][1][73]
subs = ev73[7]
for i, s in enumerate(subs):
    cnds = s[5] if len(s) > 5 else []
    print(f"Sub {i}: {str(cnds)[:100]}")
    acts = s[6] if len(s) > 6 else []
    print(f"  acts count: {len(acts)}")
    subsubs = s[7] if len(s) > 7 else []
    print(f"  subsubs count: {len(subsubs)}")
