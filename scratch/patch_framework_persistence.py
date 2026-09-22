import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

target_file = r'reverse/siyangruchong-tt-minigame/engine/framework.js'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_sync = 'function _JS_FileSystem_Sync(){fs.sync(false)}'
new_sync = 'function _JS_FileSystem_Sync(){fs.sync(false);try{var p=(typeof globalThis!=="undefined"&&globalThis.__miniGamePersistence)||(typeof window!=="undefined"&&window.__miniGamePersistence);if(p&&typeof p.sync==="function"){p.sync(FS,"PlayerPrefs.Save");}}catch(e){}}'

assert old_sync in content, "_JS_FileSystem_Sync target not found!"
content = content.replace(old_sync, new_sync, 1)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ framework.js patched successfully for persistence sync!')
