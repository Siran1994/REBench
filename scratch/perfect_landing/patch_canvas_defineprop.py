"""
核心修复：tt.createCanvas() 返回的 canvas 的 width/height 是只读 getter
无论怎么赋值都返回 devicePixelRatio (3)

修复方案：
1. adapter 中使用 Object.defineProperty 强制覆盖 canvas.width/height
2. framework 中的 _emscripten_set_canvas_element_size 也使用 Object.defineProperty
3. MainLoop 中的 canvas fix 也使用 Object.defineProperty
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ========== Patch adapter ==========
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

old_canvas_init = """    // 强制设置画布渲染分辨率（不使用 || 防止 tt.createCanvas 返回的默认小尺寸被保留）
    var targetCanvasW = Math.round(screenWidth * pixelRatio);
    var targetCanvasH = Math.round(screenHeight * pixelRatio);
    cvs.width = targetCanvasW;
    cvs.height = targetCanvasH;
    console.log('[Canvas Init] Set canvas render size:', cvs.width, 'x', cvs.height, '(screen:', screenWidth, 'x', screenHeight, 'dpr:', pixelRatio, ')');"""

new_canvas_init = """    // 强制设置画布渲染分辨率 - 使用 Object.defineProperty 覆盖只读 getter
    var targetCanvasW = Math.round(screenWidth * pixelRatio);
    var targetCanvasH = Math.round(screenHeight * pixelRatio);
    // 先尝试直接赋值
    cvs.width = targetCanvasW;
    cvs.height = targetCanvasH;
    // 检查是否生效
    if (cvs.width !== targetCanvasW || cvs.height !== targetCanvasH) {
      console.warn('[Canvas Init] Direct assignment FAILED (getter-only). Using defineProperty.');
      try {
        Object.defineProperty(cvs, 'width', { value: targetCanvasW, writable: true, configurable: true, enumerable: true });
        Object.defineProperty(cvs, 'height', { value: targetCanvasH, writable: true, configurable: true, enumerable: true });
      } catch (e) {
        console.error('[Canvas Init] defineProperty failed:', e.message);
        // 最后手段：创建一个包装 canvas 对象
        var origGetCtx = cvs.getContext ? cvs.getContext.bind(cvs) : null;
        cvs.__realWidth = targetCanvasW;
        cvs.__realHeight = targetCanvasH;
      }
    }
    console.log('[Canvas Init] Final canvas render size:', cvs.width, 'x', cvs.height, '(target:', targetCanvasW, 'x', targetCanvasH, ')');"""

if old_canvas_init in adapter:
    adapter = adapter.replace(old_canvas_init, new_canvas_init)
    print("[OK] Patched adapter with Object.defineProperty canvas fix")
else:
    print("[WARN] Adapter canvas init pattern not found")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("[OK] Saved adapter")

# ========== Patch framework ==========
fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Patch _emscripten_set_canvas_element_size to use defineProperty
old_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;console.log("[Canvas SetSize] requested:",width,"x",height);canvas.width=width;canvas.height=height;return 0}'

new_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;var dpr=window.devicePixelRatio||1;var cw=Math.max(window.innerWidth||852,window.innerHeight||393);var ch=Math.min(window.innerWidth||852,window.innerHeight||393);var minW=Math.round(cw*dpr);var minH=Math.round(ch*dpr);if(width<minW){width=minW}if(height<minH){height=minH}console.log("[Canvas SetSize] setting:",width,"x",height);try{Object.defineProperty(canvas,"width",{value:width,writable:true,configurable:true,enumerable:true});Object.defineProperty(canvas,"height",{value:height,writable:true,configurable:true,enumerable:true})}catch(e){canvas.width=width;canvas.height=height}return 0}'

if old_set in fw:
    fw = fw.replace(old_set, new_set)
    print("[OK] Patched _emscripten_set_canvas_element_size with defineProperty + min-size")
else:
    print("[WARN] _emscripten_set_canvas_element_size pattern not found")

# Also patch the MainLoop canvas fix to use defineProperty
old_fix = 'console.log("[MainLoop CanvasFix] Resizing from:",Module["canvas"].width,"x",Module["canvas"].height,"to:",rw,"x",rh);Module["canvas"].width=rw;Module["canvas"].height=rh;if(typeof GLctx!=="undefined"&&GLctx){GLctx.viewport(0,0,rw,rh)}'

new_fix = 'console.log("[MainLoop CanvasFix] Resizing from:",Module["canvas"].width,"x",Module["canvas"].height,"to:",rw,"x",rh);try{Object.defineProperty(Module["canvas"],"width",{value:rw,writable:true,configurable:true,enumerable:true});Object.defineProperty(Module["canvas"],"height",{value:rh,writable:true,configurable:true,enumerable:true})}catch(e){Module["canvas"].width=rw;Module["canvas"].height=rh}if(typeof GLctx!=="undefined"&&GLctx){GLctx.viewport(0,0,rw,rh)}'

if old_fix in fw:
    fw = fw.replace(old_fix, new_fix)
    print("[OK] Patched MainLoop CanvasFix with defineProperty")
else:
    print("[WARN] MainLoop CanvasFix pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# Validate
import subprocess
for f in [adapter_path, fw_path]:
    result = subprocess.run(['node', '-c', f], capture_output=True, text=True)
    name = f.split('\\')[-1][:30]
    print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax: {name}")
    if result.returncode != 0:
        print(result.stderr[:300])

# Sync
import shutil, os
src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'
for rel in ['adapter/tt-unity-adapter.js', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
