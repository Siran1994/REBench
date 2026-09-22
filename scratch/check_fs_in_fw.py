with open('reverse/siyangruchong-tt-minigame/engine/framework.js', 'r', encoding='utf-8') as f:
    text = f.read()

print('Module.FS in text:', 'Module.FS' in text)
print('Module["FS"] in text:', 'Module["FS"]' in text)
print('FS in text:', 'FS' in text)
print('FS_createPath in text:', 'FS_createPath' in text)

# find where FS is defined in framework.js
idx = text.find('var FS=')
print('var FS= at:', idx)
if idx != -1:
    print(text[idx : idx+200])
