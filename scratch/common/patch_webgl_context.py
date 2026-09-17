"""
修复 WebGL context 创建失败 + deleteContext 崩溃

问题:
1. GL.createContext 中 canvas.getContext("webgl2"/webgl") 返回 null
   可能原因: webGLContextAttributes 包含非标准属性 (majorVersion) 导致小游戏引擎拒绝
2. _emscripten_webgl_destroy_context -> GL.deleteContext 中 GLctx 为 undefined 导致崩溃

修复:
1. GL.createContext: 清理掉非标准属性后再传给 getContext; 增加详细诊断日志
2. GL.deleteContext: 加 null-guard
3. adapter: 强化 canvas.getContext polyfill, 确保 webgl/webgl2 的兼容性
"""

# ============================================================
# Patch framework.js
# ============================================================
fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# --- 1. Fix GL.createContext: strip non-standard attrs before passing to getContext ---
old_create = 'createContext:function(canvas,webGLContextAttributes){var ctx=null;try{if(webGLContextAttributes&&webGLContextAttributes.majorVersion>1){ctx=canvas.getContext("webgl2",webGLContextAttributes)}}catch(e){}if(!ctx){try{ctx=canvas.getContext("webgl",webGLContextAttributes)||canvas.getContext("experimental-webgl",webGLContextAttributes)}catch(e){}}if(!ctx){console.error("[Unity WebGL] Failed to create WebGL context!");return 0;}console.log("[Unity WebGL] WebGL context created successfully!");var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}'

new_create = 'createContext:function(canvas,webGLContextAttributes){var ctx=null;var glAttrs={};if(webGLContextAttributes){for(var k in webGLContextAttributes){if(k!=="majorVersion"&&k!=="minorVersion"&&k!=="enableExtensionsByDefault"&&k!=="explicitSwapControl"){glAttrs[k]=webGLContextAttributes[k]}}}console.log("[Unity WebGL] Attempting context creation on canvas:",typeof canvas,"getContext:",typeof canvas.getContext);try{if(webGLContextAttributes&&webGLContextAttributes.majorVersion>1){ctx=canvas.getContext("webgl2",glAttrs);console.log("[Unity WebGL] webgl2 result:",ctx?"OK":"null")}}catch(e){console.warn("[Unity WebGL] webgl2 exception:",e)}if(!ctx){try{ctx=canvas.getContext("webgl",glAttrs);console.log("[Unity WebGL] webgl result:",ctx?"OK":"null")}catch(e){console.warn("[Unity WebGL] webgl exception:",e)}}if(!ctx){try{ctx=canvas.getContext("experimental-webgl",glAttrs);console.log("[Unity WebGL] experimental-webgl result:",ctx?"OK":"null")}catch(e){console.warn("[Unity WebGL] experimental-webgl exception:",e)}}if(!ctx){try{ctx=canvas.getContext("webgl");console.log("[Unity WebGL] webgl (no attrs) result:",ctx?"OK":"null")}catch(e){}}if(!ctx){try{ctx=canvas.getContext("webgl2");console.log("[Unity WebGL] webgl2 (no attrs) result:",ctx?"OK":"null")}catch(e){}}if(!ctx){console.error("[Unity WebGL] Failed to create WebGL context! Canvas type:",Object.prototype.toString.call(canvas),"Canvas keys:",Object.keys(canvas).slice(0,20).join(","));return 0}console.log("[Unity WebGL] WebGL context created successfully!");var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}'

if old_create in fw:
    fw = fw.replace(old_create, new_create)
    print("[OK] Patched GL.createContext with attr-cleaning and diagnostics")
else:
    print("[WARN] GL.createContext pattern not found")
    # Check if already partially patched
    if 'glAttrs[k]=webGLContextAttributes[k]' in fw:
        print("[INFO] May already be patched with glAttrs")
    elif 'canvas.getContext("webgl2",webGLContextAttributes)' in fw:
        print("[INFO] Found old-style without glAttrs")

# --- 2. Fix GL.deleteContext: null-guard GLctx access ---
old_delete = 'deleteContext:function(contextHandle){if(GL.currentContext===GL.contexts[contextHandle])GL.currentContext=null;if(typeof JSEvents=="object")JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);if(GL.contexts[contextHandle]&&GL.contexts[contextHandle].GLctx.canvas)GL.contexts[contextHandle].GLctx.canvas.GLctxObject=undefined;GL.contexts[contextHandle]=null}'

new_delete = 'deleteContext:function(contextHandle){if(!GL.contexts[contextHandle])return;if(GL.currentContext===GL.contexts[contextHandle])GL.currentContext=null;try{if(typeof JSEvents=="object"&&GL.contexts[contextHandle]&&GL.contexts[contextHandle].GLctx&&GL.contexts[contextHandle].GLctx.canvas)JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas)}catch(e){}try{if(GL.contexts[contextHandle]&&GL.contexts[contextHandle].GLctx&&GL.contexts[contextHandle].GLctx.canvas)GL.contexts[contextHandle].GLctx.canvas.GLctxObject=undefined}catch(e){}GL.contexts[contextHandle]=null}'

if old_delete in fw:
    fw = fw.replace(old_delete, new_delete)
    print("[OK] Patched GL.deleteContext with null-guard")
else:
    print("[WARN] GL.deleteContext pattern not found")
    if 'deleteContext:function(contextHandle){if(!GL.contexts[contextHandle])return' in fw:
        print("[INFO] Already patched")

# --- 3. Fix _emscripten_webgl_destroy_context: null-guard ---
old_destroy = 'function _emscripten_webgl_destroy_context(contextHandle){if(GL.currentContext==contextHandle)GL.currentContext=0;GL.deleteContext(contextHandle)}'
new_destroy = 'function _emscripten_webgl_destroy_context(contextHandle){if(contextHandle&&GL.currentContext==contextHandle)GL.currentContext=0;if(contextHandle)GL.deleteContext(contextHandle)}'

if old_destroy in fw:
    fw = fw.replace(old_destroy, new_destroy)
    print("[OK] Patched _emscripten_webgl_destroy_context with null-guard")
else:
    print("[WARN] _emscripten_webgl_destroy_context pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")


# ============================================================
# Patch adapter: improve canvas getContext
# ============================================================
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'

with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# Replace the getContext polyfill in ensureCanvasPolyfill
old_getctx = """    // WebGL 上下文降级保障 (webgl2 -> webgl -> experimental-webgl)
    const originalGetContext = cvs.getContext ? cvs.getContext.bind(cvs) : null;
    if (originalGetContext) {
      cvs.getContext = function (type, attrs) {
        let gl = null;
        try { gl = originalGetContext(type, attrs); } catch (e) {}
        if (!gl && (type === 'webgl2' || type === 'webgl')) {
          try { gl = originalGetContext('webgl', attrs) || originalGetContext('experimental-webgl', attrs); } catch (e) {}
        }
        return gl;
      };
    }"""

new_getctx = """    // WebGL 上下文降级保障 (webgl2 -> webgl -> experimental-webgl -> 无参数)
    const originalGetContext = cvs.getContext ? cvs.getContext.bind(cvs) : null;
    if (originalGetContext) {
      cvs.getContext = function (type, attrs) {
        // 清理非标准属性，防止小游戏引擎拒绝
        var cleanAttrs = undefined;
        if (attrs && typeof attrs === 'object') {
          cleanAttrs = {};
          var validKeys = ['alpha','antialias','depth','stencil','premultipliedAlpha',
            'preserveDrawingBuffer','powerPreference','failIfMajorPerformanceCaveat',
            'desynchronized'];
          for (var k in attrs) {
            if (validKeys.indexOf(k) !== -1) {
              cleanAttrs[k] = attrs[k];
            }
          }
        }
        var gl = null;
        // 尝试原始请求
        try { gl = originalGetContext(type, cleanAttrs); } catch (e) {
          console.warn('[Canvas getContext] Exception with', type, e.message);
        }
        // 降级链
        if (!gl && type === 'webgl2') {
          try { gl = originalGetContext('webgl', cleanAttrs); } catch (e) {}
        }
        if (!gl && (type === 'webgl2' || type === 'webgl')) {
          try { gl = originalGetContext('experimental-webgl', cleanAttrs); } catch (e) {}
        }
        // 最后尝试无属性
        if (!gl) {
          try { gl = originalGetContext('webgl'); } catch (e) {}
        }
        if (!gl) {
          try { gl = originalGetContext('webgl2'); } catch (e) {}
        }
        if (gl) {
          console.log('[Canvas getContext] Success with type:', type);
        } else {
          console.warn('[Canvas getContext] All attempts failed for type:', type);
        }
        return gl;
      };
    } else {
      console.warn('[Canvas] No native getContext available on canvas!');
    }"""

if old_getctx in adapter:
    adapter = adapter.replace(old_getctx, new_getctx)
    print("[OK] Patched adapter canvas getContext with attr-cleaning and full fallback")
else:
    print("[WARN] adapter getContext pattern not found")
    if 'cleanAttrs' in adapter:
        print("[INFO] May already be patched")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("[OK] Saved tt-unity-adapter.js")

# ============================================================
# Sync to app-dist
# ============================================================
import shutil, os

src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'

files_to_sync = [
    'adapter/tt-unity-adapter.js',
    'Build/0b14ddffb6d6867f4577189187985cab.framework.js',
]

for rel in files_to_sync:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
    else:
        print(f'[SKIP] {rel} (source or dest not found)')

print("\n=== 修复完成 ===")
