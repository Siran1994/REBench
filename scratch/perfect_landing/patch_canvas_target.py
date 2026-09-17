"""
修复 findEventTarget 的 fallback 策略

上一轮修复中 findEventTarget 在找不到目标时 fallback 到 window，
导致 _emscripten_webgl_do_create_context 拿到的 canvas 是全局对象(window),
而 window 没有 getContext 方法,直接崩溃。

正确的 fallback:
- 对于 findCanvasEventTarget 调用: 应该 fallback 到 Module.canvas (真正的画布)
- 对于事件监听调用: window 作为 fallback 是合理的

策略: 
1. findEventTarget 不做 window fallback (还原)
2. findCanvasEventTarget 单独实现: 找不到时 fallback 到 Module.canvas
3. registerOrRemoveHandler 中已有 null-guard, 事件监听 target=null 时安全跳过
"""

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# --- Fix 1: Revert findEventTarget's window fallback ---
old_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);if(!domElement&&typeof window!=="undefined"){domElement=window}return domElement}'

new_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);return domElement}'

if old_find in fw:
    fw = fw.replace(old_find, new_find)
    print("[OK] Reverted findEventTarget window fallback")
else:
    print("[WARN] findEventTarget pattern with window fallback not found")
    # Check if it still has original
    if 'if(!domElement&&typeof window!=="undefined"){domElement=window}' in fw:
        print("[INFO] Pattern exists but context differs")
    else:
        print("[INFO] May already be correct or different pattern")

# --- Fix 2: Make findCanvasEventTarget fallback to Module.canvas ---
old_canvas_target = 'function findCanvasEventTarget(target){return findEventTarget(target)}'
new_canvas_target = 'function findCanvasEventTarget(target){var el=findEventTarget(target);if(!el&&typeof Module!=="undefined"&&Module["canvas"]){el=Module["canvas"]}return el}'

if old_canvas_target in fw:
    fw = fw.replace(old_canvas_target, new_canvas_target)
    print("[OK] Patched findCanvasEventTarget with Module.canvas fallback")
else:
    print("[WARN] findCanvasEventTarget pattern not found")

# --- Fix 3: Ensure GL.createContext logs the real canvas info ---
# Already done in previous patch, just verify
if 'typeof canvas.getContext' in fw:
    print("[OK] GL.createContext diagnostic logging already present")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# ============================================================
# Sync to app-dist
# ============================================================
import shutil, os

src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'

for rel in ['Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')

print("\n=== 修复完成 ===")
