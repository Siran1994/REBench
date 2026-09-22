with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('function findEventTarget(')
print(content[idx:idx+400])

idx_rect = content.find('function getBoundingClientRect(')
print(content[idx_rect:idx_rect+400])

idx_mouse = content.find('function fillMouseEventData(')
print(content[idx_mouse:idx_mouse+600])
