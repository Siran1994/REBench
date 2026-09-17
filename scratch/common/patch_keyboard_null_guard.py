"""
修复 perfect-landing 白屏 + addEventListener null 崩溃

根因分析:
  _emscripten_set_keydown_callback_on_thread (WASM)
    -> registerKeyEventCallback
      -> findEventTarget(target)  =>  returns null
    -> registerOrRemoveHandler
      -> eventHandler.target.addEventListener(...)  =>  CRASH: null.addEventListener

findEventTarget 返回 null 的原因:
  1. specialHTMLTargets[0] = 0 (falsy), 当 target=0 时会 fallback 到 document.querySelector
  2. 如果宿主注入了 root.document（不是我们的 mockDocument），其 querySelector 可能不能
     正确解析 Emscripten 的内部目标字符串，返回 null

修复策略:
  A) framework.js: registerOrRemoveHandler 加 null-guard, 让 target 为 null 时安全跳过
  B) adapter: 当 root.document 已存在时, 也给它安装完整的 querySelector/getElementById/
     addEventListener 等方法（与 mockDocument 对齐）
  C) framework.js: findEventTarget 加兜底, 当 specialHTMLTargets 和 querySelector 都失败时
     fallback 到 canvas 或 window
"""

import re

# ============================================================
# Patch 1: framework.js - registerOrRemoveHandler null-guard
# ============================================================
fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# --- 1a: Patch registerOrRemoveHandler to check target is not null ---
old_handler = 'registerOrRemoveHandler:function(eventHandler){var jsEventHandler=function jsEventHandler(event){++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=jsEventHandler;eventHandler.target.addEventListener(eventHandler.eventTypeString,jsEventHandler,eventHandler.useCapture);JSEvents.eventHandlers.push(eventHandler);JSEvents.registerRemoveEventListeners()}'

new_handler = 'registerOrRemoveHandler:function(eventHandler){if(!eventHandler.target){return}var jsEventHandler=function jsEventHandler(event){++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=jsEventHandler;if(eventHandler.target&&typeof eventHandler.target.addEventListener==="function"){eventHandler.target.addEventListener(eventHandler.eventTypeString,jsEventHandler,eventHandler.useCapture)}else{return}JSEvents.eventHandlers.push(eventHandler);JSEvents.registerRemoveEventListeners()}'

if old_handler in fw:
    fw = fw.replace(old_handler, new_handler)
    print("[OK] Patched registerOrRemoveHandler with null-guard")
else:
    print("[WARN] registerOrRemoveHandler pattern not found - may already be patched")
    # Try checking if already patched
    if 'if(!eventHandler.target){return}' in fw:
        print("[INFO] Already patched")

# --- 1b: Patch findEventTarget to fallback to window when target resolves to null ---
old_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"?document.querySelector(target):undefined);return domElement}'

new_find = 'function findEventTarget(target){target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"&&typeof document.querySelector==="function"?document.querySelector(target):undefined);if(!domElement&&typeof window!=="undefined"){domElement=window}return domElement}'

if old_find in fw:
    fw = fw.replace(old_find, new_find)
    print("[OK] Patched findEventTarget with window fallback")
else:
    print("[WARN] findEventTarget pattern not found - checking variants")
    if 'if(!domElement&&typeof window!=="undefined"){domElement=window}' in fw:
        print("[INFO] Already patched")

# --- 1c: Patch _removeHandler to also null-guard ---
old_remove = 'JSEvents._removeHandler(i--)'
# This is used in the else branch - just keep it, the guard on registerOrRemoveHandler entry is enough

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# ============================================================
# Patch 2: adapter - Enhance existing root.document
# ============================================================
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'

with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# The current code:
# if (root.document) {
#     // only patches URL, documentURI, body, head
# } else {
#     root.document = mockDocument;
# }

old_doc_block = """  if (root.document) {
    try {
      Object.defineProperty(root.document, 'URL', {
        value: 'https://minigame.local/',
        writable: true,
        configurable: true
      });
      Object.defineProperty(root.document, 'documentURI', {
        value: 'https://minigame.local/',
        writable: true,
        configurable: true
      });
    } catch (e) {
      root.document.URL = 'https://minigame.local/';
    }
    if (!root.document.body) {
      root.document.body = mainCanvas;
    } else {
      root.document.body.appendChild = handleScriptAppend;
    }
    if (!root.document.head) {
      root.document.head = { appendChild: handleScriptAppend, removeChild: function () {} };
    } else {
      root.document.head.appendChild = handleScriptAppend;
    }
  } else {
    root.document = mockDocument;
  }"""

new_doc_block = """  if (root.document) {
    try {
      Object.defineProperty(root.document, 'URL', {
        value: 'https://minigame.local/',
        writable: true,
        configurable: true
      });
      Object.defineProperty(root.document, 'documentURI', {
        value: 'https://minigame.local/',
        writable: true,
        configurable: true
      });
    } catch (e) {
      root.document.URL = 'https://minigame.local/';
    }
    if (!root.document.body) {
      root.document.body = mainCanvas;
    } else {
      root.document.body.appendChild = handleScriptAppend;
    }
    if (!root.document.head) {
      root.document.head = { appendChild: handleScriptAppend, removeChild: function () {} };
    } else {
      root.document.head.appendChild = handleScriptAppend;
    }
    // 补全宿主 document 上 Unity/Emscripten 依赖的所有 DOM API
    // （宿主注入的 document 代理可能缺失 querySelector/getElementById 等关键方法）
    if (!root.document.documentElement) {
      root.document.documentElement = mockDocument.documentElement;
    }
    if (!root.document.compatMode) {
      try { root.document.compatMode = 'CSS1Compat'; } catch (e) {}
    }
    if (!root.document.readyState) {
      try { root.document.readyState = 'complete'; } catch (e) {}
    }
    if (typeof root.document.createElement !== 'function') {
      root.document.createElement = mockDocument.createElement;
    }
    if (typeof root.document.getElementById !== 'function') {
      root.document.getElementById = mockDocument.getElementById;
    }
    if (typeof root.document.querySelector !== 'function') {
      root.document.querySelector = mockDocument.querySelector;
    }
    if (typeof root.document.querySelectorAll !== 'function') {
      root.document.querySelectorAll = mockDocument.querySelectorAll;
    }
    if (typeof root.document.getElementsByTagName !== 'function') {
      root.document.getElementsByTagName = mockDocument.getElementsByTagName;
    }
    if (typeof root.document.addEventListener !== 'function') {
      root.document.addEventListener = mockDocument.addEventListener;
    }
    if (typeof root.document.removeEventListener !== 'function') {
      root.document.removeEventListener = mockDocument.removeEventListener;
    }
    if (typeof root.document.dispatchEvent !== 'function') {
      root.document.dispatchEvent = mockDocument.dispatchEvent;
    }
    // fullscreenEnabled 垫片 (Emscripten JSEvents.fullscreenEnabled 依赖)
    if (typeof root.document.fullscreenEnabled === 'undefined') {
      try { root.document.fullscreenEnabled = false; } catch (e) {}
    }
  } else {
    root.document = mockDocument;
  }"""

if old_doc_block in adapter:
    adapter = adapter.replace(old_doc_block, new_doc_block)
    print("[OK] Patched adapter document augmentation block")
else:
    print("[WARN] Adapter document block pattern not found")
    # Try a looser approach - check if already patched
    if "补全宿主 document 上 Unity/Emscripten 依赖的所有 DOM API" in adapter:
        print("[INFO] Already patched")
    else:
        print("[ERROR] Cannot find the code block to patch!")

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
print("请在字节跳动开发者工具中：")
print("1. 清除全部缓存")
print("2. Ctrl+R 重新编译")
print("3. 观察控制台是否还有 addEventListener null 错误")
