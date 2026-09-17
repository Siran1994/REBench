import os

adapter_path = r'd:/Desktop/REBench/reverse/perfect-landing-tt-minigame/adapter/tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# 1. Add requestAnimationFrame and cancelAnimationFrame polyfills
raf_target = "  root.innerWidth = screenWidth;"
raf_code = """  // requestAnimationFrame / cancelAnimationFrame 垫片
  root.requestAnimationFrame = root.requestAnimationFrame || (typeof tt !== 'undefined' && tt.requestAnimationFrame ? tt.requestAnimationFrame.bind(tt) : null) || function (cb) { return setTimeout(cb, 16); };
  root.cancelAnimationFrame = root.cancelAnimationFrame || (typeof tt !== 'undefined' && tt.cancelAnimationFrame ? tt.cancelAnimationFrame.bind(tt) : null) || function (id) { clearTimeout(id); };
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame = root.requestAnimationFrame;
    window.cancelAnimationFrame = root.cancelAnimationFrame;
  }
"""

if 'requestAnimationFrame' not in adapter:
    adapter = adapter.replace(raf_target, raf_code + "\n" + raf_target, 1)
    print("Added requestAnimationFrame polyfill")

# 2. Add getContext fallback in ensureCanvasPolyfill
cvs_target = "    if (!cvs.focus) cvs.focus = function () {};"
cvs_patch = """    // WebGL 上下文降级保障 (webgl2 -> webgl -> experimental-webgl)
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
    }
"""

if 'WebGL 上下文降级保障' not in adapter:
    adapter = adapter.replace(cvs_target, cvs_patch + "\n" + cvs_target, 1)
    print("Added getContext fallback in ensureCanvasPolyfill")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("Saved updated tt-unity-adapter.js")
