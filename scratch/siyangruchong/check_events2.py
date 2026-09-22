with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('function registerTouchEventCallback')
idx2 = content.find('function registerWheelEventCallback')
print('=== registerTouchEventCallback FULL ===')
print(content[idx1:idx2])

idx3 = content.find('function registerMouseEventCallback')
print('=== registerMouseEventCallback FULL ===')
print(content[idx3:idx1])
