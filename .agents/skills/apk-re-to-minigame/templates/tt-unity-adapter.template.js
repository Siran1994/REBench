/**
 * ByteDance MiniGame (抖音小游戏) Unity 3D WebGL 专有运行期适配层
 * 
 * 核心功能：
 * 1. 宿主环境规范化垫片：MiniBlob, MiniFile, MiniResponse, atob, btoa, visualViewport, DOMRect
 * 2. 画布与 WebGL2 渲染上下文绑定：桥接 tt.createCanvas() 与系统全屏分辨率
 * 3. 触控与鼠标事件模拟器：将 tt.onTouch* 映射为 Mouse/Pointer/Touch 事件分发给主画布
 * 4. Web Audio 桥接与 AudioParam 补全：兼容 Krypton / Helium 音频生命周期与触摸唤醒
 * 5. 二进制资源与 WASM 零延迟拦截：拦截 fetch/XHR，直读 wasm/ 与 data/ 本地分包
 * 6. 本地持久化桥接：localStorage / IndexedDB 桥接至 tt.*StorageSync
 * 7. 横竖屏防自激死循环控制 (Anti-Loop Orientation Lock)
 */

(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
  if (root.__tt_unity_adapter_initialized) return;
  root.__tt_unity_adapter_initialized = true;

  console.log('[Unity MiniGame Adapter] 正在装载 Unity 3D WebGL 运行时适配层...');

  // ==========================================
  // 1. 基础环境与 Base64 / W3C 垫片
  // ==========================================

  // atob / btoa 纯 JS 实现（防止 Android Krypton 报 atob is not defined）
  const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  if (typeof root.btoa === 'undefined') {
    root.btoa = function (input) {
      const str = String(input);
      let output = '';
      for (let block = 0, charCode, i = 0, map = b64chars;
           str.charAt(i | 0) || (map = '=', i % 1);
           output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
        charCode = str.charCodeAt(i += 3 / 4);
        if (charCode > 0xFF) {
          throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
      }
      return output;
    };
  }

  if (typeof root.atob === 'undefined') {
    root.atob = function (input) {
      const str = String(input).replace(/[=]+$/, '');
      if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
      }
      let output = '';
      for (let bc = 0, bs = 0, buffer, i = 0;
           buffer = str.charAt(i++);
           ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
             bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = b64chars.indexOf(buffer);
      }
      return output;
    };
  }

  // MiniBlob 实现
  class MiniBlob {
    constructor(parts = [], options = {}) {
      this.type = (options && options.type) ? String(options.type).toLowerCase() : '';
      const buffers = [];
      let totalSize = 0;
      for (const part of parts) {
        if (part instanceof ArrayBuffer) {
          buffers.push(new Uint8Array(part));
          totalSize += part.byteLength;
        } else if (ArrayBuffer.isView(part)) {
          const u8 = new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
          buffers.push(u8);
          totalSize += part.byteLength;
        } else if (part instanceof MiniBlob || (part && typeof part === 'object' && part._arrayBuffer)) {
          const u8 = new Uint8Array(part._arrayBuffer);
          buffers.push(u8);
          totalSize += u8.byteLength;
        } else {
          const str = String(part);
          let u8;
          if (typeof TextEncoder !== 'undefined') {
            u8 = new TextEncoder().encode(str);
          } else {
            u8 = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) u8[i] = str.charCodeAt(i);
          }
          buffers.push(u8);
          totalSize += u8.byteLength;
        }
      }
      const merged = new Uint8Array(totalSize);
      let offset = 0;
      for (const b of buffers) {
        merged.set(b, offset);
        offset += b.byteLength;
      }
      this._arrayBuffer = merged.buffer;
      this.size = totalSize;
    }
    arrayBuffer() { return Promise.resolve(this._arrayBuffer); }
    text() {
      if (typeof TextDecoder !== 'undefined') {
        return Promise.resolve(new TextDecoder('utf-8').decode(this._arrayBuffer));
      }
      const u8 = new Uint8Array(this._arrayBuffer);
      let s = '';
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return Promise.resolve(s);
    }
    slice(start = 0, end = this.size, contentType = '') {
      const s = Math.max(0, start < 0 ? this.size + start : start);
      const e = Math.min(this.size, end < 0 ? this.size + end : end);
      return new MiniBlob([this._arrayBuffer.slice(s, Math.max(s, e))], { type: contentType || this.type });
    }
  }
  root.Blob = root.Blob || MiniBlob;

  // DOMRect 几何垫片
  if (typeof root.DOMRect === 'undefined') {
    class DOMRect {
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = Number(x); this.y = Number(y);
        this.width = Number(width); this.height = Number(height);
        this.top = this.y; this.left = this.x;
        this.right = this.x + this.width; this.bottom = this.y + this.height;
      }
      static fromRect(other) {
        return new DOMRect(other ? other.x : 0, other ? other.y : 0, other ? other.width : 0, other ? other.height : 0);
      }
    }
    root.DOMRect = DOMRect;
  }

  // ==========================================
  // 2. 系统信息与主画布创建
  // ==========================================

  let systemInfo = { windowWidth: 960, windowHeight: 600, pixelRatio: 1 };
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

  // requestAnimationFrame / cancelAnimationFrame 垫片
  root.requestAnimationFrame = root.requestAnimationFrame || (typeof tt !== 'undefined' && tt.requestAnimationFrame ? tt.requestAnimationFrame.bind(tt) : null) || function (cb) { return setTimeout(cb, 16); };
  root.cancelAnimationFrame = root.cancelAnimationFrame || (typeof tt !== 'undefined' && tt.cancelAnimationFrame ? tt.cancelAnimationFrame.bind(tt) : null) || function (id) { clearTimeout(id); };
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame = root.requestAnimationFrame;
    window.cancelAnimationFrame = root.cancelAnimationFrame;
  }

  try { Object.defineProperty(root, 'innerWidth', { value: screenWidth, writable: true, configurable: true }); } catch(e) { root.innerWidth = screenWidth; }
  try { Object.defineProperty(root, 'innerHeight', { value: screenHeight, writable: true, configurable: true }); } catch(e) { root.innerHeight = screenHeight; }
  root.devicePixelRatio = pixelRatio;
  root.orientation = 90;
  if (typeof window !== 'undefined') {
    window.orientation = 90;
    window.innerWidth = screenWidth;
    window.innerHeight = screenHeight;
  }

  // visualViewport 垫片（彻底解决 Android Krypton 扫码黑屏）
  if (typeof root.visualViewport === 'undefined') {
    const vvListeners = {};
    root.visualViewport = {
      width: screenWidth,
      height: screenHeight,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: function (type, cb) {
        if (!vvListeners[type]) vvListeners[type] = [];
        vvListeners[type].push(cb);
      },
      removeEventListener: function (type, cb) {
        if (!vvListeners[type]) return;
        vvListeners[type] = vvListeners[type].filter(f => f !== cb);
      },
      dispatchEvent: function (event) {
        const list = vvListeners[event.type] || [];
        list.forEach(cb => { try { cb(event); } catch (e) {} });
        return true;
      }
    };
  }

  function ensureCanvasPolyfill(cvs) {
    if (!cvs) return cvs;
    // 诊断 tt.createCanvas 原始 canvas 属性
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
    }

    const styleObj = {
      width: screenWidth + 'px',
      height: screenHeight + 'px',
      display: 'block',
      position: 'absolute',
      left: '0px',
      top: '0px',
      cursor: 'default',
      backgroundColor: '#000000',
      setProperty: function (k, v) { this[k] = v; },
      removeProperty: function (k) { delete this[k]; },
      getPropertyValue: function (k) { return this[k] || ''; }
    };

    try {
      if (!cvs.style) {
        cvs.style = styleObj;
      }
    } catch (e) {}

    if (!cvs.style) {
      try {
        Object.defineProperty(cvs, 'style', {
          value: styleObj,
          writable: true,
          configurable: true
        });
      } catch (e) {}
    } else {
      if (!cvs.style.cursor) cvs.style.cursor = 'default';
      if (!cvs.style.setProperty) cvs.style.setProperty = function (k, v) { this[k] = v; };
      if (!cvs.style.removeProperty) cvs.style.removeProperty = function (k) { delete this[k]; };
      if (!cvs.style.getPropertyValue) cvs.style.getPropertyValue = function (k) { return this[k] || ''; };
    }

    cvs.id = cvs.id || 'unity-canvas';
    try {
      Object.defineProperty(cvs, 'clientWidth', { get: function () { return screenWidth; }, configurable: true });
      Object.defineProperty(cvs, 'clientHeight', { get: function () { return screenHeight; }, configurable: true });
      Object.defineProperty(cvs, 'offsetWidth', { get: function () { return screenWidth; }, configurable: true });
      Object.defineProperty(cvs, 'offsetHeight', { get: function () { return screenHeight; }, configurable: true });
    } catch (e) {}

    cvs.getBoundingClientRect = function () {
      return new root.DOMRect(0, 0, screenWidth, screenHeight);
    };
    // WebGL 上下文降级保障 (webgl2 -> webgl -> experimental-webgl -> 无参数)
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
    }

    if (!cvs.focus) cvs.focus = function () {};
    if (!cvs.blur) cvs.blur = function () {};
    return cvs;
  }

  // 创建全屏主画布
  const rawMainCanvas = (typeof tt !== 'undefined' && tt.createCanvas) ? tt.createCanvas() : {};
  const mainCanvas = ensureCanvasPolyfill(rawMainCanvas);

  // 挂载全局画布引用
  root.__mainCanvas = mainCanvas;
  if (typeof window !== 'undefined') window.__mainCanvas = mainCanvas;

  // 拦截 tt.createCanvas 以保障后续任何动态画布均具备完整 style 与几何能力
  if (typeof tt !== 'undefined' && tt.createCanvas) {
    const originalCreateCanvas = tt.createCanvas;
    tt.createCanvas = function () {
      const c = originalCreateCanvas.apply(tt, arguments);
      return ensureCanvasPolyfill(c);
    };
  }

  // 事件监听队列
  const canvasEventListeners = {};
  mainCanvas.addEventListener = function (type, listener) {
    if (!canvasEventListeners[type]) canvasEventListeners[type] = [];
    canvasEventListeners[type].push(listener);
  };
  mainCanvas.removeEventListener = function (type, listener) {
    if (!canvasEventListeners[type]) return;
    canvasEventListeners[type] = canvasEventListeners[type].filter(l => l !== listener);
  };
  mainCanvas.dispatchEvent = function (evt) {
    const list = canvasEventListeners[evt.type] || [];
    list.forEach(cb => { try { cb(evt); } catch (e) { console.warn('[Canvas Event Error]', e); } });
    return true;
  };

  function handleScriptAppend(child) {
    if (child && child.tagName === 'SCRIPT') {
      // 确保 unityFramework 挂载
      if (typeof root.unityFramework === 'undefined') {
        try {
          let fw = null;
          try {
            fw = require('../Build/0b14ddffb6d6867f4577189187985cab.framework.js');
          } catch (e1) {
            try { fw = require('./Build/0b14ddffb6d6867f4577189187985cab.framework.js'); } catch (e2) {}
          }
          if (fw) {
            root.unityFramework = fw;
            if (typeof window !== 'undefined') window.unityFramework = fw;
          }
        } catch (e) {
          console.warn('[Adapter Script Loader Error]', e);
        }
      }
      setTimeout(function () {
        if (typeof child.onload === 'function') {
          try { child.onload(); } catch (err) { console.error('[Script onload error]:', err); }
        }
      }, 16);
    }
    return child;
  }

  mainCanvas.appendChild = handleScriptAppend;
  mainCanvas.removeChild = function () {};

  // ==========================================
  // 3. Document 与 Window 树状对象伪装
  // ==========================================

  const docEventListeners = {};
  const mockDocument = {
    URL: 'https://minigame.local/',
    documentURI: 'https://minigame.local/',
    compatMode: 'CSS1Compat',
    readyState: 'complete',
    body: mainCanvas,
    head: {
      appendChild: handleScriptAppend,
      removeChild: function () {}
    },
    documentElement: {
      style: {},
      clientWidth: screenWidth,
      clientHeight: screenHeight
    },
    createElement: function (tagName) {
      tagName = String(tagName).toLowerCase();
      if (tagName === 'canvas') {
        return (typeof tt !== 'undefined' && tt.createCanvas) ? tt.createCanvas() : {};
      }
      if (tagName === 'script') {
        return {
          tagName: 'SCRIPT',
          src: '',
          onload: null,
          onerror: null,
          setAttribute: function () {},
          getAttribute: function () { return null; }
        };
      }
      if (tagName === 'img' || tagName === 'image') {
        return (typeof tt !== 'undefined' && tt.createImage) ? tt.createImage() : {};
      }
      if (tagName === 'audio') {
        return (typeof tt !== 'undefined' && tt.createInnerAudioContext) ? tt.createInnerAudioContext() : {};
      }
      if (tagName === 'a') {
        return { href: '', click: function () {} };
      }
      return {
        style: {},
        setAttribute: function () {},
        getAttribute: function () { return null; },
        appendChild: function () {},
        removeChild: function () {},
        addEventListener: function () {},
        removeEventListener: function () {}
      };
    },
    getElementById: function (id) {
      if (id === 'unity-canvas' || id === 'canvas') return mainCanvas;
      return mainCanvas;
    },
    querySelector: function (sel) {
      if (sel === 'body' || sel === 'html') return mockDocument.body;
      return mainCanvas;
    },
    querySelectorAll: function (sel) {
      return [mainCanvas];
    },
    getElementsByTagName: function (tag) {
      if (tag === 'body') return [mockDocument.body];
      return [mainCanvas];
    },
    addEventListener: function (type, listener) {
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
    }
  };

  // URL 对象与 createObjectURL 垫片（防止 Unity Loader 创建 Blob 链接与解析相对路径失败）
  const NativeURL = root.URL;
  function SafeURL(url, base) {
    let validBase = base;
    if (!validBase || validBase === 'about:blank' || typeof validBase !== 'string' || !validBase.includes('://')) {
      validBase = 'https://minigame.local/';
    }
    if (NativeURL) {
      try {
        return new NativeURL(url, validBase);
      } catch (e) {}
    }
    const cleanBase = String(validBase).replace(/\/+$/, '');
    const cleanUrl = String(url).replace(/^\/+/, '');
    const fullHref = cleanBase + '/' + cleanUrl;
    return {
      href: fullHref,
      origin: 'https://minigame.local',
      protocol: 'https:',
      host: 'minigame.local',
      hostname: 'minigame.local',
      pathname: '/' + cleanUrl,
      toString: function () { return fullHref; }
    };
  }
  if (NativeURL) {
    SafeURL.createObjectURL = NativeURL.createObjectURL || function () { return 'blob:minigame/' + Math.random().toString(36).slice(2); };
    SafeURL.revokeObjectURL = NativeURL.revokeObjectURL || function () {};
  } else {
    SafeURL.createObjectURL = function () { return 'blob:minigame/' + Math.random().toString(36).slice(2); };
    SafeURL.revokeObjectURL = function () {};
  }
  root.URL = SafeURL;

  // Window 与全局事件监听支持
  const winEventListeners = {};
  root.addEventListener = root.addEventListener || function (type, listener) {
    if (!winEventListeners[type]) winEventListeners[type] = [];
    winEventListeners[type].push(listener);
  };
  root.removeEventListener = root.removeEventListener || function (type, listener) {
    if (!winEventListeners[type]) return;
    winEventListeners[type] = winEventListeners[type].filter(l => l !== listener);
  };
  root.dispatchEvent = root.dispatchEvent || function (evt) {
    const list = winEventListeners[evt.type] || [];
    list.forEach(cb => { try { cb(evt); } catch (e) {} });
    return true;
  };

  // Navigator 属性安全挂载（防止 Helium / WebKit 抛出 Cannot set property userAgent which has only a getter）
  if (!root.navigator) {
    root.navigator = {
      userAgent: 'Mozilla/5.0 (Linux; Android 10) Mobile MiniGame ByteDance',
      appVersion: '5.0 (Linux; Android 10) Mobile MiniGame',
      language: 'zh-CN'
    };
  } else {
    try {
      if (!root.navigator.userAgent) {
        Object.defineProperty(root.navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Linux; Android 10) Mobile MiniGame ByteDance',
          configurable: true,
          writable: true
        });
      }
    } catch (e) {}
    try {
      if (!root.navigator.appVersion) {
        Object.defineProperty(root.navigator, 'appVersion', {
          value: '5.0 (Linux; Android 10) Mobile MiniGame',
          configurable: true,
          writable: true
        });
      }
    } catch (e) {}
    try {
      if (!root.navigator.language) {
        Object.defineProperty(root.navigator, 'language', {
          value: 'zh-CN',
          configurable: true,
          writable: true
        });
      }
    } catch (e) {}
  }

  // Screen 属性与 Orientation 完整 W3C EventTarget 垫片 (彻底消除 addEventListener is not a function 崩溃与 lock 异常)
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
  }

  // 动态屏幕尺寸与重排事件联动
  function forceProperty(obj, prop, val) {
    try {
      Object.defineProperty(obj, prop, { value: val, writable: true, configurable: true });
    } catch (e) {
      try { obj[prop] = val; } catch (e2) {}
    }
  }
  function updateScreenDimensions(w, h) {
    screenWidth = Math.max(w, h);
    screenHeight = Math.min(w, h);
    forceProperty(root, 'innerWidth', screenWidth);
    forceProperty(root, 'innerHeight', screenHeight);
    forceProperty(root, 'orientation', 90);
    if (typeof window !== 'undefined') {
      forceProperty(window, 'orientation', 90);
      forceProperty(window, 'innerWidth', screenWidth);
      forceProperty(window, 'innerHeight', screenHeight);
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
  }

  // WebAssembly.instantiateStreaming 垫片（确保接收 MiniResponse 时稳定降级为 ArrayBuffer 实例化）
  if (typeof WebAssembly !== 'undefined') {
    WebAssembly.instantiateStreaming = async function (responsePromise, importObject) {
      try {
        const res = await responsePromise;
        const ab = await res.arrayBuffer();
        const result = await WebAssembly.instantiate(ab, importObject);
        return {
          module: result.module || result,
          instance: result.instance || result
        };
      } catch (err) {
        console.error('[WebAssembly instantiateStreaming Error]:', err);
        throw err;
      }
    };
  }

  // AudioContext / webkitAudioContext 桥接
  if (typeof root.AudioContext === 'undefined' && typeof root.webkitAudioContext === 'undefined') {
    if (typeof tt !== 'undefined' && tt.getAudioContext) {
      root.AudioContext = tt.getAudioContext.bind(tt);
      root.webkitAudioContext = root.AudioContext;
    }
  }

  if (root.document) {
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
  }
  root.window = root.window || root;




  // ==========================================
  // 4. 触控事件映射 (Touch -> Pointer / Mouse)
  // ==========================================

  function createSyntheticEvent(type, touch, target) {
    return {
      type: type,
      target: target,
      currentTarget: target,
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.clientX,
      pageY: touch.clientY,
      screenX: touch.clientX,
      screenY: touch.clientY,
      button: 0,
      buttons: (type === 'mouseup' || type === 'pointerup') ? 0 : 1,
      which: 1,
      pointerId: touch.identifier || 0,
      pointerType: 'touch',
      isPrimary: true,
      bubbles: true,
      cancelable: true,
      preventDefault: function () {},
      stopPropagation: function () {}
    };
  }

  function dispatchToAll(evt) {
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
  }

  // ==========================================
  // 5. 二进制资源与 WASM 零延迟 Fetch 拦截
  // ==========================================

  const originalFetch = root.fetch;

  class MiniResponse {
    constructor(arrayBuffer, status = 200, headers = {}) {
      const rawBuf = (arrayBuffer instanceof ArrayBuffer)
        ? arrayBuffer
        : (arrayBuffer && arrayBuffer.buffer ? arrayBuffer.buffer : new ArrayBuffer(0));
      this._arrayBuffer = rawBuf;
      this.parsedBody = new Uint8Array(rawBuf);
      this.status = status;
      this.statusText = status === 200 ? 'OK' : 'Error';
      this.ok = status >= 200 && status < 300;
      this.type = 'basic';
      this.url = '';
      const len = String(rawBuf.byteLength);
      const ctype = headers['content-type'] || 'application/octet-stream';
      this.headers = {
        get: function (name) {
          name = String(name).toLowerCase();
          if (name === 'content-length') return len;
          if (name === 'content-type') return ctype;
          return headers[name] || null;
        },
        has: function (name) {
          name = String(name).toLowerCase();
          return name === 'content-length' || name === 'content-type' || (name in headers);
        }
      };
    }
    arrayBuffer() { return Promise.resolve(this._arrayBuffer); }
    blob() { return Promise.resolve(new MiniBlob([this._arrayBuffer])); }
    json() {
      const text = new TextDecoder('utf-8').decode(this._arrayBuffer);
      return Promise.resolve(JSON.parse(text));
    }
    text() {
      const text = new TextDecoder('utf-8').decode(this._arrayBuffer);
      return Promise.resolve(text);
    }
    clone() {
      const r = new MiniResponse(this._arrayBuffer, this.status, { 'content-type': this.headers.get('content-type') });
      r.parsedBody = this.parsedBody;
      return r;
    }
  }
  root.Response = root.Response || MiniResponse;

  root.__fileCache = root.__fileCache || {};

  function loadLocalBuffer(candidatePaths) {
    const paths = Array.isArray(candidatePaths) ? candidatePaths : [candidatePaths];
    for (const p of paths) {
      if (root.__fileCache[p]) {
        return Promise.resolve(root.__fileCache[p]);
      }
    }

    if (typeof tt === 'undefined' || !tt.getFileSystemManager) {
      return Promise.reject(new Error('tt.getFileSystemManager not available'));
    }
    const fs = tt.getFileSystemManager();

    return new Promise((resolve, reject) => {
      let idx = 0;
      function tryNext() {
        if (idx >= paths.length) {
          return reject(new Error('All candidate paths failed: ' + paths.join(', ')));
        }
        const curPath = paths[idx++];

        // 优先尝试同步读取
        try {
          const ab = fs.readFileSync(curPath);
          if (ab) {
            const buf = (ab instanceof ArrayBuffer) ? ab : (ab.buffer || ab);
            if (buf && buf.byteLength > 0) {
              console.log(`[Adapter Reader] ✅ readFileSync 成功: ${curPath} (${buf.byteLength} 字节)`);
              paths.forEach(k => { root.__fileCache[k] = buf; });
              return resolve(buf);
            }
          }
        } catch (e) {
          // 同步失败，紧接着尝试异步 readFile
        }

        // 尝试异步读取
        fs.readFile({
          filePath: curPath,
          success: function (res) {
            if (res && res.data) {
              const buf = (res.data instanceof ArrayBuffer) ? res.data : (res.data.buffer || res.data);
              if (buf && buf.byteLength > 0) {
                console.log(`[Adapter Reader] ✅ readFile 异步成功: ${curPath} (${buf.byteLength} 字节)`);
                paths.forEach(k => { root.__fileCache[k] = buf; });
                return resolve(buf);
              }
            }
            tryNext();
          },
          fail: function () {
            tryNext();
          }
        });
      }

      tryNext();
    });
  }
  root.__loadLocalBuffer = loadLocalBuffer;

  root.fetch = function (input, init) {
    const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
    
    // 1. WASM 资源拦截 (涵盖 codeUrl, wasm, build.wasm, .wasm, 78675d3236180fa3ceddab8a23a2032e)
    if (url.includes('wasm') || url.includes('78675d3236180fa3ceddab8a23a2032e') || url.endsWith('.wasm')) {
      console.log('[Unity Adapter Fetch] 拦截到 WASM 资源请求:', url);
      if (root.__wasmBuffer) {
        return Promise.resolve(new MiniResponse(root.__wasmBuffer, 200, { 'content-type': 'application/wasm' }));
      }
      const wasmCandidates = [
        'wasm/78675d3236180fa3ceddab8a23a2032e.wasm',
        './wasm/78675d3236180fa3ceddab8a23a2032e.wasm',
        '78675d3236180fa3ceddab8a23a2032e.wasm',
        'wasm/78675d3236180fa3ceddab8a23a2032e.wasm.unityweb',
        './wasm/78675d3236180fa3ceddab8a23a2032e.wasm.unityweb'
      ];
      return loadLocalBuffer(wasmCandidates).then(buf => {
        root.__wasmBuffer = buf;
        return new MiniResponse(buf, 200, { 'content-type': 'application/wasm' });
      }).catch(err => {
        console.error('[Unity Adapter Fetch] WASM 本地读取全部失败:', err);
        if (originalFetch) return originalFetch(input, init);
        return Promise.reject(err);
      });
    }

    // 2. DATA 资产拦截 (涵盖 dataUrl, .bin, data.unityweb, .data, a22d7abc1ee3cd7b71a65e48bb3d9b2e)
    if (url.includes('.bin') || url.includes('data') || url.includes('a22d7abc1ee3cd7b71a65e48bb3d9b2e')) {
      console.log('[Unity Adapter Fetch] 拦截到 DATA 资产请求:', url);
      if (root.__dataBuffer) {
        return Promise.resolve(new MiniResponse(root.__dataBuffer, 200, { 'content-type': 'application/octet-stream' }));
      }
      const dataCandidates = [
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        './data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        'a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin',
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb',
        './data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb',
        'data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.data'
      ];
      return loadLocalBuffer(dataCandidates).then(buf => {
        root.__dataBuffer = buf;
        return new MiniResponse(buf, 200, { 'content-type': 'application/octet-stream' });
      }).catch(err => {
        console.error('[Unity Adapter Fetch] DATA 本地读取全部失败:', err);
        if (originalFetch) return originalFetch(input, init);
        return Promise.reject(err);
      });
    }

    // 3. FRAMEWORK 框架拦截 (涵盖 framework.js, 0b14ddffb6d6867f4577189187985cab)
    if (url.includes('framework.js') || url.includes('0b14ddffb6d6867f4577189187985cab')) {
      console.log('[Unity Adapter Fetch] 拦截到 Framework 脚本请求:', url);
      if (root.__frameworkBuffer) {
        return Promise.resolve(new MiniResponse(root.__frameworkBuffer, 200, { 'content-type': 'application/javascript' }));
      }
      const fwCandidates = [
        'Build/0b14ddffb6d6867f4577189187985cab.framework.js',
        'Build/0b14ddffb6d6867f4577189187985cab.framework.js.unityweb',
        './Build/0b14ddffb6d6867f4577189187985cab.framework.js',
        '0b14ddffb6d6867f4577189187985cab.framework.js'
      ];
      return loadLocalBuffer(fwCandidates).then(buf => {
        root.__frameworkBuffer = buf;
        return new MiniResponse(buf, 200, { 'content-type': 'application/javascript' });
      }).catch(err => {
        console.warn('[Unity Adapter Fetch] Framework 物理文件未直接读到，回退空缓冲保障 Blob 构建:', err.message);
        const emptyBuf = new ArrayBuffer(0);
        return Promise.resolve(new MiniResponse(emptyBuf, 200, { 'content-type': 'application/javascript' }));
      });
    }

    // 4. 原生/其他网络请求走兜底
    if (originalFetch) {
      return originalFetch(input, init);
    }
    return Promise.reject(new Error('Fetch not supported in this runtime: ' + url));
  };

  // ==========================================
  // 6. 持久化存储 (localStorage -> tt.get/setStorageSync)
  // ==========================================

  if (typeof root.localStorage === 'undefined' && typeof tt !== 'undefined') {
    root.localStorage = {
      getItem: function (key) {
        try { return tt.getStorageSync(key); } catch (e) { return null; }
      },
      setItem: function (key, value) {
        try { tt.setStorageSync(key, String(value)); } catch (e) {}
      },
      removeItem: function (key) {
        try { tt.removeStorageSync(key); } catch (e) {}
      },
      clear: function () {
        try { tt.clearStorageSync(); } catch (e) {}
      }
    };
  }

  console.log('[Unity MiniGame Adapter] 适配层装载完成！主画布尺寸:', mainCanvas.width, 'x', mainCanvas.height);
})();
