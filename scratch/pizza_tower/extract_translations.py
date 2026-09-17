import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

loc_path = 'reverse/pizza-tower-tt-minigame/data/localisation.json'
with open(loc_path, 'r', encoding='utf-8') as f:
    loc = json.load(f)

en = loc.get('en', {})
zh = loc.get('zh', {})

def flatten(d, prefix=''):
    items = []
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten(v, key))
        else:
            items.append((key, v))
    return items

en_items = dict(flatten(en))
zh_items = dict(flatten(zh))

print(f"Total keys: {len(en_items)}")
for k, en_val in en_items.items():
    zh_val = zh_items.get(k, '')
    print(f"KEY: {k}")
    print(f"  EN: {en_val}")
    print(f"  ZH (Current): {zh_val}")
