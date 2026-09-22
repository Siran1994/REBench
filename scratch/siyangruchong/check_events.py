import re

with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    content = f.read()

events = set(re.findall(r'addEventListener\(["\']([a-zA-Z0-9_\-]+)["\']', content))
print('Events in framework.js:', sorted(list(events)))

# Check registerTouchEventCallback callers
for m in re.finditer(r'registerTouchEventCallback', content):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 150)
    print('Found registerTouchEventCallback around:', content[start:end])

# Check registerMouseEventCallback callers
for m in re.finditer(r'registerMouseEventCallback', content):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 150)
    print('Found registerMouseEventCallback around:', content[start:end])
