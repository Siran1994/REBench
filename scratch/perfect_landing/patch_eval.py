"""
修复 _JS_Eval_EvalJS: 字节跳动小游戏环境禁用了 eval()
使用 new Function() 作为替代, 如果也被禁止则安全吞掉
同时修复 _JS_Eval_OpenURL (window.open 在小游戏中不存在)
"""

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Fix _JS_Eval_EvalJS
old_eval = 'function _JS_Eval_EvalJS(ptr){var str=UTF8ToString(ptr);try{eval(str)}catch(exception){console.error(exception)}}'
new_eval = 'function _JS_Eval_EvalJS(ptr){var str=UTF8ToString(ptr);try{if(typeof eval==="function"){eval(str)}else{(new Function(str))()}}catch(exception){console.warn("[MiniGame] _JS_Eval_EvalJS skipped:",str.substring(0,100),exception.message)}}'

if old_eval in fw:
    fw = fw.replace(old_eval, new_eval)
    print("[OK] Patched _JS_Eval_EvalJS")
else:
    print("[WARN] _JS_Eval_EvalJS pattern not found")

# Fix _JS_Eval_OpenURL
old_open = 'function _JS_Eval_OpenURL(ptr){var str=UTF8ToString(ptr);window.open(str,"_blank","")}'
new_open = 'function _JS_Eval_OpenURL(ptr){var str=UTF8ToString(ptr);try{if(typeof window!=="undefined"&&window.open){window.open(str,"_blank","")}else{console.log("[MiniGame] OpenURL:",str)}}catch(e){}}'

if old_open in fw:
    fw = fw.replace(old_open, new_open)
    print("[OK] Patched _JS_Eval_OpenURL")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

import subprocess
result = subprocess.run(['node', '-c', fw_path], capture_output=True, text=True)
print("[OK] Syntax check passed" if result.returncode == 0 else f"[ERROR] {result.stderr}")

import shutil, os
src = os.path.join(r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js')
dst = os.path.join(r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js')
if os.path.exists(src) and os.path.exists(os.path.dirname(dst)):
    shutil.copy2(src, dst)
    print('[SYNC] framework.js -> app-dist')
