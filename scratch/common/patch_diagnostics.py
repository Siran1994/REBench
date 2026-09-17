"""
添加关键诊断日志:
1. _JS_Eval_EvalJS: 打印被 eval 的字符串内容 + 执行结果
2. canvas 尺寸诊断
3. 方向检测诊断
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# 1. Enhanced _JS_Eval_EvalJS with detailed logging
old_eval = 'function _JS_Eval_EvalJS(ptr){var str=UTF8ToString(ptr);try{if(typeof eval==="function"){eval(str)}else{(new Function(str))()}}catch(exception){console.warn("[MiniGame] _JS_Eval_EvalJS skipped:",str.substring(0,100),exception.message)}}'

new_eval = 'function _JS_Eval_EvalJS(ptr){var str=UTF8ToString(ptr);console.log("[MiniGame EvalJS] code:",str.substring(0,200));try{if(typeof eval==="function"){eval(str);console.log("[MiniGame EvalJS] eval OK")}else{try{(new Function(str))();console.log("[MiniGame EvalJS] new Function OK")}catch(e2){console.warn("[MiniGame EvalJS] new Function failed:",e2.message)}}}catch(exception){console.warn("[MiniGame EvalJS] eval failed:",exception.message);try{(new Function(str))();console.log("[MiniGame EvalJS] fallback new Function OK")}catch(e3){console.warn("[MiniGame EvalJS] all methods failed:",e3.message)}}}'

if old_eval in fw:
    fw = fw.replace(old_eval, new_eval)
    print("[OK] Enhanced _JS_Eval_EvalJS with diagnostics")
else:
    print("[WARN] _JS_Eval_EvalJS pattern not found")

# 2. Add canvas dimension diagnostic to Browser_mainLoop_runner
# Actually, let's add it to the orientation handler instead since it runs regularly
old_orient = 'function JS_ScreenOrientation_eventHandler(){if(JS_ScreenOrientation_callback){var w=window.innerWidth||screen.width||1280;var h=window.innerHeight||screen.height||720;var sw=Math.max(w,h);var sh=Math.min(w,h);var angle=screen.orientation?screen.orientation.angle:(window.orientation||90);if(angle===0||angle===180){angle=90}dynCall_viii(JS_ScreenOrientation_callback,sw,sh,angle)}}'

new_orient = 'function JS_ScreenOrientation_eventHandler(){if(JS_ScreenOrientation_callback){var w=window.innerWidth||screen.width||1280;var h=window.innerHeight||screen.height||720;var sw=Math.max(w,h);var sh=Math.min(w,h);var angle=screen.orientation?screen.orientation.angle:(window.orientation||90);if(angle===0||angle===180){angle=90}if(!JS_ScreenOrientation_eventHandler._logged){JS_ScreenOrientation_eventHandler._logged=true;console.log("[Orientation Diag] raw w:",window.innerWidth,"h:",window.innerHeight,"forced sw:",sw,"sh:",sh,"angle:",angle);if(typeof Module!=="undefined"&&Module.canvas){console.log("[Canvas Diag] canvas.width:",Module.canvas.width,"canvas.height:",Module.canvas.height,"clientW:",Module.canvas.clientWidth,"clientH:",Module.canvas.clientHeight)}}dynCall_viii(JS_ScreenOrientation_callback,sw,sh,angle)}}'

if old_orient in fw:
    fw = fw.replace(old_orient, new_orient)
    print("[OK] Added orientation + canvas diagnostics")
else:
    print("[WARN] Orientation handler pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# Validate & Sync
import subprocess, shutil, os
result = subprocess.run(['node', '-c', fw_path], capture_output=True, text=True)
print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax check")

src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'
for rel in ['Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
