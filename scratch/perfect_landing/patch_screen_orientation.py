# Patch adapter/tt-unity-adapter.js and Build/0b14ddffb6d6867f4577189187985cab.framework.js

adapter_path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

old_screen_block = '''  // Screen 属性与 Orientation 完整垫片 (彻底消除 NotSupportedError: screen.orientation.lock())
  const screenOrientationObj = {
    type: 'landscape-primary',
    angle: 90,
    lock: function () { return Promise.resolve(); },
    unlock: function () {}
  };

  if (!root.screen) {
    root.screen = {
      width: screenWidth,
      height: screenHeight,
      availWidth: screenWidth,
      availHeight: screenHeight,
      orientation: screenOrientationObj
    };
  } else {
    try { Object.defineProperty(root.screen, 'width', { value: screenWidth, configurable: true, writable: true }); } catch (e) { root.screen.width = screenWidth; }
    try { Object.defineProperty(root.screen, 'height', { value: screenHeight, configurable: true, writable: true }); } catch (e) { root.screen.height = screenHeight; }
    try { Object.defineProperty(root.screen, 'availWidth', { value: screenWidth, configurable: true, writable: true }); } catch (e) { root.screen.availWidth = screenWidth; }
    try { Object.defineProperty(root.screen, 'availHeight', { value: screenHeight, configurable: true, writable: true }); } catch (e) { root.screen.availHeight = screenHeight; }
    try { Object.defineProperty(root.screen, 'orientation', { value: screenOrientationObj, configurable: true, writable: true }); } catch (e) { root.screen.orientation = screenOrientationObj; }
  }'''

new_screen_block = '''  // Screen 属性与 Orientation 完整 W3C EventTarget 垫片 (彻底消除 addEventListener is not a function 崩溃与 lock 异常)
  const orientationListeners = {};
  const screenOrientationObj = {
    type: 'landscape-primary',
    angle: 90,
    onchange: null,
    addEventListener: function (type, cb) {
      if (!orientationListeners[type]) orientationListeners[type] = [];
      orientationListeners[type].push(cb);
    },
    removeEventListener: function (type, cb) {
      if (!orientationListeners[type]) return;
      orientationListeners[type] = orientationListeners[type].filter(function (fn) { return fn !== cb; });
    },
    dispatchEvent: function (evt) {
      if (typeof this.onchange === 'function' && evt && evt.type === 'change') {
        try { this.onchange(evt); } catch (e) {}
      }
      const list = orientationListeners[evt ? evt.type : ''] || [];
      list.forEach(function (cb) { try { cb(evt); } catch (e) {} });
      return true;
    },
    lock: function () { return Promise.resolve(); },
    unlock: function () {}
  };

  function applyScreenOrientationPolyfill(targetScreen) {
    if (!targetScreen) return;
    try { Object.defineProperty(targetScreen, 'width', { value: screenWidth, configurable: true, writable: true }); } catch (e) { targetScreen.width = screenWidth; }
    try { Object.defineProperty(targetScreen, 'height', { value: screenHeight, configurable: true, writable: true }); } catch (e) { targetScreen.height = screenHeight; }
    try { Object.defineProperty(targetScreen, 'availWidth', { value: screenWidth, configurable: true, writable: true }); } catch (e) { targetScreen.availWidth = screenWidth; }
    try { Object.defineProperty(targetScreen, 'availHeight', { value: screenHeight, configurable: true, writable: true }); } catch (e) { targetScreen.availHeight = screenHeight; }
    try {
      Object.defineProperty(targetScreen, 'orientation', { value: screenOrientationObj, configurable: true, writable: true });
    } catch (e) {
      if (targetScreen.orientation) {
        targetScreen.orientation.type = 'landscape-primary';
        targetScreen.orientation.angle = 90;
        targetScreen.orientation.lock = function () { return Promise.resolve(); };
        targetScreen.orientation.unlock = function () {};
        targetScreen.orientation.addEventListener = screenOrientationObj.addEventListener;
        targetScreen.orientation.removeEventListener = screenOrientationObj.removeEventListener;
        targetScreen.orientation.dispatchEvent = screenOrientationObj.dispatchEvent;
      } else {
        targetScreen.orientation = screenOrientationObj;
      }
    }
  }

  if (!root.screen) {
    root.screen = {
      width: screenWidth,
      height: screenHeight,
      availWidth: screenWidth,
      availHeight: screenHeight,
      orientation: screenOrientationObj
    };
  } else {
    applyScreenOrientationPolyfill(root.screen);
  }
  if (typeof window !== 'undefined' && window.screen && window.screen !== root.screen) {
    applyScreenOrientationPolyfill(window.screen);
  }'''

if old_screen_block in adapter:
    adapter = adapter.replace(old_screen_block, new_screen_block, 1)
    with open(adapter_path, 'w', encoding='utf-8') as f:
        f.write(adapter)
    print("Successfully updated adapter/tt-unity-adapter.js!")
else:
    print("WARNING: old_screen_block not found in adapter!")

# Now patch framework.js
fw_path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

fw_old_init = 'if(screen.orientation){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}'
fw_new_init = 'if(screen.orientation&&typeof screen.orientation.addEventListener==="function"){screen.orientation.addEventListener("change",JS_ScreenOrientation_eventHandler)}'

fw_old_deinit = 'if(screen.orientation){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}'
fw_new_deinit = 'if(screen.orientation&&typeof screen.orientation.removeEventListener==="function"){screen.orientation.removeEventListener("change",JS_ScreenOrientation_eventHandler)}'

if fw_old_init in fw:
    fw = fw.replace(fw_old_init, fw_new_init, 1)
    print("Patched _JS_ScreenOrientation_Init in framework.js!")
else:
    print("WARNING: fw_old_init not found in framework.js!")

if fw_old_deinit in fw:
    fw = fw.replace(fw_old_deinit, fw_new_deinit, 1)
    print("Patched _JS_ScreenOrientation_DeInit in framework.js!")
else:
    print("WARNING: fw_old_deinit not found in framework.js!")

with open(fw_path, 'w', encoding='utf-8') as f:
    fw = fw.write(fw)

print("Saved framework.js successfully!")
