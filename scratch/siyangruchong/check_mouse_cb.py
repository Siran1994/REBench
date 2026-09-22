import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect framework.js around JSEvents.mouseEvent and JSEvents.touchEvent
with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's see how fillMouseEventData is called
idx = content.find('function registerMouseEventCallback')
print(content[idx:idx+600])
