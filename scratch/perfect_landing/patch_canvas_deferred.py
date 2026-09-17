"""
修复策略:
1. 移除 _emscripten_set_canvas_element_size 中的最小尺寸 guard (让 Unity 初始化正常走)
2. 保留日志记录所有 canvas size 调用
3. 在 Browser.mainLoop 开始后，确保 canvas 尺寸被正确设置
4. 添加 postRun hook，在 Unity 启动完成后强制设置正确的画布尺寸
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# 1. Replace the guarded _emscripten_set_canvas_element_size with logging-only version
old_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;console.log("[Canvas SetSize] requested:",width,"x",height);if(width<16||height<16){var cw=canvas.clientWidth||window.innerWidth||852;var ch=canvas.clientHeight||window.innerHeight||393;var dpr=window.devicePixelRatio||1;var fw=Math.max(cw,ch)*dpr;var fh=Math.min(cw,ch)*dpr;console.warn("[Canvas SetSize] Too small! Overriding to:",fw,"x",fh);width=fw;height=fh}canvas.width=width;canvas.height=height;return 0}'

new_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;console.log("[Canvas SetSize] requested:",width,"x",height);canvas.width=width;canvas.height=height;return 0}'

if old_set in fw:
    fw = fw.replace(old_set, new_set)
    print("[OK] Removed min-size guard from _emscripten_set_canvas_element_size")
else:
    print("[WARN] Guarded pattern not found")

# 2. Find and patch setMainLoop to force canvas resize after main loop starts
old_mainloop = 'Browser.mainLoop.runner=function Browser_mainLoop_runner(){'
new_mainloop = 'Browser.mainLoop.runner=function Browser_mainLoop_runner(){if(!Browser.mainLoop._canvasFixed&&Module["canvas"]){Browser.mainLoop._canvasFixed=true;var cw=Module["canvas"].clientWidth||window.innerWidth||852;var ch=Module["canvas"].clientHeight||window.innerHeight||393;var dpr=window.devicePixelRatio||1;var rw=Math.round(Math.max(cw,ch)*dpr);var rh=Math.round(Math.min(cw,ch)*dpr);if(Module["canvas"].width<rw||Module["canvas"].height<rh){console.log("[MainLoop CanvasFix] Resizing from:",Module["canvas"].width,"x",Module["canvas"].height,"to:",rw,"x",rh);Module["canvas"].width=rw;Module["canvas"].height=rh;if(typeof GLctx!=="undefined"&&GLctx){GLctx.viewport(0,0,rw,rh)}}}' 

if old_mainloop in fw:
    fw = fw.replace(old_mainloop, new_mainloop)
    print("[OK] Added canvas fix to Browser_mainLoop_runner")
else:
    print("[WARN] Browser_mainLoop_runner pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# Validate
import subprocess
result = subprocess.run(['node', '-c', fw_path], capture_output=True, text=True)
print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax check")
if result.returncode != 0:
    print(result.stderr[:500])

# Sync
import shutil, os
src = fw_path
dst = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
if os.path.exists(os.path.dirname(dst)):
    shutil.copy2(src, dst)
    print('[SYNC] framework.js -> app-dist')
