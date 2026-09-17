"""
修复画布渲染分辨率: canvas.width/height = 3 (devicePixelRatio)
应该是 screenWidth * devicePixelRatio = 852*3 = 2556

问题可能出在:
1. adapter 的 canvas.width 赋值被忽略
2. framework 的 _emscripten_set_canvas_element_size 覆盖为错误值

修复:
1. 在 _emscripten_set_canvas_element_size 中加日志 + 最小值保护
2. 在 adapter 中强制用 Object.defineProperty 设置 canvas.width/height
3. 在 framework 初始化完成后重新设置 canvas 尺寸
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# 1. Patch _emscripten_set_canvas_element_size with logging + minimum size guard
old_set_size = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;canvas.width=width;canvas.height=height;return 0}'

new_set_size = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;console.log("[Canvas SetSize] requested:",width,"x",height);if(width<16||height<16){var cw=canvas.clientWidth||window.innerWidth||852;var ch=canvas.clientHeight||window.innerHeight||393;var dpr=window.devicePixelRatio||1;var fw=Math.max(cw,ch)*dpr;var fh=Math.min(cw,ch)*dpr;console.warn("[Canvas SetSize] Too small! Overriding to:",fw,"x",fh);width=fw;height=fh}canvas.width=width;canvas.height=height;return 0}'

if old_set_size in fw:
    fw = fw.replace(old_set_size, new_set_size)
    print("[OK] Patched _emscripten_set_canvas_element_size with min-size guard")
else:
    print("[WARN] _emscripten_set_canvas_element_size pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# 2. Patch adapter to ensure canvas dimensions are properly set
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# Find the canvas dimension setting in ensureCanvasPolyfill
# Current code:
#   cvs.width = screenWidth * pixelRatio;
#   cvs.height = screenHeight * pixelRatio;
old_canvas_dim = """    cvs.width = screenWidth * pixelRatio;
    cvs.height = screenHeight * pixelRatio;"""

new_canvas_dim = """    // 强制设置画布渲染分辨率（防止 tt.createCanvas 返回的 canvas 忽略赋值）
    var targetW = screenWidth * pixelRatio;
    var targetH = screenHeight * pixelRatio;
    console.log('[Canvas Init] Setting canvas:', targetW, 'x', targetH, '(screen:', screenWidth, 'x', screenHeight, 'dpr:', pixelRatio, ')');
    cvs.width = targetW;
    cvs.height = targetH;
    // 如果赋值被忽略（getter-only），尝试 defineProperty
    if (cvs.width !== targetW || cvs.height !== targetH) {
      console.warn('[Canvas Init] Direct assignment failed! width:', cvs.width, 'height:', cvs.height, 'Trying defineProperty...');
      try {
        Object.defineProperty(cvs, 'width', { value: targetW, writable: true, configurable: true });
        Object.defineProperty(cvs, 'height', { value: targetH, writable: true, configurable: true });
      } catch(e) {
        console.warn('[Canvas Init] defineProperty also failed:', e.message);
      }
    }
    console.log('[Canvas Init] Final canvas:', cvs.width, 'x', cvs.height);"""

if old_canvas_dim in adapter:
    adapter = adapter.replace(old_canvas_dim, new_canvas_dim)
    print("[OK] Patched adapter canvas dimension setting with verification")
else:
    print("[WARN] Adapter canvas dimension pattern not found")
    # Check if already partially modified
    if 'targetW = screenWidth * pixelRatio' in adapter:
        print("[INFO] May already be patched")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("[OK] Saved tt-unity-adapter.js")

# Validate
import subprocess
for f in [fw_path, adapter_path]:
    result = subprocess.run(['node', '-c', f], capture_output=True, text=True)
    name = f.split('\\')[-1][:30]
    print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax: {name}")

# Sync all
import shutil, os
src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'
for rel in ['adapter/tt-unity-adapter.js', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
