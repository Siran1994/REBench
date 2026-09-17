"""
让 findEventTarget 在找不到目标时 fallback 到 Module.canvas

Module.canvas (来自 adapter 的 mainCanvas) 同时具备:
- getContext (WebGL 上下文) 
- addEventListener (事件监听)

这样所有 Emscripten 事件注册函数 (keydown/keyup/wheel/mouse/touch 等) 
都不会因为 target=null 而崩溃，WebGL 上下文创建也能正确获取画布。
"""

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Patch findEventTarget to fallback to Module.canvas (NOT window)
old_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);return domElement}'

new_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);if(!domElement&&typeof Module!=="undefined"&&Module["canvas"]){domElement=Module["canvas"]}return domElement}'

if old_find in fw:
    fw = fw.replace(old_find, new_find)
    print("[OK] Patched findEventTarget with Module.canvas fallback")
else:
    print("[WARN] findEventTarget pattern not found - checking variants")
    if 'Module["canvas"]}{domElement=Module["canvas"]}' in fw:
        print("[INFO] Already has Module.canvas fallback")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# Verify syntax
import subprocess
result = subprocess.run(['node', '-c', fw_path], capture_output=True, text=True)
if result.returncode == 0:
    print("[OK] Syntax check passed")
else:
    print("[ERROR] Syntax check failed:", result.stderr)

# Sync
import shutil, os
src = os.path.join(r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js')
dst = os.path.join(r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js')
if os.path.exists(src) and os.path.exists(os.path.dirname(dst)):
    shutil.copy2(src, dst)
    print('[SYNC] framework.js -> app-dist')
