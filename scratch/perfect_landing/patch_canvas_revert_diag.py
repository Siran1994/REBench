"""
回退策略：
1. 移除所有 Object.defineProperty 对 canvas.width/height 的覆盖
2. 让 canvas 保持原生尺寸 (tt.createCanvas 返回的)
3. 在 adapter 中诊断 tt.createCanvas() 的原始返回值
4. 在 framework 中 _emscripten_set_canvas_element_size 只做日志
5. 移除 MainLoop canvas fix 的 defineProperty
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ========== Fix adapter ==========
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# Replace the overcomplicated canvas init with a simpler diagnostic version
old_canvas_init = """    // 强制设置画布渲染分辨率 - 使用 Object.defineProperty 覆盖只读 getter
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

new_canvas_init = """    // 诊断 tt.createCanvas 原始 canvas 属性
    var origW = cvs.width, origH = cvs.height;
    console.log('[Canvas Init] tt.createCanvas raw:', origW, 'x', origH);
    
    // 检查 width/height 属性描述符
    var wDesc = Object.getOwnPropertyDescriptor(cvs, 'width');
    var wProtoDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(cvs) || {}, 'width');
    console.log('[Canvas Init] width descriptor own:', JSON.stringify(wDesc), 'proto:', wProtoDesc ? 'has getter/setter' : 'none');
    
    // 尝试设置正确的尺寸
    var targetCanvasW = Math.round(screenWidth * pixelRatio);
    var targetCanvasH = Math.round(screenHeight * pixelRatio);
    console.log('[Canvas Init] Target:', targetCanvasW, 'x', targetCanvasH);
    
    // 尝试直接赋值
    cvs.width = targetCanvasW;
    cvs.height = targetCanvasH;
    console.log('[Canvas Init] After assignment:', cvs.width, 'x', cvs.height, '(success:', cvs.width === targetCanvasW, ')');
    
    // 如果失败，不要用 defineProperty（会破坏 WebGL），保持原生尺寸
    if (cvs.width !== targetCanvasW) {
      console.warn('[Canvas Init] Cannot resize canvas. Using native size:', cvs.width, 'x', cvs.height);
    }"""

if old_canvas_init in adapter:
    adapter = adapter.replace(old_canvas_init, new_canvas_init)
    print("[OK] Replaced adapter canvas init with diagnostic version")
else:
    print("[WARN] Adapter canvas init pattern not found - trying alternative")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("[OK] Saved adapter")

# ========== Fix framework ==========
fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Replace the defineProperty version of _emscripten_set_canvas_element_size with simple logging
old_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;var dpr=window.devicePixelRatio||1;var cw=Math.max(window.innerWidth||852,window.innerHeight||393);var ch=Math.min(window.innerWidth||852,window.innerHeight||393);var minW=Math.round(cw*dpr);var minH=Math.round(ch*dpr);if(width<minW){width=minW}if(height<minH){height=minH}console.log("[Canvas SetSize] setting:",width,"x",height);try{Object.defineProperty(canvas,"width",{value:width,writable:true,configurable:true,enumerable:true});Object.defineProperty(canvas,"height",{value:height,writable:true,configurable:true,enumerable:true})}catch(e){canvas.width=width;canvas.height=height}return 0}'

new_set = 'function _emscripten_set_canvas_element_size(target,width,height){var canvas=findCanvasEventTarget(target);if(!canvas)return-4;console.log("[Canvas SetSize] requested:",width,"x",height,"current:",canvas.width,"x",canvas.height);canvas.width=width;canvas.height=height;console.log("[Canvas SetSize] after:",canvas.width,"x",canvas.height);return 0}'

if old_set in fw:
    fw = fw.replace(old_set, new_set)
    print("[OK] Simplified _emscripten_set_canvas_element_size")
else:
    print("[WARN] _emscripten_set_canvas_element_size pattern not found")

# Remove defineProperty from MainLoop fix
old_fix = 'try{Object.defineProperty(Module["canvas"],"width",{value:rw,writable:true,configurable:true,enumerable:true});Object.defineProperty(Module["canvas"],"height",{value:rh,writable:true,configurable:true,enumerable:true})}catch(e){Module["canvas"].width=rw;Module["canvas"].height=rh}'
new_fix = 'Module["canvas"].width=rw;Module["canvas"].height=rh'

if old_fix in fw:
    fw = fw.replace(old_fix, new_fix)
    print("[OK] Simplified MainLoop CanvasFix")

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
        print(result.stderr[:500])

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
