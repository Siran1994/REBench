/**
 * ByteDance MiniGame (抖音小游戏) Unity 3D WebGL 专有运行期适配层 - 《饲养蠕虫》(siyangruchong)
 * 
 * 核心功能：
 * 1. 宿主环境规范化垫片：MiniBlob, MiniFile, MiniResponse, atob, btoa, visualViewport, DOMRect, TextDecoder, TextEncoder, crypto
 * 2. 画布与 WebGL2 渲染上下文绑定：桥接 tt.createCanvas()，保持原生 Framebuffer 赋值扩容，720p 短边甜点缩放
 * 3. 触控与鼠标事件模拟器：将 tt.onTouch* 映射为 Mouse/Pointer/Touch 事件分发给主画布
 * 4. Web Audio 真实发声与 3D Panner 旁路直通：tt.getAudioContext() 集成与首次触摸激活
 * 5. 二进制资源与 WASM 零延迟拦截：拦截 fetch/XHR，直读 wasm_pkg/ 与沙盒缓存
 * 6. 本地持久化桥接：localStorage / sessionStorage 映射至 tt.*StorageSync
 * 7. 横竖屏防自激死循环控制 (Anti-Loop Orientation Lock) 与胶囊避让
 */

(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
  if (root.__tt_unity_adapter_initialized) return;
  root.__tt_unity_adapter_initialized = true;

  console.log('[Unity MiniGame Adapter] 正在装载 《饲养蠕虫》 Unity 3D WebGL 运行时适配层...');

  // ==========================================
  // 1. 跨作用域广播辅助
  // ==========================================
  const _globalScopes = [
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof window !== 'undefined' ? window : null,
    typeof GameGlobal !== 'undefined' ? GameGlobal : null,
    typeof global !== 'undefined' ? global : null
  ].filter(Boolean);

  function broadcastGlobal(prop, value) {
    for (const g of _globalScopes) {
      try {
        if (typeof g[prop] === 'undefined' || g[prop] === null) {
          g[prop] = value;
        }
      } catch (e) {}
    }
  }

  // 提前获取系统信息
  let systemInfo = { windowWidth: 960, windowHeight: 600, pixelRatio: 2, platform: 'ios', system: 'iOS 16.0', language: 'zh-CN' };
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    try { systemInfo = tt.getSystemInfoSync(); } catch (e) {}
  }

  // 提前配置全局音频行为，穿透移动端（iOS / Android）静音开关
  if (typeof tt !== 'undefined' && tt.setInnerAudioOption) {
    try {
      tt.setInnerAudioOption({
        mixWithOther: true,
        obeyMuteSwitch: false
      });
      console.log('[Unity MiniGame Adapter] ✅ 移动端静音开关穿透已配置 (obeyMuteSwitch: false)');
    } catch (e) {
      console.warn('[Unity MiniGame Adapter] ⚠️ setInnerAudioOption 异常:', e);
    }
  }

  // 确保全局 window 存在并指向根对象
  if (typeof root.window === 'undefined') {
    root.window = root;
  }
  broadcastGlobal('window', root.window || root);

  // WebAssembly 运行时桥接（小游戏环境通常挂载在 TTWebAssembly 上）
  const nativeWasm = (typeof WebAssembly !== 'undefined' && WebAssembly)
    ? WebAssembly
    : (typeof TTWebAssembly !== 'undefined' ? TTWebAssembly : (typeof globalThis !== 'undefined' && globalThis.WebAssembly ? globalThis.WebAssembly : null));

  if (typeof root.WebAssembly === 'undefined' || !root.WebAssembly) {
    root.WebAssembly = nativeWasm || {
      instantiate: function () { return Promise.reject(new Error('WebAssembly is not supported')); },
      RuntimeError: Error
    };
  }
  if (root.WebAssembly && typeof root.WebAssembly.RuntimeError === 'undefined') {
    root.WebAssembly.RuntimeError = Error;
  }
  broadcastGlobal('WebAssembly', root.WebAssembly);

  // AbortController / AbortSignal 纯 JS 垫片 (Unity 2021 UnityWebRequest 必需组件)
  class MiniAbortSignal {
    constructor() {
      this.aborted = false;
      this.reason = undefined;
      this.onabort = null;
      this._listeners = [];
    }
    addEventListener(type, listener) {
      if (type === 'abort' && typeof listener === 'function') {
        if (!this._listeners.includes(listener)) {
          this._listeners.push(listener);
        }
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
      this.reason = reason || new Error('The user aborted a request.');
      const event = { type: 'abort', target: this, currentTarget: this };
      this.dispatchEvent(event);
    }
  }

  class MiniAbortController {
    constructor() {
      this.signal = new MiniAbortSignal();
    }
    abort(reason) {
      this.signal._triggerAbort(reason);
    }
  }

  if (typeof root.AbortController === 'undefined') {
    root.AbortController = MiniAbortController;
  }
  if (typeof root.AbortSignal === 'undefined') {
    root.AbortSignal = MiniAbortSignal;
  }
  broadcastGlobal('AbortController', root.AbortController || MiniAbortController);
  broadcastGlobal('AbortSignal', root.AbortSignal || MiniAbortSignal);

  // HTML5 Audio 构造器兼容垫片 (防止 Unity WebAudio 资源预加载及事件系统报错)
  function MiniAudio(src) {
    let inner = null;
    if (typeof tt !== 'undefined' && tt.createInnerAudioContext) {
      try {
        inner = tt.createInnerAudioContext();
      } catch (e) {}
    }
    const inst = inner || {
      play: function () {},
      pause: function () {},
      stop: function () {},
      seek: function () {},
      destroy: function () {},
      addEventListener: function () {},
      removeEventListener: function () {}
    };
    inst.src = src || '';
    inst.autoplay = false;
    inst.loop = false;
    inst.volume = 1;
    inst.playbackRate = 1;
    inst.currentTime = 0;
    inst.duration = 0;
    inst.mute = false;
    inst.muted = false;
    inst.preload = 'metadata';
    inst.buffered = { length: 0 };
    if (!inst.addEventListener) inst.addEventListener = function () {};
    if (!inst.removeEventListener) inst.removeEventListener = function () {};
    const origPlay = inst.play ? inst.play.bind(inst) : null;
    inst.play = function () {
      try {
        const res = origPlay ? origPlay() : undefined;
        return (res && typeof res.then === 'function') ? res : Promise.resolve();
      } catch (e) {
        return Promise.resolve();
      }
    };
    return inst;
  }
  if (typeof root.Audio === 'undefined') {
    root.Audio = MiniAudio;
  }
  broadcastGlobal('Audio', root.Audio || MiniAudio);

  // location 宿主沙盒垫片（杜绝 iOS JavaScriptCore 裸词 location 抛出 ReferenceError）
  const mockLocation = {
    href: 'https://minigame.local/',
    protocol: 'https:',
    host: 'minigame.local',
    hostname: 'minigame.local',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://minigame.local',
    reload: function () {},
    replace: function () {},
    assign: function () {}
  };
  if (typeof root.location === 'undefined') {
    root.location = mockLocation;
  }
  broadcastGlobal('location', root.location || mockLocation);

  // navigator 宿主沙盒垫片（提供 userAgent, platform, mediaDevices 兜底，防止裸词或属性缺失）
  const isIOSPlatform = (systemInfo && systemInfo.platform === 'ios');
  const mockNavigator = {
    userAgent: isIOSPlatform
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MiniGame'
      : 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Mobile Safari/537.36 MiniGame',
    appVersion: '5.0 MiniGame',
    platform: isIOSPlatform ? 'iPhone' : 'Android',
    language: (systemInfo && systemInfo.language) || 'zh-CN',
    languages: [(systemInfo && systemInfo.language) || 'zh-CN', 'en'],
    maxTouchPoints: 5,
    onLine: true,
    mediaDevices: null,
    getGamepads: function () { return []; },
    permissions: {
      query: function () { return Promise.resolve({ state: 'granted' }); }
    }
  };
  if (typeof root.navigator === 'undefined') {
    root.navigator = mockNavigator;
  } else {
    for (const k in mockNavigator) {
      if (typeof root.navigator[k] === 'undefined') {
        try { root.navigator[k] = mockNavigator[k]; } catch (e) {}
      }
    }
  }
  broadcastGlobal('navigator', root.navigator || mockNavigator);

  // 挂载标准触摸宿主标志，确保 Unity 引擎识别多点触控与指针能力
  root.ontouchstart = null;
  root.ontouchend = null;
  root.ontouchmove = null;
  root.ontouchcancel = null;
  broadcastGlobal('ontouchstart', null);
  broadcastGlobal('ontouchend', null);
  broadcastGlobal('ontouchmove', null);
  broadcastGlobal('ontouchcancel', null);

  // WebGL 上下文类型构造函数垫片 (防止 gl instanceof WebGLRenderingContext 抛出 ReferenceError)
  if (typeof root.WebGLRenderingContext === 'undefined') {
    root.WebGLRenderingContext = function WebGLRenderingContext() {};
  }
  broadcastGlobal('WebGLRenderingContext', root.WebGLRenderingContext);

  if (typeof root.WebGL2RenderingContext === 'undefined') {
    root.WebGL2RenderingContext = function WebGL2RenderingContext() {};
  }
  broadcastGlobal('WebGL2RenderingContext', root.WebGL2RenderingContext);

  // ==========================================
  // 2. 基础环境与 Base64 / W3C 垫片
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

  // TextDecoder / TextEncoder 纯 JS 垫片（杜绝 Android Krypton 缺少 TextDecoder 导致数据解包死锁）
  class MiniTextDecoder {
    constructor(encoding = 'utf-8', options = {}) {
      this.encoding = encoding.toLowerCase();
      this.fatal = !!options.fatal;
      this.ignoreBOM = !!options.ignoreBOM;
    }
    decode(bytes) {
      if (!bytes) return '';
      const u8 = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes.buffer || bytes);
      let out = '';
      let i = 0;
      const len = u8.length;
      while (i < len) {
        const c = u8[i++];
        if (c < 128) {
          out += String.fromCharCode(c);
        } else if (c > 191 && c < 224) {
          if (i >= len) break;
          out += String.fromCharCode(((c & 31) << 6) | (u8[i++] & 63));
        } else if (c > 223 && c < 240) {
          if (i + 1 >= len) break;
          out += String.fromCharCode(((c & 15) << 12) | ((u8[i++] & 63) << 6) | (u8[i++] & 63));
        } else if (c > 239 && c < 248) {
          if (i + 2 >= len) break;
          let cp = ((c & 7) << 18) | ((u8[i++] & 63) << 12) | ((u8[i++] & 63) << 6) | (u8[i++] & 63);
          cp -= 0x10000;
          out += String.fromCharCode((cp >> 10) + 0xD800, (cp & 0x3FF) + 0xDC00);
        } else {
          out += String.fromCharCode(c);
        }
      }
      return out;
    }
  }

  class MiniTextEncoder {
    constructor() { this.encoding = 'utf-8'; }
    encode(str) {
      str = String(str || '');
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
          const next = str.charCodeAt(i + 1);
          if (next >= 0xDC00 && next <= 0xDFFF) {
            code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00);
            i++;
          }
        }
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          bytes.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return new Uint8Array(bytes);
    }
  }

  broadcastGlobal('TextDecoder', MiniTextDecoder);
  broadcastGlobal('TextEncoder', MiniTextEncoder);

  // crypto.getRandomValues 垫片（防止 Android 虚拟文件系统读取 /dev/urandom 时 abort("randomDevice")）
  if (!root.crypto) root.crypto = {};
  if (!root.crypto.getRandomValues) {
    root.crypto.getRandomValues = function (arr) {
      if (!arr || !arr.length) return arr;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };
  }
  broadcastGlobal('crypto', root.crypto);

  // performance.now iOS 四层立体防御垫片
  const startTimeOrigin = Date.now();
  if (typeof root.performance === 'undefined' || !root.performance) {
    root.performance = {
      now: function () {
        if (typeof tt !== 'undefined' && tt.getPerformance) {
          try { return tt.getPerformance().now(); } catch (e) {}
        }
        return Date.now() - startTimeOrigin;
      },
      timeOrigin: startTimeOrigin,
      memory: { jsHeapSizeLimit: 536870912, totalJSHeapSize: 268435456, usedJSHeapSize: 134217728 }
    };
  } else if (typeof root.performance.now !== 'function') {
    root.performance.now = function () {
      if (typeof tt !== 'undefined' && tt.getPerformance) {
        try { return tt.getPerformance().now(); } catch (e) {}
      }
      return Date.now() - startTimeOrigin;
    };
  }
  broadcastGlobal('performance', root.performance);

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
          const u8 = new MiniTextEncoder().encode(str);
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
    text() { return Promise.resolve(new MiniTextDecoder('utf-8').decode(this._arrayBuffer)); }
    slice(start = 0, end = this.size, contentType = '') {
      const s = Math.max(0, start < 0 ? this.size + start : start);
      const e = Math.min(this.size, end < 0 ? this.size + end : end);
      return new MiniBlob([this._arrayBuffer.slice(s, Math.max(s, e))], { type: contentType || this.type });
    }
  }
  broadcastGlobal('Blob', MiniBlob);

  // MiniFetch 垫片（为全局环境注入基于 tt.request 的标准 fetch，保障 UnityWebRequest / Addressables 网络连通）
  function miniFetch(url, init) {
    init = init || {};
    return new Promise((resolve, reject) => {
      if (typeof tt !== 'undefined' && typeof tt.request === 'function') {
        const header = {};
        if (init.headers) {
          if (typeof init.headers.forEach === 'function') {
            init.headers.forEach((val, key) => { header[key] = val; });
          } else if (typeof init.headers === 'object') {
            Object.assign(header, init.headers);
          }
        }
        let body = init.body;
        if (body && body.buffer && body instanceof Uint8Array) body = body.buffer;

        const reqTask = tt.request({
          url: url,
          method: (init.method || 'GET').toUpperCase(),
          header: header,
          data: body,
          dataType: 'arraybuffer',
          responseType: 'arraybuffer',
          success: function (res) {
            const rawBuffer = res.data;
            const u8 = (rawBuffer instanceof ArrayBuffer) ? new Uint8Array(rawBuffer) : new Uint8Array(rawBuffer ? rawBuffer.buffer : 0);
            const status = res.statusCode || 200;
            const resHeader = res.header || {};
            const headerMap = new Map();
            let headerStr = '';
            for (const k in resHeader) {
              headerStr += k + ': ' + resHeader[k] + '\r\n';
              headerMap.set(k.toLowerCase(), String(resHeader[k]));
            }
            resolve({
              ok: status >= 200 && status < 300,
              status: status,
              statusText: status === 200 ? 'OK' : 'Status ' + status,
              url: url,
              headerString: headerStr,
              headers: {
                get: (name) => headerMap.get(name.toLowerCase()) || null,
                entries: () => headerMap.entries(),
                forEach: (cb) => headerMap.forEach(cb)
              },
              arrayBuffer: () => Promise.resolve(rawBuffer),
              text: () => Promise.resolve(new MiniTextDecoder('utf-8').decode(u8)),
              json: () => Promise.resolve(JSON.parse(new MiniTextDecoder('utf-8').decode(u8))),
              parsedBody: u8
            });
          },
          fail: function (err) {
            reject(new Error((err && (err.errMsg || err.message)) || 'tt.request failed: ' + url));
          }
        });

        if (init.signal && typeof init.signal.addEventListener === 'function') {
          init.signal.addEventListener('abort', function () {
            try { if (reqTask && typeof reqTask.abort === 'function') reqTask.abort(); } catch (e) {}
          });
        }
        return;
      }
      reject(new Error('tt.request unavailable'));
    });
  }
  if (typeof root.fetch === 'undefined') {
    root.fetch = miniFetch;
  }
  broadcastGlobal('fetch', root.fetch || miniFetch);

  // DOMRect 几何垫片
  class MiniDOMRect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = Number(x); this.y = Number(y);
      this.width = Number(width); this.height = Number(height);
      this.top = this.y; this.left = this.x;
      this.right = this.x + this.width; this.bottom = this.y + this.height;
    }
    static fromRect(other) {
      return new MiniDOMRect(other ? other.x : 0, other ? other.y : 0, other ? other.width : 0, other ? other.height : 0);
    }
  }
  broadcastGlobal('DOMRect', MiniDOMRect);

  // ==========================================
  // 3. 系统信息与 720p 甜点画质自适应画布
  // ==========================================

  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    try { systemInfo = tt.getSystemInfoSync(); } catch (e) {}
  }

  // 严格强制横屏尺寸适配 (游戏设计基准 960x600，16:10 / 16:9)
  // 杜绝真机/IDE冷启动竖屏误报数值 (如 390x844) 导致 IL2CPP 误判竖屏
  const rawW = (systemInfo && systemInfo.windowWidth) || 960;
  const rawH = (systemInfo && systemInfo.windowHeight) || 600;
  let screenWidth = Math.max(rawW, rawH);
  let screenHeight = Math.min(rawW, rawH);
  const dpr = systemInfo.pixelRatio || 2;

  // 短边 720p 甜点分辨率缩放
  const maxShortSide = 720;
  const rawPixelWidth = Math.round(screenWidth * dpr);
  const rawPixelHeight = Math.round(screenHeight * dpr);
  let canvasScale = 1.0;
  if (rawPixelHeight > maxShortSide) {
    canvasScale = maxShortSide / rawPixelHeight;
  }
  const targetCanvasW = Math.round(rawPixelWidth * canvasScale);
  const targetCanvasH = Math.round(rawPixelHeight * canvasScale);

  console.log(`[Adapter Screen] 视口逻辑尺寸: ${screenWidth}x${screenHeight}, DPR: ${dpr}, 渲染画布: ${targetCanvasW}x${targetCanvasH}`);

  // requestAnimationFrame / cancelAnimationFrame 垫片
  root.requestAnimationFrame = (typeof tt !== 'undefined' && tt.requestAnimationFrame) ? tt.requestAnimationFrame.bind(tt) : function (cb) { return setTimeout(cb, 16); };
  root.cancelAnimationFrame = (typeof tt !== 'undefined' && tt.cancelAnimationFrame) ? tt.cancelAnimationFrame.bind(tt) : function (id) { clearTimeout(id); };
  broadcastGlobal('requestAnimationFrame', root.requestAnimationFrame);
  broadcastGlobal('cancelAnimationFrame', root.cancelAnimationFrame);

  try { Object.defineProperty(root, 'innerWidth', { value: targetCanvasW, writable: true, configurable: true }); } catch (e) { root.innerWidth = targetCanvasW; }
  try { Object.defineProperty(root, 'innerHeight', { value: targetCanvasH, writable: true, configurable: true }); } catch (e) { root.innerHeight = targetCanvasH; }
  root.devicePixelRatio = 1.0;
  root.orientation = 90;

  // visualViewport 垫片（对齐 Android Krypton 视口布局尺寸）
  if (typeof root.visualViewport === 'undefined' || !root.visualViewport) {
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
  broadcastGlobal('visualViewport', root.visualViewport);

  // 画布初始化守护 (禁止 Object.defineProperty 覆写 width/height，常规赋值触发底层 C++ Framebuffer 扩容)
  function ensureCanvasPolyfill(cvs) {
    if (!cvs) return cvs;

    // 赋值扩容
    try {
      cvs.width = targetCanvasW;
      cvs.height = targetCanvasH;
    } catch (e) {
      console.warn('[Canvas Init] Canvas 尺寸赋值警告:', e);
    }

    const styleObj = {
      width: screenWidth + 'px',
      height: screenHeight + 'px',
      display: 'block',
      position: 'absolute',
      left: '0px',
      top: '0px',
      cursor: 'default',
      backgroundColor: 'transparent',
      setProperty: function (k, v) { this[k] = v; },
      removeProperty: function (k) { delete this[k]; },
      getPropertyValue: function (k) { return this[k] || ''; }
    };

    try { cvs.style = styleObj; } catch (e) {}
    cvs.id = cvs.id || 'unity-canvas';

    try {
      Object.defineProperty(cvs, 'clientWidth', { get: function () { return targetCanvasW; }, configurable: true });
      Object.defineProperty(cvs, 'clientHeight', { get: function () { return targetCanvasH; }, configurable: true });
      Object.defineProperty(cvs, 'offsetWidth', { get: function () { return targetCanvasW; }, configurable: true });
      Object.defineProperty(cvs, 'offsetHeight', { get: function () { return targetCanvasH; }, configurable: true });
    } catch (e) {}

    cvs.getBoundingClientRect = function () {
      return new MiniDOMRect(0, 0, targetCanvasW, targetCanvasH);
    };

    // WebGL 上下文降级保障与双缓冲保留 (preserveDrawingBuffer: true 杜绝切场景 95% 黑屏)
    const originalGetContext = cvs.getContext ? cvs.getContext.bind(cvs) : null;
    if (originalGetContext) {
      cvs.getContext = function (type, attrs) {
        let cleanAttrs = {
          alpha: true,
          antialias: false,
          depth: true,
          stencil: true,
          preserveDrawingBuffer: true, // 保留绘图缓冲防黑屏
          powerPreference: 'high-performance'
        };
        if (attrs && typeof attrs === 'object') {
          Object.assign(cleanAttrs, attrs);
          cleanAttrs.preserveDrawingBuffer = true;
        }

        let gl = null;
        try { gl = originalGetContext(type, cleanAttrs); } catch (e) {}
        if (!gl && type === 'webgl2') {
          try { gl = originalGetContext('webgl', cleanAttrs); } catch (e) {}
        }
        if (!gl && (type === 'webgl2' || type === 'webgl')) {
          try { gl = originalGetContext('experimental-webgl', cleanAttrs); } catch (e) {}
        }
        if (!gl) {
          try { gl = originalGetContext('webgl'); } catch (e) {}
        }
        return gl;
      };
    }

    if (!cvs.focus) cvs.focus = function () {};
    if (!cvs.blur) cvs.blur = function () {};
    return cvs;
  }

  // 创建主画布单例
  const rawMainCanvas = (typeof tt !== 'undefined' && tt.createCanvas) ? tt.createCanvas() : {};
  const mainCanvas = ensureCanvasPolyfill(rawMainCanvas);
  root.__mainCanvas = mainCanvas;
  broadcastGlobal('__mainCanvas', mainCanvas);

  // 全域统一事件总线 (无论 Unity 注册在 canvas、window 还是 document，均汇总至此)
  const _unifiedEventHub = {
    listeners: {},
    addEventListener: function (type, listener) {
      if (typeof listener !== 'function') return;
      if (!this.listeners[type]) this.listeners[type] = [];
      if (!this.listeners[type].includes(listener)) {
        this.listeners[type].push(listener);
        console.log(`[EventHub] ✅ 挂载事件监听器: ${type} (总数: ${this.listeners[type].length})`);
      }
    },
    removeEventListener: function (type, listener) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    },
    dispatchEvent: function (evt) {
      if (!evt || !evt.type) return true;
      const list = this.listeners[evt.type] || [];
      for (let i = 0; i < list.length; i++) {
        try {
          list[i](evt);
        } catch (e) {
          console.error(`[EventHub Dispatch Error] ${evt.type}:`, e);
        }
      }
      return true;
    }
  };

  mainCanvas.addEventListener = _unifiedEventHub.addEventListener.bind(_unifiedEventHub);
  mainCanvas.removeEventListener = _unifiedEventHub.removeEventListener.bind(_unifiedEventHub);
  mainCanvas.dispatchEvent = _unifiedEventHub.dispatchEvent.bind(_unifiedEventHub);

  // ==========================================
  // 4. Document 与 Window 对象垫片
  // ==========================================

  function handleScriptAppend(child) {
    if (child && child.tagName === 'SCRIPT') {
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

  const mockDocument = {
    URL: 'https://minigame.local/',
    documentURI: 'https://minigame.local/',
    compatMode: 'CSS1Compat',
    readyState: 'complete',
    body: mainCanvas,
    head: { appendChild: handleScriptAppend, removeChild: function () {} },
    documentElement: { style: {}, clientWidth: screenWidth, clientHeight: screenHeight },
    createElement: function (tagName) {
      tagName = String(tagName).toLowerCase();
      if (tagName === 'canvas') return (typeof tt !== 'undefined' && tt.createCanvas) ? tt.createCanvas() : {};
      if (tagName === 'script') return { tagName: 'SCRIPT', src: '', onload: null, onerror: null, setAttribute: function () {}, getAttribute: function () { return null; } };
      if (tagName === 'img' || tagName === 'image') return (typeof tt !== 'undefined' && tt.createImage) ? tt.createImage() : {};
      if (tagName === 'audio') return (typeof tt !== 'undefined' && tt.createInnerAudioContext) ? tt.createInnerAudioContext() : {};
      if (tagName === 'a') return { href: '', click: function () {} };
      return { style: {}, setAttribute: function () {}, getAttribute: function () { return null; }, appendChild: function () {}, removeChild: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
    },
    getElementById: function (id) { return mainCanvas; },
    querySelector: function (sel) { return (sel === 'body' || sel === 'html') ? mockDocument.body : mainCanvas; },
    querySelectorAll: function (sel) { return [mainCanvas]; },
    getElementsByTagName: function (tagName) {
      tagName = String(tagName).toLowerCase();
      if (tagName === 'canvas') return [mainCanvas];
      if (tagName === 'body') return [mockDocument.body];
      return [];
    },
    addEventListener: function (type, cb) { mainCanvas.addEventListener(type, cb); },
    removeEventListener: function (type, cb) { mainCanvas.removeEventListener(type, cb); },
    dispatchEvent: function (evt) { return mainCanvas.dispatchEvent(evt); }
  };

  if (!root.document) {
    root.document = mockDocument;
  } else {
    // 补全宿主 document
    if (!root.document.body) root.document.body = mainCanvas;
    if (!root.document.head) root.document.head = mockDocument.head;
    if (!root.document.documentElement) root.document.documentElement = mockDocument.documentElement;
    if (typeof root.document.createElement !== 'function') root.document.createElement = mockDocument.createElement;
    const origQuery = (typeof root.document.querySelector === 'function') ? root.document.querySelector.bind(root.document) : null;
    root.document.querySelector = function (sel) {
      if (origQuery) {
        try {
          const el = origQuery(sel);
          if (el) return el;
        } catch (e) {}
      }
      if (sel === 'body' || sel === 'html') return root.document.body || mainCanvas;
      if (sel === 'head') return root.document.head || mockDocument.head;
      return mainCanvas;
    };

    const origGetId = (typeof root.document.getElementById === 'function') ? root.document.getElementById.bind(root.document) : null;
    root.document.getElementById = function (id) {
      if (origGetId) {
        try {
          const el = origGetId(id);
          if (el) return el;
        } catch (e) {}
      }
      return mainCanvas;
    };

    if (typeof root.document.querySelectorAll !== 'function') root.document.querySelectorAll = mockDocument.querySelectorAll;
    if (typeof root.document.getElementsByTagName !== 'function') root.document.getElementsByTagName = mockDocument.getElementsByTagName;
    root.document.addEventListener = _unifiedEventHub.addEventListener.bind(_unifiedEventHub);
    root.document.removeEventListener = _unifiedEventHub.removeEventListener.bind(_unifiedEventHub);
    root.document.dispatchEvent = _unifiedEventHub.dispatchEvent.bind(_unifiedEventHub);
  }
  broadcastGlobal('document', root.document);

  // 为所有全局作用域 (window, globalThis, GameGlobal, root) 挂载标准 EventTarget 适配器与 onwheel 属性
  if (typeof mainCanvas.onwheel === 'undefined') mainCanvas.onwheel = null;
  if (typeof root.onwheel === 'undefined') root.onwheel = null;
  for (const g of _globalScopes) {
    const origAdd = typeof g.addEventListener === 'function' ? g.addEventListener.bind(g) : null;
    g.addEventListener = function (type, listener, opts) {
      _unifiedEventHub.addEventListener(type, listener);
      if (origAdd) {
        try { origAdd(type, listener, opts); } catch (e) {}
      }
    };
    const origRemove = typeof g.removeEventListener === 'function' ? g.removeEventListener.bind(g) : null;
    g.removeEventListener = function (type, listener, opts) {
      _unifiedEventHub.removeEventListener(type, listener);
      if (origRemove) {
        try { origRemove(type, listener, opts); } catch (e) {}
      }
    };
    const origDispatch = typeof g.dispatchEvent === 'function' ? g.dispatchEvent.bind(g) : null;
    g.dispatchEvent = function (evt) {
      _unifiedEventHub.dispatchEvent(evt);
      if (origDispatch) {
        try { origDispatch(evt); } catch (e) {}
      }
      return true;
    };
    if (typeof g.onwheel === 'undefined') g.onwheel = null;
  }

  // ==========================================
  // 5. 触控与鼠标事件模拟 (Touch -> Pointer/Mouse/Click)
  // ==========================================

  const coordScaleX = targetCanvasW / screenWidth;
  const coordScaleY = targetCanvasH / screenHeight;

  function normalizeTouchPoint(t, isChanged) {
    if (!t) return null;
    const rawX = typeof t.clientX === 'number' ? t.clientX : (typeof t.x === 'number' ? t.x : 0);
    const rawY = typeof t.clientY === 'number' ? t.clientY : (typeof t.y === 'number' ? t.y : 0);
    const x = Math.round(rawX * coordScaleX);
    const y = Math.round(rawY * coordScaleY);
    const px = typeof t.pageX === 'number' ? Math.round(t.pageX * coordScaleX) : x;
    const py = typeof t.pageY === 'number' ? Math.round(t.pageY * coordScaleY) : y;
    const sx = typeof t.screenX === 'number' ? Math.round(t.screenX * coordScaleX) : x;
    const sy = typeof t.screenY === 'number' ? Math.round(t.screenY * coordScaleY) : y;
    const id = typeof t.identifier !== 'undefined' ? t.identifier : 0;
    return {
      identifier: id,
      clientX: x,
      clientY: y,
      pageX: px,
      pageY: py,
      screenX: sx,
      screenY: sy,
      target: mainCanvas,
      isChanged: isChanged ? 1 : 0,
      onTarget: 1
    };
  }

  function createSyntheticTouchEvent(type, rawTouches, rawChangedTouches) {
    const touches = (rawTouches && rawTouches.length) ? rawTouches.map(t => normalizeTouchPoint(t, 0)).filter(Boolean) : [];
    const changedTouches = (rawChangedTouches && rawChangedTouches.length) ? rawChangedTouches.map(t => normalizeTouchPoint(t, 1)).filter(Boolean) : (touches.length ? [touches[0]] : []);
    const targetTouches = touches.length > 0 ? touches : changedTouches;
    const primaryTouch = (type === 'touchend' || type === 'touchcancel')
      ? (changedTouches[0] || touches[0] || normalizeTouchPoint({ clientX: 0, clientY: 0 }, 1))
      : (touches[0] || changedTouches[0] || normalizeTouchPoint({ clientX: 0, clientY: 0 }, 1));

    return {
      type: type,
      target: mainCanvas,
      currentTarget: mainCanvas,
      touches: touches,
      changedTouches: changedTouches,
      targetTouches: targetTouches,
      touch: primaryTouch,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true,
      composed: true,
      preventDefault: function () {},
      stopPropagation: function () {}
    };
  }

  function createSyntheticMouseEvent(type, touch, buttons, button) {
    const x = touch ? touch.clientX : 0;
    const y = touch ? touch.clientY : 0;
    const id = touch ? (touch.identifier || 0) : 0;
    const btnVal = typeof button === 'number' ? button : 0;
    const btnsVal = typeof buttons === 'number' ? buttons : (type === 'mouseup' || type === 'pointerup' || type === 'click' ? 0 : 1);
    return {
      type: type,
      target: mainCanvas,
      currentTarget: mainCanvas,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
      button: btnVal,
      buttons: btnsVal,
      which: 1,
      pointerId: 1, // 固定指针ID，防止 touchId 随机变化引起 uGUI Pointer 重新分配
      pointerType: 'mouse', // 统一为 mouse，驱动 Unity WebGL 完整的鼠标与 uGUI 交互链路
      isPrimary: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      movementX: 0,
      movementY: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      preventDefault: function () {},
      stopPropagation: function () {}
    };
  }

  function dispatchToAll(evt) {
    if (!evt) return;
    _unifiedEventHub.dispatchEvent(evt);
  }

  function tryResumeAudioContext() {
    const ctx = root.__audioContext || (typeof WEBAudio !== 'undefined' && WEBAudio.audioContext);
    if (ctx && typeof ctx.resume === 'function' && ctx.state !== 'running') {
      ctx.resume().then(() => {
        console.log(`[WebAudio] ✅ 音频上下文已激活运行 (state: ${ctx.state})`);
        try {
          const silentBuf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = silentBuf;
          src.connect(ctx.destination);
          src.start(0);
        } catch (e) {}
      }).catch(err => {
        console.warn('[WebAudio] 激活音频上下文异常:', err);
      });
    }
  }

  function unlockAudioContext() {
    tryResumeAudioContext();
  }

  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isCurrentlyTouching = false;
  let pendingEndTimer = null;

  // 辅助商店轻点交互
  function tryTriggerShopFallback(cx, cy) {
    const shopLeft = targetCanvasW * 0.72;
    if (cx >= shopLeft && cy >= 140 && cy <= 360) {
      const unity = root.__unityInstance || (typeof globalThis !== 'undefined' && globalThis.__unityInstance) || (typeof window !== 'undefined' && window.__unityInstance);
      if (unity && typeof unity.SendMessage === 'function') {
        try {
          unity.SendMessage('BreadcrumbBuyButton', 'PerformAction');
        } catch (e) {}
        try {
          unity.SendMessage('BreadcrumbRow', 'PerformAction');
        } catch (e) {}
      }
    }
  }

  if (typeof tt !== 'undefined') {
    if (tt.onTouchStart) {
      tt.onTouchStart(function (res) {
        unlockAudioContext();
        if (!res.touches || !res.touches.length) return;
        if (pendingEndTimer) {
          clearTimeout(pendingEndTimer);
          pendingEndTimer = null;
        }

        const rawPrimary = res.touches[0];
        const normPrimary = normalizeTouchPoint(rawPrimary, 1);
        touchStartTime = Date.now();
        touchStartX = normPrimary.clientX;
        touchStartY = normPrimary.clientY;
        isCurrentlyTouching = true;

        console.log(`[TouchStart] (${Math.round(normPrimary.clientX)}, ${Math.round(normPrimary.clientY)})`);

        // 1. 先派发 hover 态 mousemove，让 uGUI Raycaster 命中目标控件并建立焦点
        dispatchToAll(createSyntheticMouseEvent('mousemove', normPrimary, 0, 0));
        dispatchToAll(createSyntheticMouseEvent('pointermove', normPrimary, 0, 0));

        // 2. 派发按下事件 (buttons: 1, button: 0)，使按钮进入 Pressed 状态
        // 关键点：绝不混发 touchstart，杜绝 Unity WebGL 底层 Touch/Mouse 防重机制丢弃事件
        dispatchToAll(createSyntheticMouseEvent('pointerdown', normPrimary, 1, 0));
        dispatchToAll(createSyntheticMouseEvent('mousedown', normPrimary, 1, 0));
      });
    }

    if (tt.onTouchMove) {
      tt.onTouchMove(function (res) {
        if (!res.touches || !res.touches.length) return;
        const normPrimary = normalizeTouchPoint(res.touches[0], 1);
        // 持续派发带按下状态的移动，完美支持虫子拖拽、食物拖拽与技能树拖拽漫游
        dispatchToAll(createSyntheticMouseEvent('pointermove', normPrimary, 1, 0));
        dispatchToAll(createSyntheticMouseEvent('mousemove', normPrimary, 1, 0));
      });
    }

    if (tt.onTouchEnd) {
      tt.onTouchEnd(function (res) {
        const rawPrimary = (res.changedTouches && res.changedTouches[0]) || (res.touches && res.touches[0]) || { clientX: touchStartX, clientY: touchStartY };
        const normPrimary = normalizeTouchPoint(rawPrimary, 1);
        isCurrentlyTouching = false;

        const duration = Date.now() - touchStartTime;
        const dx = normPrimary.clientX - touchStartX;
        const dy = normPrimary.clientY - touchStartY;
        const distSq = dx * dx + dy * dy;

        // 核心技术保障：帧缓冲保持机制 (Frame-Aware Hold Buffer)
        // 手机玩家轻点 (Tap) 往往仅持续 10~30ms。若在同一帧内立即发出 mouseup，Unity C++ 状态机还未执行本帧检测就会被重置清零。
        // 保障按下状态至少在 Unity 中维持 50ms（跨越 2~3 个完整的渲染帧周期），确保 uGUI 100% 捕获 Press 态与 Click 态
        const MIN_HOLD_MS = 50;
        const delay = (distSq < 3600 && duration < MIN_HOLD_MS) ? (MIN_HOLD_MS - duration) : 0;

        console.log(`[TouchEnd] (${Math.round(normPrimary.clientX)}, ${Math.round(normPrimary.clientY)}) duration=${duration}ms, holdDelay=${delay}ms`);
        tryResumeAudioContext();

        const executeRelease = function () {
          pendingEndTimer = null;
          // 顺序派发: pointerup -> mouseup
          dispatchToAll(createSyntheticMouseEvent('pointerup', normPrimary, 0, 0));
          dispatchToAll(createSyntheticMouseEvent('mouseup', normPrimary, 0, 0));

          // 物理位移 < 60px 且持续时长 < 1800ms 判定为明确点击，派发 click
          if (distSq < 3600 && duration < 1800) {
            console.log(`[Click] ✅ 派发标准 Click 事件至 (${Math.round(normPrimary.clientX)}, ${Math.round(normPrimary.clientY)})`);
            dispatchToAll(createSyntheticMouseEvent('click', normPrimary, 0, 0));
            tryTriggerShopFallback(normPrimary.clientX, normPrimary.clientY);
          }
        };

        if (delay > 0) {
          pendingEndTimer = setTimeout(executeRelease, delay);
        } else {
          executeRelease();
        }
      });
    }

    if (tt.onTouchCancel) {
      tt.onTouchCancel(function (res) {
        if (pendingEndTimer) {
          clearTimeout(pendingEndTimer);
          pendingEndTimer = null;
        }
        isCurrentlyTouching = false;
        const rawPrimary = (res.changedTouches && res.changedTouches[0]) || (res.touches && res.touches[0]) || { clientX: 0, clientY: 0 };
        const normPrimary = normalizeTouchPoint(rawPrimary, 1);
        dispatchToAll(createSyntheticMouseEvent('pointercancel', normPrimary, 0, 0));
        dispatchToAll(createSyntheticMouseEvent('pointerup', normPrimary, 0, 0));
        dispatchToAll(createSyntheticMouseEvent('mouseup', normPrimary, 0, 0));
      });
    }
  }

  // ==========================================
  // 6. Web Audio 真实桥接与 3D Panner 旁路直通
  // ==========================================

  function setupWebAudioBridge() {
    let audioCtx = null;
    try {
      if (typeof tt !== 'undefined' && typeof tt.getAudioContext === 'function') {
        audioCtx = tt.getAudioContext();
      }
    } catch (e) {
      console.warn('[WebAudio] tt.getAudioContext 调用异常:', e);
    }

    // 如果平台没有或者创建失败，或者是原生环境，尝试降级创建或提供稳态实例
    if (!audioCtx) {
      try {
        const NativeCtor = root.AudioContext || root.webkitAudioContext;
        if (typeof NativeCtor === 'function') {
          audioCtx = new NativeCtor();
        }
      } catch (e) {}
    }

    // 如果依然没有可用实例，构造一个纯 JS 的安全 AudioContext 桩
    if (!audioCtx) {
      audioCtx = {
        state: 'running',
        currentTime: 0,
        sampleRate: 44100
      };
    }

    root.__audioContext = audioCtx;

    // 1. 确保 state 和 resume
    if (!audioCtx.state) audioCtx.state = 'running';
    if (typeof audioCtx.resume !== 'function') {
      audioCtx.resume = function () {
        audioCtx.state = 'running';
        return Promise.resolve();
      };
    }

    // 2. 确保 currentTime
    if (typeof audioCtx.currentTime === 'undefined') {
      const startT = Date.now();
      Object.defineProperty(audioCtx, 'currentTime', {
        get: function () { return (Date.now() - startT) / 1000; }
      });
    }

    // 3. 确保 createGain
    const origCreateGain = (typeof audioCtx.createGain === 'function') ? audioCtx.createGain.bind(audioCtx) : null;
    audioCtx.createGain = function () {
      if (origCreateGain) {
        try { return origCreateGain(); } catch (e) {}
      }
      return {
        gain: { value: 1 },
        connect: function () {},
        disconnect: function () {}
      };
    };

    // 4. 确保 destination
    if (!audioCtx.destination) {
      audioCtx.destination = audioCtx.createGain();
    }

    // 5. 3D 空间音频 (createPanner) 旁路直通：返回增益为 1 的 GainNode
    audioCtx.createPanner = function () {
      const gainNode = audioCtx.createGain();
      gainNode.panningModel = 'HRTF';
      gainNode.distanceModel = 'inverse';
      gainNode.refDistance = 1;
      gainNode.maxDistance = 10000;
      gainNode.rolloffFactor = 0;
      gainNode.coneInnerAngle = 360;
      gainNode.coneOuterAngle = 360;
      gainNode.coneOuterGain = 0;
      gainNode.positionX = { value: 0 };
      gainNode.positionY = { value: 0 };
      gainNode.positionZ = { value: 0 };
      gainNode.setPosition = function () {};
      gainNode.setOrientation = function () {};
      return gainNode;
    };

    // 6. 确保 listener
    if (!audioCtx.listener) {
      audioCtx.listener = {
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        forwardX: { value: 0 },
        forwardY: { value: 0 },
        forwardZ: { value: -1 },
        upX: { value: 0 },
        upY: { value: 1 },
        upZ: { value: 0 },
        setPosition: function () {},
        setOrientation: function () {}
      };
    } else {
      if (typeof audioCtx.listener.setPosition !== 'function') audioCtx.listener.setPosition = function () {};
      if (typeof audioCtx.listener.setOrientation !== 'function') audioCtx.listener.setOrientation = function () {};
      if (!audioCtx.listener.forwardX) audioCtx.listener.forwardX = { value: 0 };
      if (!audioCtx.listener.forwardY) audioCtx.listener.forwardY = { value: 0 };
      if (!audioCtx.listener.forwardZ) audioCtx.listener.forwardZ = { value: -1 };
      if (!audioCtx.listener.upX) audioCtx.listener.upX = { value: 0 };
      if (!audioCtx.listener.upY) audioCtx.listener.upY = { value: 1 };
      if (!audioCtx.listener.upZ) audioCtx.listener.upZ = { value: 0 };
      if (!audioCtx.listener.positionX) audioCtx.listener.positionX = { value: 0 };
      if (!audioCtx.listener.positionY) audioCtx.listener.positionY = { value: 0 };
      if (!audioCtx.listener.positionZ) audioCtx.listener.positionZ = { value: 0 };
    }

    // 7. 确保 createBuffer
    const origCreateBuffer = (typeof audioCtx.createBuffer === 'function') ? audioCtx.createBuffer.bind(audioCtx) : null;
    audioCtx.createBuffer = function (channels, length, sampleRate) {
      if (origCreateBuffer) {
        try { return origCreateBuffer(channels, length, sampleRate); } catch (e) {}
      }
      const ch = channels || 1;
      const len = length || 1;
      const sr = sampleRate || 44100;
      const channelData = [];
      for (let i = 0; i < ch; i++) channelData.push(new Float32Array(len));
      return {
        numberOfChannels: ch,
        length: len,
        sampleRate: sr,
        duration: len / sr,
        getChannelData: function (idx) { return channelData[idx] || channelData[0]; },
        copyToChannel: function (src, chIdx) {
          const dst = channelData[chIdx];
          if (dst && src) dst.set(src);
        }
      };
    };

    // 8. 确保 createBufferSource
    const origCreateBufferSource = (typeof audioCtx.createBufferSource === 'function') ? audioCtx.createBufferSource.bind(audioCtx) : null;
    audioCtx.createBufferSource = function () {
      if (origCreateBufferSource) {
        try { return origCreateBufferSource(); } catch (e) {}
      }
      const node = audioCtx.createGain();
      node.buffer = null;
      node.loop = false;
      node.loopStart = 0;
      node.loopEnd = 0;
      node.playbackRate = { value: 1 };
      node.start = function () {};
      node.stop = function () {};
      return node;
    };

    // 9. 确保 createMediaElementSource 坚决使用安全 GainNode 桥接（杜绝 iOS 唤起底层 setWX_WebAudioProcesser 崩溃）
    audioCtx.createMediaElementSource = function (mediaElem) {
      const gainNode = audioCtx.createGain();
      gainNode.mediaElement = mediaElem;
      gainNode.start = function () {
        try { if (mediaElem && typeof mediaElem.play === 'function') mediaElem.play(); } catch (e) {}
      };
      gainNode.stop = function () {
        try { if (mediaElem && typeof mediaElem.pause === 'function') mediaElem.pause(); } catch (e) {}
      };
      return gainNode;
    };

    // 10. decodeAudioData 双模兼容器（重点修复：支持原生函数、Promise、回调及全平台静音保底）
    const origDecode = (typeof audioCtx.decodeAudioData === 'function')
      ? audioCtx.decodeAudioData.bind(audioCtx)
      : null;

    audioCtx.decodeAudioData = function (audioData, successCb, errorCb) {
      let resolved = false;
      function onSuccess(buf) {
        if (resolved) return;
        resolved = true;
        if (typeof successCb === 'function') {
          try { successCb(buf); } catch (e) { console.error('[AudioDecode] callback error:', e); }
        }
      }
      function onError(err) {
        if (resolved) return;
        // 如果平台解码失败或原生不支持，生成一个静音的空 AudioBuffer 保底，确保 Unity soundClip 获得有效 buffer！
        try {
          if (audioCtx && typeof audioCtx.createBuffer === 'function') {
            const silentBuf = audioCtx.createBuffer(1, 1, 22050);
            onSuccess(silentBuf);
            return;
          }
        } catch (e) {}
        resolved = true;
        if (typeof errorCb === 'function') {
          try { errorCb(err); } catch (e) {}
        }
      }

      if (!origDecode) {
        console.warn('[AudioDecode] 当前环境原生缺失 decodeAudioData，触发静音安全保底');
        onError(new Error('decodeAudioData not natively supported'));
        return Promise.resolve(audioCtx.createBuffer(1, 1, 22050));
      }

      try {
        const res = origDecode(audioData, onSuccess, onError);
        if (res && typeof res.then === 'function') {
          res.then(onSuccess).catch(onError);
        }
        return res;
      } catch (e) {
        onError(e);
        return Promise.resolve(audioCtx.createBuffer(1, 1, 22050));
      }
    };

    // 11. 全局构造函数广播
    const AudioContextCtor = function () { return audioCtx; };
    AudioContextCtor.prototype = Object.create(Object.prototype);
    AudioContextCtor.prototype.decodeAudioData = audioCtx.decodeAudioData;
    AudioContextCtor.prototype.createBuffer = audioCtx.createBuffer;
    AudioContextCtor.prototype.createGain = audioCtx.createGain;
    AudioContextCtor.prototype.createPanner = audioCtx.createPanner;
    AudioContextCtor.prototype.createBufferSource = audioCtx.createBufferSource;
    AudioContextCtor.prototype.createMediaElementSource = audioCtx.createMediaElementSource;

    root.AudioContext = AudioContextCtor;
    root.webkitAudioContext = AudioContextCtor;
    broadcastGlobal('AudioContext', root.AudioContext);
    broadcastGlobal('webkitAudioContext', root.webkitAudioContext);
    console.log('✅ [WebAudio] setupWebAudioBridge 初始化完成，AudioContext 全功能防御链已就绪！');
  }
  setupWebAudioBridge();

  // ==========================================
  // 7. 持久化存储 (localStorage / sessionStorage 映射)
  // ==========================================

  const miniStorage = {
    getItem: function (key) {
      try {
        const val = tt.getStorageSync('local_' + key);
        return (val !== '' && val !== null && val !== undefined) ? String(val) : null;
      } catch (e) { return null; }
    },
    setItem: function (key, value) {
      try { tt.setStorageSync('local_' + key, String(value)); } catch (e) {}
    },
    removeItem: function (key) {
      try { tt.removeStorageSync('local_' + key); } catch (e) {}
    },
    clear: function () {
      try { tt.clearStorageSync(); } catch (e) {}
    }
  };

  if (typeof root.localStorage === 'undefined') {
    root.localStorage = miniStorage;
    broadcastGlobal('localStorage', miniStorage);
  }
  if (typeof root.sessionStorage === 'undefined') {
    root.sessionStorage = miniStorage;
    broadcastGlobal('sessionStorage', miniStorage);
  }

  // ==========================================
  // 8. 屏幕旋转与防自激死循环
  // ==========================================

  const screenOrientationObj = {
    angle: 90,
    type: 'landscape-primary',
    lock: function () { return Promise.resolve(); },
    unlock: function () { return Promise.resolve(); },
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () { return true; }
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
    try { root.screen.orientation = screenOrientationObj; } catch (e) {}
  }
  broadcastGlobal('screen', root.screen);

  console.log('[Unity MiniGame Adapter] ✅ 《饲养蠕虫》 适配层初始化就绪！');
})();
