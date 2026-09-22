import gzip
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

src_path = "extracted/siyangruchong_package/Build/siyangruchong.framework.js.unityweb"
out_path = "reverse/siyangruchong-tt-minigame/engine/framework.js"

with gzip.open(src_path, "rt", encoding="utf-8", errors="replace") as f:
    content = f.read()

print(f"Original framework length: {len(content)}")

# 1. Top prepend: safe BOM / DOM / WASM / AbortController / SDK Shims
top_shim = """
// --- Antigravity MiniGame Security Shim ---
var window = typeof window !== 'undefined' ? window : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof globalThis !== 'undefined' ? globalThis : self));
var document = (window && window.document) || (typeof document !== 'undefined' ? document : {});
var navigator = (window && window.navigator) || (typeof navigator !== 'undefined' ? navigator : {
  userAgent: 'Mozilla/5.0 MiniGame',
  platform: 'iPhone',
  mediaDevices: null,
  languages: ['zh-CN', 'en'],
  getGamepads: function() { return []; },
  permissions: { query: function() { return Promise.resolve({ state: 'granted' }); } }
});
var location = (window && window.location) || (typeof location !== 'undefined' ? location : {
  href: 'https://minigame.local/',
  protocol: 'https:',
  host: 'minigame.local',
  hostname: 'minigame.local',
  port: '',
  pathname: '/',
  search: '',
  hash: ''
});
var screen = (window && window.screen) || (typeof screen !== 'undefined' ? screen : {
  width: 960,
  height: 600,
  availWidth: 960,
  availHeight: 600,
  orientation: { type: 'landscape-primary', angle: 90 }
});
var performance = (window && window.performance) || (typeof performance !== 'undefined' ? performance : {
  now: function() { return Date.now(); }
});
var AudioContext = (window && window.AudioContext) || (typeof AudioContext !== 'undefined' ? AudioContext : function() {});
var WebGLRenderingContext = (window && window.WebGLRenderingContext) || (typeof WebGLRenderingContext !== 'undefined' ? WebGLRenderingContext : function() {});
var WebGL2RenderingContext = (window && window.WebGL2RenderingContext) || (typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext : function() {});

// WebAssembly 宿主环境桥接 (适配抖音小游戏 TTWebAssembly)
var WebAssembly = (typeof WebAssembly !== 'undefined' && WebAssembly)
  ? WebAssembly
  : ((typeof TTWebAssembly !== 'undefined' && TTWebAssembly)
    ? TTWebAssembly
    : ((typeof window !== 'undefined' && window.WebAssembly)
      ? window.WebAssembly
      : (typeof globalThis !== 'undefined' && globalThis.WebAssembly
        ? globalThis.WebAssembly
        : { RuntimeError: Error })));
if (typeof WebAssembly.RuntimeError === 'undefined') WebAssembly.RuntimeError = Error;

// AbortController / AbortSignal 纯 JS 垫片
class _MiniAbortSignal {
  constructor() {
    this.aborted = false;
    this.reason = undefined;
    this.onabort = null;
    this._listeners = [];
  }
  addEventListener(type, listener) {
    if (type === 'abort' && typeof listener === 'function' && !this._listeners.includes(listener)) {
      this._listeners.push(listener);
    }
  }
  removeEventListener(type, listener) {
    if (type === 'abort') {
      this._listeners = this._listeners.filter(l => l !== listener);
    }
  }
  dispatchEvent(event) {
    if (this.onabort && typeof this.onabort === 'function') {
      try { this.onabort(event); } catch (e) {}
    }
    for (const listener of this._listeners) {
      try { listener(event); } catch (e) {}
    }
    return true;
  }
  _triggerAbort(reason) {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason || new Error('The operation was aborted');
    const event = { type: 'abort', target: this, currentTarget: this };
    this.dispatchEvent(event);
  }
}

class _MiniAbortController {
  constructor() {
    this.signal = new _MiniAbortSignal();
  }
  abort(reason) {
    this.signal._triggerAbort(reason);
  }
}

var AbortController = (typeof AbortController !== 'undefined' && AbortController)
  ? AbortController
  : ((typeof window !== 'undefined' && window.AbortController)
    ? window.AbortController
    : (typeof globalThis !== 'undefined' && globalThis.AbortController
      ? globalThis.AbortController
      : _MiniAbortController));

var AbortSignal = (typeof AbortSignal !== 'undefined' && AbortSignal)
  ? AbortSignal
  : ((typeof window !== 'undefined' && window.AbortSignal)
    ? window.AbortSignal
    : (typeof globalThis !== 'undefined' && globalThis.AbortSignal
      ? globalThis.AbortSignal
      : _MiniAbortSignal));

(function() {
  var g = typeof window !== 'undefined' ? window : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof globalThis !== 'undefined' ? globalThis : {}));
  var safeStringify = function(ptr) {
    if (typeof ptr === 'string') return ptr;
    if (!ptr) return '';
    if (typeof UTF8ToString !== 'undefined') {
      try { return UTF8ToString(ptr); } catch (e) {}
    }
    return String(ptr);
  };
  if (typeof g.unityStringify === 'undefined') g.unityStringify = safeStringify;
  if (typeof window !== 'undefined') window.unityStringify = safeStringify;
  if (typeof globalThis !== 'undefined') globalThis.unityStringify = safeStringify;
  if (typeof GameGlobal !== 'undefined') GameGlobal.unityStringify = safeStringify;

  var safeUnitySDK = {
    version: '1.0',
    enableDebug: false,
    logError: function() { console.warn.apply(console, arguments); },
    log: function() { console.log.apply(console, arguments); },
    unlockPointer: function() {},
    lockPointer: function() {}
  };
  if (typeof g.UnitySDK === 'undefined') g.UnitySDK = safeUnitySDK;
  if (typeof window !== 'undefined') window.UnitySDK = safeUnitySDK;
  if (typeof globalThis !== 'undefined') globalThis.UnitySDK = safeUnitySDK;
  if (typeof GameGlobal !== 'undefined') GameGlobal.UnitySDK = safeUnitySDK;
})();
// ------------------------------------------
"""

# 2. Patch unityFramework entry - inject local scoped BOM, WebAssembly, AbortController bindings
old_fw_entry = 'function unityFramework(Module) {\nvar Module=typeof Module!=="undefined"?Module:{};'
if old_fw_entry not in content:
    old_fw_entry = 'function unityFramework(Module) {\r\nvar Module=typeof Module!=="undefined"?Module:{};'
if old_fw_entry not in content:
    assert 'function unityFramework(Module)' in content, "unityFramework entry not found"
    old_fw_entry = content[content.find('function unityFramework(Module)'):content.find('function unityFramework(Module)')+65]

new_fw_entry = """function unityFramework(Module) {
  var window = typeof window !== 'undefined' ? window : (typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof globalThis !== 'undefined' ? globalThis : self));
  var document = (window && window.document) || (typeof document !== 'undefined' ? document : {});
  var navigator = (window && window.navigator) || (typeof navigator !== 'undefined' ? navigator : { userAgent: 'Mozilla/5.0 MiniGame', platform: 'iPhone', mediaDevices: null, languages: ['zh-CN', 'en'], getGamepads: function() { return []; }, permissions: { query: function() { return Promise.resolve({ state: 'granted' }); } } });
  var location = (window && window.location) || (typeof location !== 'undefined' ? location : { href: 'https://minigame.local/', protocol: 'https:', host: 'minigame.local', hostname: 'minigame.local', port: '', pathname: '/', search: '', hash: '' });
  var screen = (window && window.screen) || (typeof screen !== 'undefined' ? screen : { width: 960, height: 600, availWidth: 960, availHeight: 600, orientation: { type: 'landscape-primary', angle: 90 } });
  var performance = (window && window.performance) || (typeof performance !== 'undefined' ? performance : { now: function() { return Date.now(); } });
  var AudioContext = (window && window.AudioContext) || (typeof AudioContext !== 'undefined' ? AudioContext : function() {});
  var WebGLRenderingContext = (window && window.WebGLRenderingContext) || (typeof WebGLRenderingContext !== 'undefined' ? WebGLRenderingContext : function() {});
  var WebGL2RenderingContext = (window && window.WebGL2RenderingContext) || (typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext : function() {});
  var WebAssembly = (typeof WebAssembly !== 'undefined' && WebAssembly)
    ? WebAssembly
    : ((typeof TTWebAssembly !== 'undefined' && TTWebAssembly)
      ? TTWebAssembly
      : ((typeof window !== 'undefined' && window.WebAssembly)
        ? window.WebAssembly
        : (typeof globalThis !== 'undefined' && globalThis.WebAssembly
          ? globalThis.WebAssembly
          : { RuntimeError: Error })));
  if (typeof WebAssembly.RuntimeError === 'undefined') WebAssembly.RuntimeError = Error;
  var AbortController = (typeof AbortController !== 'undefined' && AbortController)
    ? AbortController
    : ((typeof window !== 'undefined' && window.AbortController)
      ? window.AbortController
      : (typeof globalThis !== 'undefined' && globalThis.AbortController
        ? globalThis.AbortController
        : _MiniAbortController));
  var AbortSignal = (typeof AbortSignal !== 'undefined' && AbortSignal)
    ? AbortSignal
    : ((typeof window !== 'undefined' && window.AbortSignal)
      ? window.AbortSignal
      : (typeof globalThis !== 'undefined' && globalThis.AbortSignal
        ? globalThis.AbortSignal
        : _MiniAbortSignal));
  var Module = typeof Module !== 'undefined' ? Module : {};"""

assert old_fw_entry in content, f"old_fw_entry target not found: {old_fw_entry[:40]}"
content = content.replace(old_fw_entry, new_fw_entry, 1)
print("✅ unityFramework entry local scoped BOM, WebAssembly, AbortController bindings injected.")

# 3. Patch navigator.mediaDevices / location.protocol check
old_media = 'if(!navigator.mediaDevices){console.warn("navigator.mediaDevices not supported by this browser. Webcam access will not be available."+(location.protocol=="https:"?"":" Try hosting the page over HTTPS, because some browsers disable webcam access when insecure HTTP is being used."));disableAccessToMediaDevices()}'
new_media = 'if(!navigator||!navigator.mediaDevices){disableAccessToMediaDevices();}'
assert old_media in content, "navigator.mediaDevices target not found"
content = content.replace(old_media, new_media, 1)
print("✅ navigator.mediaDevices & location.protocol patched.")

# 4. Patch WebAssembly support detection (杜绝在 TTWebAssembly / 模块接管环境下报 no native wasm support detected)
old_wasm_check = 'if(typeof WebAssembly!=="object"){abort("no native wasm support detected")}'
new_wasm_check = 'if(typeof WebAssembly!=="object"&&typeof WebAssembly!=="function"&&typeof TTWebAssembly==="undefined"&&!Module["instantiateWasm"]){abort("no native wasm support detected")}'
assert old_wasm_check in content, "old_wasm_check target not found"
content = content.replace(old_wasm_check, new_wasm_check, 1)
print("✅ WebAssembly support detection patched.")

# 5. Patch _JS_WebRequest_Create (增加 AbortController 容灾)
old_wr_create = 'var abortController=new AbortController;'
new_wr_create = 'var abortController=(typeof AbortController==="function")?new AbortController():new _MiniAbortController();'
assert old_wr_create in content, "_JS_WebRequest_Create target not found"
content = content.replace(old_wr_create, new_wr_create, 1)
print("✅ _JS_WebRequest_Create AbortController patched.")

# 6. Patch randomDevice
old_rd = 'return function(){abort("randomDevice")}'
new_rd = 'return function(){return Math.floor(Math.random()*256);}'
assert old_rd in content, "randomDevice target not found"
content = content.replace(old_rd, new_rd, 1)
print("✅ randomDevice patched.")

# 7. Patch unityFileSystemInit fallback
old_fs = 'var unityFileSystemInit=Module["unityFileSystemInit"]||function(){FS.mkdir("/idbfs");FS.mount(IDBFS,{},"/idbfs");Module.addRunDependency("JS_FileSystem_Mount");FS.syncfs(true,function(err){if(err)console.log("IndexedDB is not available. Data will not persist in cache and PlayerPrefs will not be saved.");Module.removeRunDependency("JS_FileSystem_Mount")})};unityFileSystemInit()'
new_fs = 'var unityFileSystemInit=Module["unityFileSystemInit"]||function(){try{FS.mkdir("/idbfs");}catch(e){}console.log("[FS] /idbfs ready (auto-release)");};unityFileSystemInit()'
assert old_fs in content, "unityFileSystemInit target not found"
content = content.replace(old_fs, new_fs, 1)
print("✅ unityFileSystemInit patched.")

# 8. Patch _JS_SystemInfo_GetCanvasClientSize
old_canvas = 'function _JS_SystemInfo_GetCanvasClientSize(domElementSelector,outWidth,outHeight){var selector=UTF8ToString(domElementSelector);var canvas=selector=="#canvas"?Module["canvas"]:document.querySelector(selector);var w=0,h=0;if(canvas){var size=canvas.getBoundingClientRect();w=size.width;h=size.height}HEAPF64[outWidth>>3]=w;HEAPF64[outHeight>>3]=h}'
new_canvas = 'function _JS_SystemInfo_GetCanvasClientSize(domElementSelector,outWidth,outHeight){var selector=UTF8ToString(domElementSelector);var canvas=Module["canvas"]||document.querySelector(selector)||(typeof window!=="undefined"&&window.__mainCanvas);var w=0,h=0;if(canvas){w=canvas.width||(canvas.getBoundingClientRect?canvas.getBoundingClientRect().width:0);h=canvas.height||(canvas.getBoundingClientRect?canvas.getBoundingClientRect().height:0);if(!w||!h){w=canvas.clientWidth||(typeof window!=="undefined"&&window.innerWidth)||960;h=canvas.clientHeight||(typeof window!=="undefined"&&window.innerHeight)||600;}}HEAPF64[outWidth>>3]=w;HEAPF64[outHeight>>3]=h;}'
assert old_canvas in content, "_JS_SystemInfo_GetCanvasClientSize target not found"
content = content.replace(old_canvas, new_canvas, 1)
print("✅ _JS_SystemInfo_GetCanvasClientSize patched.")

# 9. Patch lengthBytesUTF8
old_len = 'function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){'
new_len = 'function lengthBytesUTF8(str){if(str==null)return 0;str=String(str);var len=0;for(var i=0;i<str.length;++i){'
assert old_len in content, "lengthBytesUTF8 target not found"
content = content.replace(old_len, new_len, 1)
print("✅ lengthBytesUTF8 patched.")

# 10. Patch stringToUTF8Array
old_str_arr = 'function stringToUTF8Array(str,heap,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;'
new_str_arr = 'function stringToUTF8Array(str,heap,outIdx,maxBytesToWrite){if(str==null)str="";else str=String(str);if(!(maxBytesToWrite>0))return 0;'
assert old_str_arr in content, "stringToUTF8Array target not found"
content = content.replace(old_str_arr, new_str_arr, 1)
print("✅ stringToUTF8Array patched.")

# 11. Patch SendMessage
old_sm = 'function SendMessage(gameObject,func,param){if(param===undefined)Module.ccall("SendMessage",null,["string","string"],[gameObject,func]);else if(typeof param==="string")Module.ccall("SendMessageString",null,["string","string","string"],[gameObject,func,param]);else if(typeof param==="number")Module.ccall("SendMessageFloat",null,["string","string","number"],[gameObject,func,param]);else throw""+param+" is does not have a type which is supported by SendMessage."}'
new_sm = 'function SendMessage(gameObject,func,param){if(param===undefined||param===null||param===""||(typeof func==="string"&&(func.indexOf("AdFinished")!==-1||func.indexOf("AdStarted")!==-1||func.indexOf("Init")!==-1)))Module.ccall("SendMessage",null,["string","string"],[gameObject,func]);else if(typeof param==="string")Module.ccall("SendMessageString",null,["string","string","string"],[gameObject,func,param]);else if(typeof param==="number")Module.ccall("SendMessageFloat",null,["string","string","number"],[gameObject,func,param]);else Module.ccall("SendMessage",null,["string","string"],[gameObject,func]);}'
assert old_sm in content, "SendMessage target not found"
content = content.replace(old_sm, new_sm, 1)
print("✅ SendMessage patched.")

# 12. Patch specialHTMLTargets
old_targets = 'var specialHTMLTargets=[0,typeof document!=="undefined"?document:0,typeof window!=="undefined"?window:0];'
new_targets = 'var specialHTMLTargets=[typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:0),typeof document!=="undefined"?document:0,typeof window!=="undefined"?window:0];'
assert old_targets in content, "specialHTMLTargets target not found"
content = content.replace(old_targets, new_targets, 1)
print("✅ specialHTMLTargets patched.")

# 13. Patch findEventTarget
old_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!=="undefined"?document.querySelector(target):undefined);return domElement}'
new_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!=="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);if(!domElement){if(target===0||target==="window"||target==="#window")domElement=typeof window!=="undefined"?window:null;else if(target===1||target==="document"||target==="#document")domElement=typeof document!=="undefined"?document:null;else if(target===2||target==="screen"||target==="#screen")domElement=typeof window!=="undefined"?window:null;else domElement=Module["canvas"]||(typeof window!=="undefined"&&window.__mainCanvas)||(typeof document!=="undefined"&&document.body)||null;}return domElement;}'
assert old_find in content, "findEventTarget target not found"
content = content.replace(old_find, new_find, 1)
print("✅ findEventTarget patched.")

# 14. Patch registerOrRemoveHandler
old_reg = 'registerOrRemoveHandler:function(eventHandler){var jsEventHandler=function jsEventHandler(event){++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=jsEventHandler;eventHandler.target.addEventListener(eventHandler.eventTypeString,jsEventHandler,eventHandler.useCapture);JSEvents.eventHandlers.push(eventHandler);JSEvents.registerRemoveEventListeners()}else{'
new_reg = 'registerOrRemoveHandler:function(eventHandler){var jsEventHandler=function jsEventHandler(event){if(event&&(event.type==="mousedown"||event.type==="mouseup"||event.type==="touchstart"||event.type==="touchend")){console.log("[Unity Input Recv]",event.type,"pos: ("+Math.round(event.clientX||0)+", "+Math.round(event.clientY||0)+")");}++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=jsEventHandler;var canvas=Module["canvas"]||(typeof window!=="undefined"&&window.__mainCanvas)||null;var targets=[eventHandler.target,canvas,typeof window!=="undefined"?window:null,typeof document!=="undefined"?document:null].filter(Boolean);var regSet=new Set();for(var ti=0;ti<targets.length;ti++){var curT=targets[ti];if(curT&&typeof curT.addEventListener==="function"&&!regSet.has(curT)){regSet.add(curT);try{curT.addEventListener(eventHandler.eventTypeString,jsEventHandler,eventHandler.useCapture);}catch(e){}}}eventHandler.target=canvas||eventHandler.target;JSEvents.eventHandlers.push(eventHandler);JSEvents.registerRemoveEventListeners();}else{'
assert old_reg in content, "registerOrRemoveHandler target not found"
content = content.replace(old_reg, new_reg, 1)
print("✅ registerOrRemoveHandler patched with multi-target binding & debug logging.")

# 15. Patch _removeHandler
old_rem = 'h.target.removeEventListener(h.eventTypeString,h.eventListenerFunc,h.useCapture)'
new_rem = 'if(h&&h.target&&typeof h.target.removeEventListener==="function"){h.target.removeEventListener(h.eventTypeString,h.eventListenerFunc,h.useCapture)}'
assert old_rem in content, "_removeHandler target not found"
content = content.replace(old_rem, new_rem, 1)
print("✅ _removeHandler patched.")

# 16. Patch _emscripten_set_wheel_callback_on_thread
old_wheel = 'function _emscripten_set_wheel_callback_on_thread(target,userData,useCapture,callbackfunc,targetThread){target=findEventTarget(target);if(typeof target.onwheel!=="undefined"){registerWheelEventCallback(target,userData,useCapture,callbackfunc,9,"wheel",targetThread);return 0}else{return-1}}'
new_wheel = 'function _emscripten_set_wheel_callback_on_thread(target,userData,useCapture,callbackfunc,targetThread){target=findEventTarget(target)||(Module&&Module["canvas"])||(typeof window!=="undefined"&&window.__mainCanvas)||null;if(target&&(typeof target.onwheel!=="undefined"||typeof target.addEventListener==="function")){registerWheelEventCallback(target,userData,useCapture,callbackfunc,9,"wheel",targetThread);return 0;}else{return-1;}}'
assert old_wheel in content, "_emscripten_set_wheel_callback_on_thread target not found"
content = content.replace(old_wheel, new_wheel, 1)
print("✅ _emscripten_set_wheel_callback_on_thread patched.")

# 17. Patch fetchWithProgress fallback
old_fetch = 'var fetchImpl=Module.fetchWithProgress;'
new_fetch = 'var fetchImpl=Module.fetchWithProgress||(typeof window!=="undefined"&&window.fetchWithProgress)||(typeof globalThis!=="undefined"&&globalThis.fetchWithProgress);'
assert old_fetch in content, "fetchImpl target not found"
content = content.replace(old_fetch, new_fetch, 1)
print("✅ fetchWithProgress fallback patched.")

# 18. Patch registerTouchEventCallback targetTouches safety & canvas hit enforcement
old_touch_target = 'for(var i=0;i<e.targetTouches.length;++i){touches[e.targetTouches[i].identifier].onTarget=1}'
new_touch_target = 'var _tts=(e&&e.targetTouches)||e.touches||[];for(var i=0;i<_tts.length;++i){var _id=_tts[i].identifier;if(touches[_id])touches[_id].onTarget=1;}for(var _id in touches){touches[_id].onTarget=1;}'
assert old_touch_target in content, "registerTouchEventCallback targetTouches not found"
content = content.replace(old_touch_target, new_touch_target, 1)
print("✅ registerTouchEventCallback targetTouches safety & onTarget patched.")

# 19. Patch Browser.calculateMouseEvent touch attribute fallback
old_calc_mouse = 'var touch=event.touch;if(touch===undefined){return}'
new_calc_mouse = 'var touch=event.touch||(event.changedTouches&&event.changedTouches[0])||(event.touches&&event.touches[0]);if(touch===undefined){return}'
assert old_calc_mouse in content, "Browser.calculateMouseEvent touch not found"
content = content.replace(old_calc_mouse, new_calc_mouse, 1)
print("✅ Browser.calculateMouseEvent touch fallback patched.")

# 20. Export unityFramework
bottom_export = """
// --- Export unityFramework ---
if (typeof module !== 'undefined' && module.exports) {
  module.exports = unityFramework;
}
if (typeof window !== 'undefined') window.unityFramework = unityFramework;
if (typeof globalThis !== 'undefined') globalThis.unityFramework = unityFramework;
if (typeof GameGlobal !== 'undefined') GameGlobal.unityFramework = unityFramework;
if (typeof global !== 'undefined') global.unityFramework = unityFramework;
"""

# Combine with top shim and bottom export
final_code = top_shim + content + bottom_export

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as out_f:
    out_f.write(final_code)

print(f"Patched framework written to {out_path} ({len(final_code)} chars).")
