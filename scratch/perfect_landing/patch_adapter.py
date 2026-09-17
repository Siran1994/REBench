import re

adapter_path = r'D:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'
with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# 1. Update systemInfo & Landscape dimension guarantee
old_sys = '''  let systemInfo = { windowWidth: 960, windowHeight: 600, pixelRatio: 1 };
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    try { systemInfo = tt.getSystemInfoSync(); } catch (e) {}
  }

  const screenWidth = systemInfo.windowWidth;
  const screenHeight = systemInfo.windowHeight;
  const pixelRatio = systemInfo.pixelRatio || 1;

  root.innerWidth = screenWidth;
  root.innerHeight = screenHeight;
  root.devicePixelRatio = pixelRatio;'''

new_sys = '''  let systemInfo = { windowWidth: 960, windowHeight: 600, pixelRatio: 1 };
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    try { systemInfo = tt.getSystemInfoSync(); } catch (e) {}
  }

  // 严格强制横屏尺寸适配 (游戏设计基准 960x600)
  // 杜绝真机/IDE首次回调因竖屏数值 (如 390x844) 导致 Unity IL2CPP 误判为 Potrait 并触发防转屏锁死
  const rawW = (systemInfo && systemInfo.windowWidth) || 960;
  const rawH = (systemInfo && systemInfo.windowHeight) || 600;
  let screenWidth = Math.max(rawW, rawH);
  let screenHeight = Math.min(rawW, rawH);
  const pixelRatio = systemInfo.pixelRatio || 1;

  root.innerWidth = screenWidth;
  root.innerHeight = screenHeight;
  root.devicePixelRatio = pixelRatio;
  root.orientation = 90;
  if (typeof window !== 'undefined') {
    window.orientation = 90;
    window.innerWidth = screenWidth;
    window.innerHeight = screenHeight;
  }'''

if old_sys in adapter:
    adapter = adapter.replace(old_sys, new_sys, 1)
    print("Patched systemInfo dimensions in adapter!")
else:
    print("WARNING: old_sys not found!")

# 2. Add clientWidth/clientHeight & offsetWidth/offsetHeight in ensureCanvasPolyfill
old_cvs_geom = '''    if (!cvs.getBoundingClientRect) {
      cvs.getBoundingClientRect = function () {
        return new root.DOMRect(0, 0, screenWidth, screenHeight);
      };
    }'''

new_cvs_geom = '''    cvs.id = cvs.id || 'unity-canvas';
    try {
      Object.defineProperty(cvs, 'clientWidth', { get: function () { return screenWidth; }, configurable: true });
      Object.defineProperty(cvs, 'clientHeight', { get: function () { return screenHeight; }, configurable: true });
      Object.defineProperty(cvs, 'offsetWidth', { get: function () { return screenWidth; }, configurable: true });
      Object.defineProperty(cvs, 'offsetHeight', { get: function () { return screenHeight; }, configurable: true });
    } catch (e) {}

    cvs.getBoundingClientRect = function () {
      return new root.DOMRect(0, 0, screenWidth, screenHeight);
    };'''

if old_cvs_geom in adapter:
    adapter = adapter.replace(old_cvs_geom, new_cvs_geom, 1)
    print("Patched canvas clientWidth/clientHeight in adapter!")
else:
    print("WARNING: old_cvs_geom not found!")

# 3. Add dispatchEvent in mockDocument
old_doc_ev = '''    addEventListener: function (type, listener) {
      if (!docEventListeners[type]) docEventListeners[type] = [];
      docEventListeners[type].push(listener);
    },
    removeEventListener: function (type, listener) {
      if (!docEventListeners[type]) return;
      docEventListeners[type] = docEventListeners[type].filter(l => l !== listener);
    }'''

new_doc_ev = '''    addEventListener: function (type, listener) {
      if (!docEventListeners[type]) docEventListeners[type] = [];
      docEventListeners[type].push(listener);
    },
    removeEventListener: function (type, listener) {
      if (!docEventListeners[type]) return;
      docEventListeners[type] = docEventListeners[type].filter(l => l !== listener);
    },
    dispatchEvent: function (evt) {
      const list = docEventListeners[evt.type] || [];
      list.forEach(cb => { try { cb(evt); } catch (e) {} });
      return true;
    }'''

if old_doc_ev in adapter:
    adapter = adapter.replace(old_doc_ev, new_doc_ev, 1)
    print("Patched mockDocument.dispatchEvent in adapter!")
else:
    print("WARNING: old_doc_ev not found!")

# 4. Patch Screen & Screen.orientation
old_screen = '''  // Screen 属性安全挂载
  if (!root.screen) {
    root.screen = { width: screenWidth, height: screenHeight };
  } else {
    try {
      if (!root.screen.width) {
        Object.defineProperty(root.screen, 'width', { value: screenWidth, configurable: true, writable: true });
        Object.defineProperty(root.screen, 'height', { value: screenHeight, configurable: true, writable: true });
      }
    } catch (e) {}
  }'''

new_screen = '''  // Screen 属性与 Orientation 完整垫片 (彻底消除 NotSupportedError: screen.orientation.lock())
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
  }

  // 动态屏幕尺寸与重排事件联动
  function updateScreenDimensions(w, h) {
    screenWidth = Math.max(w, h);
    screenHeight = Math.min(w, h);
    root.innerWidth = screenWidth;
    root.innerHeight = screenHeight;
    root.orientation = 90;
    if (typeof window !== 'undefined') {
      window.orientation = 90;
      window.innerWidth = screenWidth;
      window.innerHeight = screenHeight;
    }
    if (mainCanvas) {
      mainCanvas.width = screenWidth * pixelRatio;
      mainCanvas.height = screenHeight * pixelRatio;
      if (mainCanvas.style) {
        mainCanvas.style.width = screenWidth + 'px';
        mainCanvas.style.height = screenHeight + 'px';
      }
    }
    if (mockDocument && mockDocument.documentElement) {
      mockDocument.documentElement.clientWidth = screenWidth;
      mockDocument.documentElement.clientHeight = screenHeight;
    }
    if (root.visualViewport) {
      root.visualViewport.width = screenWidth;
      root.visualViewport.height = screenHeight;
    }
    if (root.screen) {
      try { root.screen.width = screenWidth; } catch (e) {}
      try { root.screen.height = screenHeight; } catch (e) {}
      try { root.screen.availWidth = screenWidth; } catch (e) {}
      try { root.screen.availHeight = screenHeight; } catch (e) {}
    }
    if (typeof root.dispatchEvent === 'function') {
      root.dispatchEvent({ type: 'resize' });
    }
    if (mainCanvas && typeof mainCanvas.dispatchEvent === 'function') {
      mainCanvas.dispatchEvent({ type: 'resize' });
    }
  }

  if (typeof tt !== 'undefined' && tt.onWindowResize) {
    tt.onWindowResize(function (res) {
      if (res && res.windowWidth && res.windowHeight) {
        updateScreenDimensions(res.windowWidth, res.windowHeight);
      }
    });
  }'''

if old_screen in adapter:
    adapter = adapter.replace(old_screen, new_screen, 1)
    print("Patched Screen & Orientation in adapter!")
else:
    print("WARNING: old_screen not found!")

# 5. Patch touch events to broadcast to all (canvas, document, window)
old_touch = '''  if (typeof tt !== 'undefined') {
    if (tt.onTouchStart) {
      tt.onTouchStart(function (res) {
        if (!res.touches || !res.touches[0]) return;
        const t = res.touches[0];
        mainCanvas.dispatchEvent(createSyntheticEvent('pointerdown', t, mainCanvas));
        mainCanvas.dispatchEvent(createSyntheticEvent('mousedown', t, mainCanvas));
        mainCanvas.dispatchEvent({ type: 'touchstart', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchMove) {
      tt.onTouchMove(function (res) {
        if (!res.touches || !res.touches[0]) return;
        const t = res.touches[0];
        mainCanvas.dispatchEvent(createSyntheticEvent('pointermove', t, mainCanvas));
        mainCanvas.dispatchEvent(createSyntheticEvent('mousemove', t, mainCanvas));
        mainCanvas.dispatchEvent({ type: 'touchmove', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchEnd) {
      tt.onTouchEnd(function (res) {
        const t = (res.changedTouches && res.changedTouches[0]) || (res.touches && res.touches[0]) || { clientX: 0, clientY: 0 };
        mainCanvas.dispatchEvent(createSyntheticEvent('pointerup', t, mainCanvas));
        mainCanvas.dispatchEvent(createSyntheticEvent('mouseup', t, mainCanvas));
        mainCanvas.dispatchEvent({ type: 'touchend', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchCancel) {
      tt.onTouchCancel(function (res) {
        const t = (res.changedTouches && res.changedTouches[0]) || { clientX: 0, clientY: 0 };
        mainCanvas.dispatchEvent(createSyntheticEvent('pointercancel', t, mainCanvas));
        mainCanvas.dispatchEvent({ type: 'touchcancel', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }
  }'''

new_touch = '''  function dispatchToAll(evt) {
    if (mainCanvas && mainCanvas.dispatchEvent) mainCanvas.dispatchEvent(evt);
    if (mockDocument && mockDocument.dispatchEvent) mockDocument.dispatchEvent(evt);
    if (root && root.dispatchEvent) root.dispatchEvent(evt);
  }

  if (typeof tt !== 'undefined') {
    if (tt.onTouchStart) {
      tt.onTouchStart(function (res) {
        if (!res.touches || !res.touches[0]) return;
        const t = res.touches[0];
        dispatchToAll(createSyntheticEvent('pointerdown', t, mainCanvas));
        dispatchToAll(createSyntheticEvent('mousedown', t, mainCanvas));
        dispatchToAll({ type: 'touchstart', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchMove) {
      tt.onTouchMove(function (res) {
        if (!res.touches || !res.touches[0]) return;
        const t = res.touches[0];
        dispatchToAll(createSyntheticEvent('pointermove', t, mainCanvas));
        dispatchToAll(createSyntheticEvent('mousemove', t, mainCanvas));
        dispatchToAll({ type: 'touchmove', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchEnd) {
      tt.onTouchEnd(function (res) {
        const t = (res.changedTouches && res.changedTouches[0]) || (res.touches && res.touches[0]) || { clientX: 0, clientY: 0 };
        dispatchToAll(createSyntheticEvent('pointerup', t, mainCanvas));
        dispatchToAll(createSyntheticEvent('mouseup', t, mainCanvas));
        dispatchToAll({ type: 'touchend', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }

    if (tt.onTouchCancel) {
      tt.onTouchCancel(function (res) {
        const t = (res.changedTouches && res.changedTouches[0]) || { clientX: 0, clientY: 0 };
        dispatchToAll(createSyntheticEvent('pointercancel', t, mainCanvas));
        dispatchToAll({ type: 'touchcancel', touches: res.touches, changedTouches: res.changedTouches, preventDefault: function(){} });
      });
    }
  }'''

if old_touch in adapter:
    adapter = adapter.replace(old_touch, new_touch, 1)
    print("Patched touch events in adapter!")
else:
    print("WARNING: old_touch not found!")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)

print("Saved tt-unity-adapter.js successfully!")
