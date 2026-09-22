import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Search wasm for occurrences of CanBuy or FoodShop
wasm_path = r'cdn_assets/Build/siyangruchong.wasm'

with open(wasm_path, 'rb') as f:
    data = f.read()

print(f'Total wasm length: {len(data)}')

# Let's search for "CanBuy" or "BuyFood" in data
for term in [b'BuyFood', b'CanBuy', b'PerformAction', b'TableDropDeliverySystem', b'deliverySystem', b'Breadcrumb']:
    idx = 0
    matches = []
    while True:
        pos = data.find(term, idx)
        if pos == -1: break
        matches.append(pos)
        idx = pos + len(term)
    print(f'Term {term.decode()}: {len(matches)} matches: {matches[:5]}')
