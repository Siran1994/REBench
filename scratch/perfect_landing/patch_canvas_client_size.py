import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Fix _JS_SystemInfo_GetCanvasClientSize to force landscape
old_canvas_size = 'function _JS_SystemInfo_GetCanvasClientSize(domElementSelector,outWidth,outHeight){var selector=UTF8ToString(domElementSelector);var canvas=selector=="#canvas"?Module["canvas"]:document.querySelector(selector);var w=0,h=0;if(canvas){var size=canvas.getBoundingClientRect();w=size.width;h=size.height}HEAPF64[o'

# Need to see the full function first
idx = fw.find('_JS_SystemInfo_GetCanvasClientSize')
if idx != -1:
    snippet = fw[idx:idx+500]
    print("Full function:")
    print(snippet.encode('ascii', 'replace').decode('ascii'))
    print()

# Do a targeted replace
old_func = 'function _JS_SystemInfo_GetCanvasClientSize(domElementSelector,outWidth,outHeight){var selector=UTF8ToString(domElementSelector);var canvas=selector=="#canvas"?Module["canvas"]:document.querySelector(selector);var w=0,h=0;if(canvas){var size=canvas.getBoundingClientRect();w=size.width;h=size.height}HEAPF64[outWidth>>3]=w;HEAPF64[outHeight>>3]=h}'

new_func = 'function _JS_SystemInfo_GetCanvasClientSize(domElementSelector,outWidth,outHeight){var selector=UTF8ToString(domElementSelector);var canvas=selector=="#canvas"?Module["canvas"]:document.querySelector(selector);var w=0,h=0;if(canvas){var size=canvas.getBoundingClientRect();w=size.width;h=size.height}var sw=Math.max(w,h);var sh=Math.min(w,h);HEAPF64[outWidth>>3]=sw;HEAPF64[outHeight>>3]=sh}'

if old_func in fw:
    fw = fw.replace(old_func, new_func)
    print("[OK] Patched _JS_SystemInfo_GetCanvasClientSize to force landscape")
    with open(fw_path, 'w', encoding='utf-8') as f:
        f.write(fw)
    print("[OK] Saved")
    
    import subprocess
    result = subprocess.run(['node', '-c', fw_path], capture_output=True, text=True)
    print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax check")
    
    import shutil, os
    src = fw_path
    dst = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
    if os.path.exists(os.path.dirname(dst)):
        shutil.copy2(src, dst)
        print('[SYNC] framework.js -> app-dist')
else:
    print("[WARN] Pattern not found exactly")
