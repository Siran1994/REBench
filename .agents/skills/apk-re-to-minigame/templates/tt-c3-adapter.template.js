// Blob, File, ImageData, Event Polyfill
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

  arrayBuffer() {
    return Promise.resolve(this._arrayBuffer);
  }

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
    const sliced = this._arrayBuffer.slice(s, Math.max(s, e));
    return new MiniBlob([sliced], { type: contentType || this.type });
  }

  stream() {
    if (typeof ReadableStream !== 'undefined') {
      const ab = this._arrayBuffer;
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(ab));
          controller.close();
        }
      });
    }
    return null;
  }
}

class MiniFile extends MiniBlob {
  constructor(parts, name, options = {}) {
    super(parts, options);
    this.name = String(name || '');
    this.lastModified = (options && options.lastModified) || Date.now();
  }
}

class MiniImageData {
  constructor(w, h) {
    if (w instanceof Uint8ClampedArray) {
      this.data = w;
      this.width = h;
      this.height = arguments[2] || (w.length / (4 * h));
    } else {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  }
}


class MiniResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  async arrayBuffer() {
    if (this._body instanceof ArrayBuffer) return this._body;
    if (this._body && typeof this._body.arrayBuffer === 'function') return await this._body.arrayBuffer();
    if (this._body && this._body._arrayBuffer) return this._body._arrayBuffer;
    if (ArrayBuffer.isView(this._body)) {
      return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength);
    }
    return new ArrayBuffer(0);
  }
  async text() {
    if (typeof this._body === 'string') return this._body;
    if (this._body && typeof this._body.text === 'function') return await this._body.text();
    const ab = await this.arrayBuffer();
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(ab);
    const u8 = new Uint8Array(ab);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  }
  async json() {
    const txt = await this.text();
    return JSON.parse(txt);
  }
  async blob() {
    if (this._body instanceof MiniBlob) return this._body;
    return new MiniBlob([this._body]);
  }
}

class MiniEvent {
  constructor(type, options = {}) {
    this.type = String(type);
    this.bubbles = !!options.bubbles;
    this.cancelable = !!options.cancelable;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.timeStamp = Date.now();
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() {}
  stopImmediatePropagation() {}
}

class MiniCustomEvent extends MiniEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail !== undefined ? options.detail : null;
  }
}

// Global registrations
const _exposeGlobals = (target) => {
  if (!target) return;
  if (!target.Blob) target.Blob = MiniBlob;
  if (!target.File) target.File = MiniFile;
  if (!target.ImageData) target.ImageData = MiniImageData;
  if (!target.Event) target.Event = MiniEvent;
  if (!target.CustomEvent) target.CustomEvent = MiniCustomEvent;
  if (!target.Response) target.Response = MiniResponse;
};

if (typeof globalThis !== 'undefined') _exposeGlobals(globalThis);
if (typeof window !== 'undefined') _exposeGlobals(window);
if (typeof self !== 'undefined') _exposeGlobals(self);

// atob & btoa Polyfill
const _b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function _polyAtob(input) {
  if (typeof tt !== 'undefined' && tt.base64ToArrayBuffer) {
    try {
      const ab = tt.base64ToArrayBuffer(String(input));
      const u8 = new Uint8Array(ab);
      let s = '';
      const chunk = 8192;
      for (let i = 0; i < u8.length; i += chunk) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
      }
      return s;
    } catch (e) {}
  }
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(input, 'base64').toString('binary');
    } catch (e) {}
  }
  let str = String(input).replace(/[=]+$/, '');
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = '';
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = _b64chars.indexOf(buffer);
  }
  return output;
}

function _polyBtoa(input) {
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(input, 'binary').toString('base64');
    } catch (e) {}
  }
  let str = String(input);
  let output = '';
  for (
    let block = 0, charCode, idx = 0, map = _b64chars;
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

if (typeof globalThis !== 'undefined') {
  if (!globalThis.atob) globalThis.atob = _polyAtob;
  if (!globalThis.btoa) globalThis.btoa = _polyBtoa;
}
if (typeof window !== 'undefined') {
  if (!window.atob) window.atob = _polyAtob;
  if (!window.btoa) window.btoa = _polyBtoa;
}
if (typeof self !== 'undefined') {
  if (!self.atob) self.atob = _polyAtob;
  if (!self.btoa) self.btoa = _polyBtoa;
}

/**
 * Construct 3 -> ByteDance MiniGame (抖音小游戏) Adapter
 * Specifically crafted for Construct 3 Web exports running on Helium runtime.
 */

(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  // 1. Window references
  root.window = root;
  root.self = root;
  root.top = root;
  root.parent = root;
  root.isSecureContext = true;

  // Construct 3 Environment Support Flags (Must be set immediately)
  root.C3_ModernJSSupport_OK = true;
  root.C3_IsSupported = true;

  // Polyfill Intl.Segmenter (Essential for Construct 3 text segmentation on Helium/Krypton)
  if (typeof root.Intl === 'undefined') root.Intl = {};
  if (!root.Intl.Segmenter) {
    root.Intl.Segmenter = class {
      constructor(locales, options) {
        this.locales = locales;
        this.options = options || {};
      }
      segment(text) {
        const str = String(text != null ? text : '');
        const segments = [];
        let index = 0;
        for (const ch of str) {
          segments.push({ segment: ch, index, input: str });
          index += ch.length;
        }
        return segments;
      }
    };
  }

  // System metrics
  const sysInfo = typeof tt !== 'undefined' && tt.getSystemInfoSync ? tt.getSystemInfoSync() : {
    windowWidth: 393,
    windowHeight: 852,
    pixelRatio: 3,
    platform: 'android'
  };

  root.devicePixelRatio = sysInfo.pixelRatio || 3;
  root.innerWidth = sysInfo.windowWidth || 393;
  root.innerHeight = sysInfo.windowHeight || 852;

  // Window EventTarget Polyfill
  // Window EventTarget Polyfill
  const windowListeners = new Map();
  root.addEventListener = function (type, listener, options) {
    if (typeof listener !== 'function') return;
    if (!windowListeners.has(type)) windowListeners.set(type, new Set());
    windowListeners.get(type).add(listener);
  };

  root.removeEventListener = function (type, listener, options) {
    if (windowListeners.has(type)) {
      windowListeners.get(type).delete(listener);
    }
  };

  root.dispatchEvent = function (evt) {
    if (!evt || !evt.type) return true;
    const set = windowListeners.get(evt.type);
    if (set) {
      for (const fn of Array.from(set)) {
        try { fn.call(root, evt); } catch (err) { console.error('[Window Event Error]', evt.type, err); }
      }
    }
    return true;
  };

  root.matchMedia = function (query) {
    return {
      matches: false,
      media: String(query || ''),
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return true; }
    };
  };
  if (typeof window !== 'undefined') window.matchMedia = root.matchMedia;


  // Screen & Dimensions Polyfill
  const screenObj = {
    get width() { return root.innerWidth || 393; },
    get height() { return root.innerHeight || 852; },
    get availWidth() { return root.innerWidth || 393; },
    get availHeight() { return root.innerHeight || 852; },
    orientation: {
      type: 'portrait-primary',
      angle: 0,
      lock: () => Promise.resolve(),
      unlock: () => {}
    }
  };
  root.screen = screenObj;
  root.outerWidth = root.innerWidth || 393;
  root.outerHeight = root.innerHeight || 852;
  if (typeof window !== 'undefined') {
    window.screen = screenObj;
    window.outerWidth = root.outerWidth;
    window.outerHeight = root.outerHeight;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.screen = screenObj;
  }
  if (typeof self !== 'undefined') {
    self.screen = screenObj;
  }

  // Document fonts & FontFace Polyfill
  const fontSet = new Set();
  if (root.document) {
    root.document.fonts = {
      add(font) { fontSet.add(font); },
      delete(font) { return fontSet.delete(font); },
      clear() { fontSet.clear(); },
      has(font) { return fontSet.has(font); },
      load() { return Promise.resolve([]); },
      ready: Promise.resolve()
    };
    root.document.referrer = '';
    root.document.title = 'Digger Escape';
  }
  if (typeof root.FontFace === 'undefined') {
    root.FontFace = class FontFace {
      constructor(family, source, descriptors) {
        this.family = family;
        this.source = source;
        this.status = 'loaded';
      }
      load() { return Promise.resolve(this); }
    };
    if (typeof window !== 'undefined') window.FontFace = root.FontFace;
    if (typeof globalThis !== 'undefined') globalThis.FontFace = root.FontFace;
    if (typeof self !== 'undefined') self.FontFace = root.FontFace;
  }


  // VisualViewport Polyfill
  const visualViewportListeners = new Map();
  const visualViewport = {
    get width() { return root.innerWidth || 393; },
    get height() { return root.innerHeight || 852; },
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    addEventListener(type, fn) {
      if (typeof fn !== 'function') return;
      if (!visualViewportListeners.has(type)) visualViewportListeners.set(type, new Set());
      visualViewportListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      if (visualViewportListeners.has(type)) visualViewportListeners.get(type).delete(fn);
    },
    dispatchEvent(evt) {
      if (!evt || !evt.type) return true;
      const set = visualViewportListeners.get(evt.type);
      if (set) {
        for (const fn of Array.from(set)) {
          try { fn.call(visualViewport, evt); } catch (e) { console.error('[visualViewport Event Error]', e); }
        }
      }
      return true;
    }
  };
  root.visualViewport = visualViewport;
  if (typeof window !== 'undefined') window.visualViewport = visualViewport;
  if (typeof globalThis !== 'undefined') globalThis.visualViewport = visualViewport;
  if (typeof self !== 'undefined') self.visualViewport = visualViewport;


  const origGetComputedStyle = root.getComputedStyle;
  const safeGetComputedStyle = function (el, pseudoElt) {
    if (origGetComputedStyle) {
      try {
        const res = origGetComputedStyle.call(root, el, pseudoElt);
        if (res) return res;
      } catch (e) {
        // Fallback when native getComputedStyle throws Illegal invocation on MiniElement
      }
    }
    const styleObj = (el && el.style) || {};
    return new Proxy(styleObj, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function (name) {
            return target[name] || '';
          };
        }
        return target[prop] || '';
      }
    });
  };
  root.getComputedStyle = safeGetComputedStyle;
  if (typeof window !== 'undefined') window.getComputedStyle = safeGetComputedStyle;
  if (typeof globalThis !== 'undefined') globalThis.getComputedStyle = safeGetComputedStyle;
  if (typeof self !== 'undefined') self.getComputedStyle = safeGetComputedStyle;

  if (!root.scrollTo) root.scrollTo = () => {};
  if (!root.scroll) root.scroll = () => {};
  if (!root.scrollBy) root.scrollBy = () => {};
  if (!root.focus) root.focus = () => {};
  if (!root.blur) root.blur = () => {};

  // Polyfill requestIdleCallback and cancelIdleCallback to avoid Helium Illegal invocation
  root.requestIdleCallback = function (cb, options) {
    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          return Math.max(0, 50 - (now - start));
        }
      });
    }, 1);
  };
  root.cancelIdleCallback = function (id) {
    clearTimeout(id);
  };

  // Safe Image & Canvas instanceof polyfills
  const miniGameImages = new WeakSet();
  const miniGameCanvases = new WeakSet();

  let SafeImage = root.Image;
  if (typeof tt !== 'undefined' && tt.createImage) {
    const origCreateImage = tt.createImage;
    SafeImage = function () {
      const img = origCreateImage.call(tt);
      miniGameImages.add(img);
      return img;
    };
  } else if (!SafeImage) {
    SafeImage = function () {
      const img = {
        src: '',
        onload: null,
        onerror: null,
        width: 0,
        height: 0,
        tagName: 'IMG',
        nodeName: 'IMG'
      };
      miniGameImages.add(img);
      return img;
    };
  }
  root.Image = SafeImage;
  if (typeof window !== 'undefined') window.Image = SafeImage;
  if (typeof self !== 'undefined') self.Image = SafeImage;
  if (typeof globalThis !== 'undefined') globalThis.Image = SafeImage;

  if (!root.HTMLImageElement) {
    root.HTMLImageElement = class HTMLImageElement {};
  }
  try {
    Object.defineProperty(root.HTMLImageElement, Symbol.hasInstance, {
      value: function (inst) {
        if (!inst) return false;
        if (miniGameImages.has(inst)) return true;
        if (inst.tagName === 'IMG' || inst.nodeName === 'IMG') return true;
        if (typeof inst.src === 'string' && typeof inst.onload !== 'undefined') return true;
        return false;
      },
      configurable: true
    });
  } catch (e) {}

  if (!root.HTMLCanvasElement) {
    root.HTMLCanvasElement = class HTMLCanvasElement {};
  }
  if (!root.HTMLScriptElement) {
    root.HTMLScriptElement = class HTMLScriptElement {};
    root.HTMLScriptElement.prototype.noModule = true;
  }
  try {
    Object.defineProperty(root.HTMLCanvasElement, Symbol.hasInstance, {
      value: function (inst) {
        if (!inst) return false;
        if (miniGameCanvases.has(inst)) return true;
        if (inst === mainCanvas) return true;
        if (inst.tagName === 'CANVAS' || inst.nodeName === 'CANVAS') return true;
        if (typeof inst.getContext === 'function') return true;
        return false;
      },
      configurable: true
    });
  } catch (e) {}

  // Safe ImageBitmap polyfill
  if (!root.ImageBitmap) {
    root.ImageBitmap = class ImageBitmap {};
  }
  try {
    Object.defineProperty(root.ImageBitmap, Symbol.hasInstance, {
      value: function (inst) {
        if (!inst) return false;
        if (miniGameImages.has(inst)) return true;
        if (miniGameCanvases.has(inst)) return true;
        return false;
      },
      configurable: true
    });
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.HTMLImageElement = root.HTMLImageElement;
    window.HTMLCanvasElement = root.HTMLCanvasElement;
    window.HTMLScriptElement = root.HTMLScriptElement;
    window.ImageBitmap = root.ImageBitmap;
  }
  if (typeof self !== 'undefined') {
    self.HTMLImageElement = root.HTMLImageElement;
    self.HTMLCanvasElement = root.HTMLCanvasElement;
    self.HTMLScriptElement = root.HTMLScriptElement;
    self.ImageBitmap = root.ImageBitmap;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.HTMLImageElement = root.HTMLImageElement;
    globalThis.HTMLCanvasElement = root.HTMLCanvasElement;
    globalThis.HTMLScriptElement = root.HTMLScriptElement;
    globalThis.ImageBitmap = root.ImageBitmap;
  }

  const polyfillCreateImageBitmap = async function (source) {
    if (!source) return null;
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
      const cvs = typeof tt !== 'undefined' && tt.createCanvas ? tt.createCanvas() : (root.document ? root.document.createElement('canvas') : null);
      if (cvs) {
        cvs.width = source.width;
        cvs.height = source.height;
        const ctx = cvs.getContext('2d');
        if (ctx && ctx.putImageData) ctx.putImageData(source, 0, 0);
        return cvs;
      }
    }
    if (root.C3 && typeof root.C3.BlobToImage === 'function' && (source instanceof Blob || (source && typeof source.arrayBuffer === 'function') || source._dataUri || source._path)) {
      return await root.C3.BlobToImage(source);
    }
    const embedded = globalThis.__minersEmbeddedImages || globalThis.__diggerEmbeddedImages || globalThis.__embeddedImages;
    if (source._dataUri || (source._path && embedded && embedded[source._path])) {
      const uri = source._dataUri || embedded[source._path];
      return new Promise((resolve, reject) => {
        const img = root.Image ? new root.Image() : (typeof tt !== 'undefined' && tt.createImage ? tt.createImage() : null);
        if (!img) return resolve(source);
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = uri;
      });
    }
    if (source instanceof Blob || (source && typeof source.arrayBuffer === 'function')) {
      try {
        let arrayBuf = source._arrayBuffer;
        if (!arrayBuf && typeof source.arrayBuffer === 'function') {
          arrayBuf = await source.arrayBuffer();
        }
        if (arrayBuf) {
          let base64 = '';
          if (typeof tt !== 'undefined' && tt.arrayBufferToBase64) {
            base64 = tt.arrayBufferToBase64(arrayBuf);
          } else if (typeof Buffer !== 'undefined') {
            base64 = Buffer.from(arrayBuf).toString('base64');
          }
          if (base64) {
            const mime = (source && source.type) || 'image/png';
            const dataUri = `data:${mime};base64,${base64}`;
            return new Promise((resolve, reject) => {
              const img = root.Image ? new root.Image() : (typeof tt !== 'undefined' && tt.createImage ? tt.createImage() : null);
              if (!img) return resolve(source);
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = dataUri;
            });
          }
        }
      } catch (err) {
        console.warn('[polyfillCreateImageBitmap] ArrayBuffer conversion error:', err);
      }
    }
    return source;
  };
  root.createImageBitmap = polyfillCreateImageBitmap;
  if (typeof window !== 'undefined') window.createImageBitmap = polyfillCreateImageBitmap;
  if (typeof self !== 'undefined') self.createImageBitmap = polyfillCreateImageBitmap;
  if (typeof globalThis !== 'undefined') globalThis.createImageBitmap = polyfillCreateImageBitmap;

  // Safe URL object
  if (!root.URL) root.URL = {};
  root.URL.createObjectURL = function (blob) {
    if (!blob) return '';
    if (blob._dataUri) return blob._dataUri;
    if (blob._path) return blob._path;
    return '';
  };
  root.URL.revokeObjectURL = function () {};

  // 2. Safe Navigator polyfills
  if (!root.navigator) {
    root.navigator = {};
  }
  try {
    Object.defineProperty(root.navigator, 'gpu', {
      value: undefined,
      configurable: true,
      writable: true
    });
  } catch (e) {}

  try {
    let ua = 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.5414.118 Mobile Safari/537.36 MiniGame Krypton';
    const plat = (sysInfo.platform || '').toLowerCase();
    const system = (sysInfo.system || '').toLowerCase();
    const model = (sysInfo.model || '').toLowerCase();
    if (plat === 'ios' || system.includes('ios') || model.includes('iphone') || model.includes('ipad')) {
      ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MiniGame Helium';
    } else if (plat === 'android' || system.includes('android')) {
      ua = 'Mozilla/5.0 (Linux; Android 12; ' + (sysInfo.model || 'Android') + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36 MiniGame Krypton';
    } else if (typeof navigator !== 'undefined' && navigator.userAgent && !/(iphone|ipod|ipad)/i.test(navigator.userAgent)) {
      ua = navigator.userAgent;
    }
    Object.defineProperty(root.navigator, 'userAgent', {
      value: ua,
      configurable: true,
      writable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(root.navigator, 'userAgentData', {
      value: undefined,
      configurable: true,
      writable: true
    });
  } catch (e) {}

  try {
    Object.defineProperty(root.navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try { root.navigator.maxTouchPoints = 5; } catch (err) {}
  }

  try {
    Object.defineProperty(root.navigator, 'hardwareConcurrency', {
      value: 4,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try { root.navigator.hardwareConcurrency = 4; } catch (err) {}
  }

  try {
    Object.defineProperty(root.navigator, 'standalone', {
      value: false,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try { root.navigator.standalone = false; } catch (err) {}
  }

  try { root.navigator.getGamepads = () => []; } catch (e) {}
  try { root.navigator.userActivation = { hasBeenActive: true, isActive: true }; } catch (e) {}
  if (!root.navigator.languages) root.navigator.languages = ['zh-CN', 'zh', 'en'];
  if (!root.navigator.language) root.navigator.language = 'zh-CN';

  // 3. Location polyfill
  if (!root.location) root.location = {};
  root.location.protocol = root.location.protocol || 'https:';
  root.location.host = root.location.host || 'minigame.local';
  root.location.hostname = root.location.hostname || 'minigame.local';
  root.location.port = root.location.port || '';
  root.location.pathname = root.location.pathname || '/index.html';
  root.location.search = root.location.search || '';
  root.location.hash = root.location.hash || '';
  root.location.href = root.location.href || 'https://minigame.local/index.html';
  root.location.origin = root.location.origin || 'https://minigame.local';
  root.location.reload = root.location.reload || (() => {});
  root.location.toString = root.location.toString || (() => 'https://minigame.local/index.html');
  if (typeof globalThis !== 'undefined') globalThis.location = root.location;

  // 4. URL and Blob
  if (!root.URL) root.URL = {};
  if (!root.URL.createObjectURL) {
    root.URL.createObjectURL = (blob) => 'blob:' + Math.random().toString(36).substr(2);
  }
  if (!root.URL.revokeObjectURL) {
    root.URL.revokeObjectURL = () => {};
  }

  // 5. MessageChannel & MessagePort
  class MiniMessagePort {
    constructor() {
      this.otherPort = null;
      this.onmessage = null;
      this._listeners = new Set();
    }
    postMessage(data, transfer) {
      if (this.otherPort) {
        setTimeout(() => {
          const evt = { data, type: 'message', ports: transfer || [] };
          if (typeof this.otherPort.onmessage === 'function') {
            this.otherPort.onmessage(evt);
          }
          this.otherPort.dispatchEvent(evt);
        }, 0);
      }
    }
    start() {}
    close() {}
    addEventListener(type, fn) {
      if (type === 'message') this._listeners.add(fn);
    }
    removeEventListener(type, fn) {
      if (type === 'message') this._listeners.delete(fn);
    }
    dispatchEvent(evt) {
      for (const fn of this._listeners) fn(evt);
    }
  }

  class MiniMessageChannel {
    constructor() {
      this.port1 = new MiniMessagePort();
      this.port2 = new MiniMessagePort();
      this.port1.otherPort = this.port2;
      this.port2.otherPort = this.port1;
    }
  }
  // Worker shim (dispatches in main thread)
  class MiniWorker {
    constructor(url, options) {
      this.url = url;
      this.options = options || {};
      this.onmessage = null;
      this._listeners = new Set();
      this._isTerminated = false;
      setTimeout(() => {}, 0);
    }
    postMessage(data, transfer) {
      if (this._isTerminated) return;
    }
    addEventListener(type, fn) { this._listeners.add(fn); }
    removeEventListener(type, fn) { this._listeners.delete(fn); }
    dispatchEvent(evt) { for (const fn of this._listeners) fn(evt); }
    terminate() { this._isTerminated = true; }
  }

  root.MessagePort = MiniMessagePort;
  root.MessageChannel = MiniMessageChannel;
  root.Worker = MiniWorker;
  if (typeof globalThis !== 'undefined') {
    globalThis.MessagePort = MiniMessagePort;
    globalThis.MessageChannel = MiniMessageChannel;
    globalThis.Worker = MiniWorker;
  }
  if (typeof window !== 'undefined') {
    window.MessagePort = MiniMessagePort;
    window.MessageChannel = MiniMessageChannel;
    window.Worker = MiniWorker;
  }
  if (typeof self !== 'undefined') {
    self.MessagePort = MiniMessagePort;
    self.MessageChannel = MiniMessageChannel;
    self.Worker = MiniWorker;
  }

  // 6. AudioContext & Web Audio API for ByteDance MiniGame (Krypton / Helium / iOS / Android)
  function ensureAudioParam(param, defaultValue = 0) {
    if (!param || typeof param !== 'object') {
      param = { value: defaultValue };
    }
    if (typeof param.value !== 'number') param.value = defaultValue;
    if (typeof param.setValueAtTime !== 'function') {
      param.setValueAtTime = function (val) { this.value = Number(val); return this; };
    }
    if (typeof param.linearRampToValueAtTime !== 'function') {
      param.linearRampToValueAtTime = function (val) { this.value = Number(val); return this; };
    }
    if (typeof param.exponentialRampToValueAtTime !== 'function') {
      param.exponentialRampToValueAtTime = function (val) { this.value = Number(val); return this; };
    }
    if (typeof param.setTargetAtTime !== 'function') {
      param.setTargetAtTime = function (val) { this.value = Number(val); return this; };
    }
    if (typeof param.setValueCurveAtTime !== 'function') {
      param.setValueCurveAtTime = function () { return this; };
    }
    if (typeof param.cancelScheduledValues !== 'function') {
      param.cancelScheduledValues = function () { return this; };
    }
    if (typeof param.cancelAndHoldAtTime !== 'function') {
      param.cancelAndHoldAtTime = function () { return this; };
    }
    return param;
  }

  class MiniAudioContext {
    constructor() {
      this.state = 'running';
      this.destination = {
        connect() {},
        disconnect() {}
      };
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.outputLatency = 0;
      this.listener = {
        setPosition(x, y, z) {},
        setOrientation(x, y, z, xUp, yUp, zUp) {},
        positionX: ensureAudioParam({ value: 0 }, 0),
        positionY: ensureAudioParam({ value: 0 }, 0),
        positionZ: ensureAudioParam({ value: 0 }, 0),
        forwardX: ensureAudioParam({ value: 0 }, 0),
        forwardY: ensureAudioParam({ value: 0 }, 0),
        forwardZ: ensureAudioParam({ value: -1 }, -1),
        upX: ensureAudioParam({ value: 0 }, 0),
        upY: ensureAudioParam({ value: 1 }, 1),
        upZ: ensureAudioParam({ value: 0 }, 0)
      };
    }
    createBufferSource() {
      return {
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
        buffer: null,
        loop: false,
        playbackRate: ensureAudioParam({ value: 1 }, 1),
        detune: ensureAudioParam({ value: 0 }, 0)
      };
    }
    createGain() {
      return {
        connect() {},
        disconnect() {},
        gain: ensureAudioParam({ value: 1 }, 1)
      };
    }
    createPanner() {
      return {
        connect() {},
        disconnect() {},
        setPosition() {},
        setOrientation() {},
        setVelocity() {},
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0
      };
    }
    createStereoPanner() {
      return {
        connect() {},
        disconnect() {},
        pan: ensureAudioParam({ value: 0 }, 0)
      };
    }
    createBiquadFilter() {
      return {
        connect() {},
        disconnect() {},
        type: 'lowpass',
        frequency: ensureAudioParam({ value: 350 }, 350),
        Q: ensureAudioParam({ value: 1 }, 1),
        gain: ensureAudioParam({ value: 0 }, 0),
        detune: ensureAudioParam({ value: 0 }, 0)
      };
    }
    createDelay(maxDelayTime = 1) {
      return {
        connect() {},
        disconnect() {},
        delayTime: ensureAudioParam({ value: 0 }, 0)
      };
    }
    createConvolver() {
      return {
        connect() {},
        disconnect() {},
        buffer: null,
        normalize: true
      };
    }
    createDynamicsCompressor() {
      return {
        connect() {},
        disconnect() {},
        threshold: ensureAudioParam({ value: -24 }, -24),
        knee: ensureAudioParam({ value: 30 }, 30),
        ratio: ensureAudioParam({ value: 12 }, 12),
        attack: ensureAudioParam({ value: 0.003 }, 0.003),
        release: ensureAudioParam({ value: 0.25 }, 0.25)
      };
    }
    createWaveShaper() {
      return {
        connect() {},
        disconnect() {},
        curve: null,
        oversample: 'none'
      };
    }
    createOscillator() {
      return {
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
        frequency: ensureAudioParam({ value: 440 }, 440),
        detune: ensureAudioParam({ value: 0 }, 0),
        type: 'sine'
      };
    }
    createAnalyser() {
      return {
        connect() {},
        disconnect() {},
        frequencyBinCount: 1024,
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        getByteFrequencyData() {},
        getByteTimeDomainData() {},
        getFloatFrequencyData() {}
      };
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createMediaStreamDestination() {
      return { connect() {}, disconnect() {}, stream: {} };
    }
    createBuffer(numberOfChannels = 1, length = 0, sampleRate = 44100) {
      return new MiniAudioBuffer(numberOfChannels, length, sampleRate);
    }
    decodeAudioData(buffer, success, error) {
      const dummy = new MiniAudioBuffer(2, Math.round(44100), 44100);
      if (typeof success === 'function') success(dummy);
      return Promise.resolve(dummy);
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }

  class MiniAudioBuffer {
    constructor(numberOfChannels = 1, length = 0, sampleRate = 44100) {
      this.numberOfChannels = numberOfChannels || 1;
      this.length = length || 0;
      this.sampleRate = sampleRate || 44100;
      this.duration = this.length > 0 ? this.length / this.sampleRate : 0;
      this._channels = [];
      for (let i = 0; i < this.numberOfChannels; i++) {
        this._channels.push(new Float32Array(this.length));
      }
    }
    getChannelData(channel) {
      if (channel >= 0 && channel < this.numberOfChannels) {
        return this._channels[channel];
      }
      return new Float32Array(this.length);
    }
    copyFromChannel(destination, channelNumber, startInChannel = 0) {
      const ch = this.getChannelData(channelNumber);
      destination.set(ch.subarray(startInChannel, startInChannel + destination.length));
    }
    copyToChannel(source, channelNumber, startInChannel = 0) {
      const ch = this.getChannelData(channelNumber);
      ch.set(source, startInChannel);
    }
  }

  const NativeAudioContext = root.AudioContext || root.webkitAudioContext || null;

  function SafeAudioContext(options) {
    let ctx = null;
    if (typeof tt !== 'undefined' && typeof tt.getAudioContext === 'function') {
      try {
        ctx = tt.getAudioContext(options);
        console.log('[C3 Adapter] AudioContext initialized via tt.getAudioContext()');
      } catch (e) {
        console.warn('[C3 Adapter] tt.getAudioContext failed:', e);
      }
    }
    if (!ctx && typeof tt !== 'undefined' && typeof tt.getWebAudioContext === 'function') {
      try {
        ctx = tt.getWebAudioContext(options);
        console.log('[C3 Adapter] AudioContext initialized via tt.getWebAudioContext()');
      } catch (e) {
        console.warn('[C3 Adapter] tt.getWebAudioContext failed:', e);
      }
    }
    if (!ctx && typeof NativeAudioContext === 'function') {
      try {
        ctx = new NativeAudioContext(options);
        console.log('[C3 Adapter] AudioContext initialized via NativeAudioContext');
      } catch (e) {
        console.warn('[C3 Adapter] NativeAudioContext instantiation failed:', e);
      }
    }
    if (!ctx) {
      ctx = new MiniAudioContext();
      console.log('[C3 Adapter] AudioContext fallback to MiniAudioContext');
    }

    // Auto unblock audio on user touch or onShow
    const unblock = () => {
      if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }
    };
    if (typeof tt !== 'undefined') {
      if (tt.onTouchStart) tt.onTouchStart(unblock);
      if (tt.onTouchEnd) tt.onTouchEnd(unblock);
      if (tt.onShow) tt.onShow(unblock);
    }

    // Wrap createGain to guarantee full AudioParam compliance
    const origCreateGain = typeof ctx.createGain === 'function' ? ctx.createGain.bind(ctx) : null;
    ctx.createGain = function () {
      let node = null;
      if (origCreateGain) {
        try { node = origCreateGain(); } catch (e) { console.warn('[createGain error]', e); }
      }
      if (!node) {
        node = {
          connect() {},
          disconnect() {},
          gain: { value: 1 }
        };
      }
      ensureAudioParam(node.gain, 1);
      if (typeof node.connect !== 'function') node.connect = function () {};
      if (typeof node.disconnect !== 'function') node.disconnect = function () {};
      return node;
    };

    // Wrap createStereoPanner
    const origCreateStereoPanner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner.bind(ctx) : null;
    ctx.createStereoPanner = function () {
      let node = null;
      if (origCreateStereoPanner) {
        try { node = origCreateStereoPanner(); } catch (e) {}
      }
      if (!node) {
        node = {
          connect() {},
          disconnect() {},
          pan: { value: 0 }
        };
      }
      ensureAudioParam(node.pan, 0);
      if (typeof node.connect !== 'function') node.connect = function () {};
      if (typeof node.disconnect !== 'function') node.disconnect = function () {};
      return node;
    };

    // Wrap createBufferSource
    const origCreateBufferSource = typeof ctx.createBufferSource === 'function' ? ctx.createBufferSource.bind(ctx) : null;
    ctx.createBufferSource = function () {
      let node = null;
      if (origCreateBufferSource) {
        try { node = origCreateBufferSource(); } catch (e) {}
      }
      if (!node) {
        node = {
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
          buffer: null,
          loop: false,
          playbackRate: { value: 1 }
        };
      }
      ensureAudioParam(node.playbackRate, 1);
      if (node.detune) ensureAudioParam(node.detune, 0);
      if (typeof node.connect !== 'function') node.connect = function () {};
      if (typeof node.disconnect !== 'function') node.disconnect = function () {};
      if (typeof node.start !== 'function') node.start = function () {};
      if (typeof node.stop !== 'function') node.stop = function () {};
      return node;
    };

    // Wrap createBiquadFilter
    const origBiquad = typeof ctx.createBiquadFilter === 'function' ? ctx.createBiquadFilter.bind(ctx) : null;
    ctx.createBiquadFilter = function () {
      let node = null;
      if (origBiquad) {
        try { node = origBiquad(); } catch (e) {}
      }
      if (!node) {
        node = {
          connect() {},
          disconnect() {},
          frequency: { value: 350 },
          Q: { value: 1 },
          gain: { value: 0 }
        };
      }
      ensureAudioParam(node.frequency, 350);
      ensureAudioParam(node.Q, 1);
      ensureAudioParam(node.gain, 0);
      if (node.detune) ensureAudioParam(node.detune, 0);
      if (typeof node.connect !== 'function') node.connect = function () {};
      if (typeof node.disconnect !== 'function') node.disconnect = function () {};
      return node;
    };

    if (!ctx.createPanner) {
      ctx.createPanner = function () {
        return {
          connect() {},
          disconnect() {},
          setPosition() {},
          setOrientation() {},
          setVelocity() {},
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0
        };
      };
    }

    if (!ctx.listener) {
      ctx.listener = {
        setPosition: () => {},
        setOrientation: () => {}
      };
    } else {
      if (typeof ctx.listener.setPosition !== 'function') ctx.listener.setPosition = () => {};
      if (typeof ctx.listener.setOrientation !== 'function') ctx.listener.setOrientation = () => {};
    }

    if (!ctx.createBuffer) {
      ctx.createBuffer = function (numberOfChannels, length, sampleRate) {
        return new MiniAudioBuffer(numberOfChannels, length, sampleRate);
      };
    }

    if (!ctx.destination) {
      ctx.destination = { connect() {}, disconnect() {} };
    }

    if (!ctx.resume) {
      ctx.resume = function () { ctx.state = 'running'; return Promise.resolve(); };
    }
    if (!ctx.suspend) {
      ctx.suspend = function () { ctx.state = 'suspended'; return Promise.resolve(); };
    }

    const origDecodeAudioData = typeof ctx.decodeAudioData === 'function' ? ctx.decodeAudioData.bind(ctx) : null;
    ctx.decodeAudioData = function (arrayBuffer, successCallback, errorCallback) {
      const g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : self);
      const u8 = arrayBuffer ? new Uint8Array(arrayBuffer) : new Uint8Array(0);
      const isWebM = u8.length >= 4 && u8[0] === 0x1A && u8[1] === 0x45 && u8[2] === 0xDF && u8[3] === 0xA3;

      const doOpusDecode = () => {
        if (g && g.JobHandlers && typeof g.JobHandlers['OpusDecode'] === 'function') {
          return g.JobHandlers['OpusDecode']({ arrayBuffer }).then(res => {
            const floats = new Float32Array(res.result);
            const audioBuffer = ctx.createBuffer(1, floats.length, 48000);
            audioBuffer.getChannelData(0).set(floats);
            if (typeof successCallback === 'function') successCallback(audioBuffer);
            return audioBuffer;
          }).catch(err => {
            console.error('[AudioContext] OpusDecode failed:', err);
            if (typeof errorCallback === 'function') errorCallback(err);
            throw err;
          });
        }
        const err = new Error('Opus decoder not available');
        if (typeof errorCallback === 'function') errorCallback(err);
        return Promise.reject(err);
      };

      if (isWebM) {
        return doOpusDecode();
      }

      if (origDecodeAudioData) {
        try {
          const p = origDecodeAudioData(arrayBuffer, (buf) => {
            if (typeof successCallback === 'function') successCallback(buf);
          }, (err) => {
            console.warn('[AudioContext] Native decodeAudioData error, attempting Opus fallback:', err);
            doOpusDecode().catch(e => {
              if (typeof errorCallback === 'function') errorCallback(err || e);
            });
          });
          if (p && typeof p.catch === 'function') {
            p.catch(() => {
              doOpusDecode().catch(() => {});
            });
          }
          return p;
        } catch (err) {
          return doOpusDecode().catch(e => {
            if (typeof errorCallback === 'function') errorCallback(err || e);
            return Promise.reject(err || e);
          });
        }
      } else {
        return doOpusDecode();
      }
    };

    return ctx;
  }
  SafeAudioContext.prototype = (NativeAudioContext && NativeAudioContext.prototype) || MiniAudioContext.prototype;
  root.AudioContext = SafeAudioContext;
  root.webkitAudioContext = SafeAudioContext;
  root.AudioBuffer = MiniAudioBuffer;
  if (typeof window !== 'undefined') {
    window.AudioContext = SafeAudioContext;
    window.webkitAudioContext = SafeAudioContext;
    window.AudioBuffer = MiniAudioBuffer;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.AudioContext = SafeAudioContext;
    globalThis.webkitAudioContext = SafeAudioContext;
    globalThis.AudioBuffer = MiniAudioBuffer;
  }
  if (typeof self !== 'undefined') {
    self.AudioContext = SafeAudioContext;
    self.webkitAudioContext = SafeAudioContext;
    self.AudioBuffer = MiniAudioBuffer;
  }


  // 7. Minimal DOM Elements & Style
  class MiniStyle {
    constructor() {
      this.cssText = '';
    }
    setProperty(k, v) { this[k] = v; }
    getPropertyValue(k) { return this[k] || ''; }
    removeProperty(k) { delete this[k]; }
  }

  class MiniElement {
    constructor(tagName) {
      this.tagName = (tagName || 'div').toUpperCase();
      this.nodeName = this.tagName;
      this.style = new MiniStyle();
      const classes = new Set();
      this.classList = {
        add(...c) { c.forEach(x => classes.add(x)); },
        remove(...c) { c.forEach(x => classes.delete(x)); },
        contains(c) { return classes.has(c); },
        toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
      };
      this.attributes = {};
      this.children = [];
      this.parentElement = null;
      this._listeners = new Map();

      // Common HTML element properties for TextBox/Button/etc.
      this.value = '';
      this.placeholder = '';
      this.title = '';
      this.disabled = false;
      this.readOnly = false;
      this.spellcheck = false;
      this.scrollTop = 0;
      this.scrollHeight = 0;
      this.type = 'text';
      this.autocomplete = 'off';
      this.autofocus = false;
      this.tabIndex = 0;
      this.textContent = '';
      this.innerText = '';
      this.innerHTML = '';

      // Media / Video / Audio properties and methods
      let _src = '';
      Object.defineProperty(this, 'src', {
        get() { return _src; },
        set(val) {
          _src = val;
          setTimeout(() => {
            this.dispatchEvent({ type: 'loadstart' });
            this.dispatchEvent({ type: 'canplay' });
            this.dispatchEvent({ type: 'canplaythrough' });
          }, 0);
        },
        configurable: true
      });
      this.canPlayType = function (mime) {
        if (!mime) return '';
        const m = String(mime).toLowerCase();
        if (
          m.includes('webm') ||
          m.includes('opus') ||
          m.includes('vorbis') ||
          m.includes('ogg') ||
          m.includes('mp4') ||
          m.includes('h264') ||
          m.includes('avc1') ||
          m.includes('mp3') ||
          m.includes('mpeg') ||
          m.includes('m4a') ||
          m.includes('aac') ||
          m.includes('wav')
        ) {
          return 'maybe';
        }
        return '';
      };
      this.play = function () {
        this.paused = false;
        this.ended = false;
        setTimeout(() => {
          this.dispatchEvent({ type: 'playing' });
          setTimeout(() => {
            this.paused = true;
            this.ended = true;
            this.currentTime = this.duration || 1;
            this.dispatchEvent({ type: 'ended' });
          }, 60);
        }, 20);
        return Promise.resolve();
      };
      this.pause = function () {
        this.paused = true;
        this.dispatchEvent({ type: 'pause' });
      };
      this.load = function () {
        setTimeout(() => {
          this.dispatchEvent({ type: 'canplay' });
        }, 0);
      };
      try { this.currentTime = 0; } catch (e) {}
      try { this.duration = 1; } catch (e) {}
      try { this.playbackRate = 1; } catch (e) {}
      try { this.loop = false; } catch (e) {}
      try { this.muted = false; } catch (e) {}
      try { this.volume = 1; } catch (e) {}
      try { this.videoWidth = 0; } catch (e) {}
      try { this.videoHeight = 0; } catch (e) {}
      try { this.paused = true; } catch (e) {}
      try { this.ended = false; } catch (e) {}
      try { this.readyState = 4; } catch (e) {}
      try { this.crossOrigin = ''; } catch (e) {}
      try { this.playsInline = true; } catch (e) {}
      try { this.requestVideoFrameCallback = null; } catch (e) {}
      try { this.cancelVideoFrameCallback = null; } catch (e) {}
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
      if (k === 'id') this.id = v;
      if (k === 'class') this.className = v;
      if (k === 'value') this.value = String(v);
      if (k === 'type') this.type = String(v);
      if (k === 'placeholder') this.placeholder = String(v);
    }
    getAttribute(k) { return this.attributes[k] || null; }
    removeAttribute(k) {
      delete this.attributes[k];
      if (k === 'value') this.value = '';
    }
    hasAttribute(k) { return k in this.attributes; }
    appendChild(child) {
      if (!child) return child;
      try {
        if (child.parentElement && typeof child.parentElement.removeChild === 'function') {
          child.parentElement.removeChild(child);
        }
      } catch (e) {}
      try {
        child.parentElement = this;
      } catch (e) {
        try {
          Object.defineProperty(child, 'parentElement', {
            value: this,
            configurable: true,
            writable: true
          });
        } catch (err) {}
      }
      if (Array.isArray(this.children)) {
        if (!this.children.includes(child)) this.children.push(child);
      }
      return child;
    }
    removeChild(child) {
      if (!child) return child;
      if (Array.isArray(this.children)) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
      }
      try {
        child.parentElement = null;
      } catch (e) {
        try {
          Object.defineProperty(child, 'parentElement', {
            value: null,
            configurable: true,
            writable: true
          });
        } catch (err) {}
      }
      return child;
    }
    remove() {
      try {
        if (this.parentElement && typeof this.parentElement.removeChild === 'function') {
          this.parentElement.removeChild(this);
        }
      } catch (e) {}
    }
    insertBefore(newChild, refChild) {
      if (!newChild) return newChild;
      if (Array.isArray(this.children)) {
        const idx = this.children.indexOf(refChild);
        if (idx !== -1) {
          this.children.splice(idx, 0, newChild);
          try {
            newChild.parentElement = this;
          } catch (e) {
            try {
              Object.defineProperty(newChild, 'parentElement', {
                value: this,
                configurable: true,
                writable: true
              });
            } catch (err) {}
          }
          return newChild;
        }
      }
      return this.appendChild(newChild);
    }
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) {
      if (this._listeners.has(type)) this._listeners.get(type).delete(fn);
    }
    dispatchEvent(evt) {
      const set = this._listeners.get(evt.type);
      if (set) for (const fn of set) fn(evt);
    }
    getBoundingClientRect() {
      return {
        left: 0, top: 0,
        width: root.innerWidth || 393,
        height: root.innerHeight || 852,
        right: root.innerWidth || 393,
        bottom: root.innerHeight || 852,
        x: 0, y: 0
      };
    }
    focus() {}
    blur() {}
    querySelector(sel) {
      if (!sel) return null;
      sel = String(sel).toLowerCase();
      if (sel === 'head') return root.document ? root.document.head : null;
      if (sel === 'body') return root.document ? root.document.body : null;
      if (sel === 'html') return root.document ? root.document.documentElement : null;
      if (sel === 'canvas') return mainCanvas;
      const find = (node) => {
        if (!node) return null;
        const tag = (node.tagName || '').toLowerCase();
        const id = (node.id || '').toLowerCase();
        const cls = (node.className || '').toLowerCase();
        if (sel.startsWith('#') && id === sel.slice(1)) return node;
        if (sel.startsWith('.') && cls.includes(sel.slice(1))) return node;
        if (tag === sel) return node;
        if (Array.isArray(node.children)) {
          for (const c of node.children) {
            const found = find(c);
            if (found) return found;
          }
        }
        return null;
      };
      return find(this);
    }
    querySelectorAll(sel) {
      if (!sel) return [];
      sel = String(sel).toLowerCase();
      const res = [];
      const find = (node) => {
        if (!node) return;
        const tag = (node.tagName || '').toLowerCase();
        const id = (node.id || '').toLowerCase();
        const cls = (node.className || '').toLowerCase();
        if (sel.startsWith('#') && id === sel.slice(1)) res.push(node);
        else if (sel.startsWith('.') && cls.includes(sel.slice(1))) res.push(node);
        else if (tag === sel) res.push(node);
        if (Array.isArray(node.children)) {
          for (const c of node.children) find(c);
        }
      };
      find(this);
      return res;
    }
    getElementsByTagName(tag) { return this.querySelectorAll(tag); }
    getElementsByClassName(cls) { return this.querySelectorAll('.' + cls); }
  }

  // Audio constructor shim for Krypton (iOS) & Helium (Android)
  class MiniAudio extends MiniElement {
    constructor(src) {
      super('AUDIO');
      this._src = '';
      this._duration = 0;
      this._paused = true;
      this._ended = false;
      this._innerAudio = (typeof tt !== 'undefined' && typeof tt.createInnerAudioContext === 'function')
        ? tt.createInnerAudioContext()
        : null;
      this._listeners = new Map();
      this.autoplay = false;
      this.loop = false;
      this.preload = 'auto';

      if (this._innerAudio) {
        this._innerAudio.onCanplay(() => this._emit('canplay'));
        this._innerAudio.onPlay(() => {
          this._paused = false;
          this._ended = false;
          this._emit('play');
        });
        this._innerAudio.onPause(() => {
          this._paused = true;
          this._emit('pause');
        });
        this._innerAudio.onStop(() => {
          this._paused = true;
          this._ended = true;
          this._emit('ended');
        });
        this._innerAudio.onEnded(() => {
          this._paused = true;
          this._ended = true;
          this._emit('ended');
        });
        this._innerAudio.onError((err) => this._emit('error', err));
      }

      if (src) this.src = src;
    }

    get src() { return this._src; }
    set src(val) {
      this._src = val;
      if (this._innerAudio && val) {
        let clean = String(val);
        if (clean.startsWith('https://minigame.local/')) clean = clean.substring('https://minigame.local/'.length);
        if (clean.startsWith('file:///')) clean = clean.substring('file:///'.length);
        if (clean.startsWith('./')) clean = clean.substring(2);
        if (clean.startsWith('/')) clean = clean.substring(1);
        this._innerAudio.src = clean;
      }
    }

    get currentTime() { return this._innerAudio ? (this._innerAudio.currentTime || 0) : 0; }
    set currentTime(val) { if (this._innerAudio) this._innerAudio.seek(val); }

    get duration() { return this._innerAudio ? (this._innerAudio.duration || this._duration || 0) : (this._duration || 0); }
    set duration(val) { this._duration = Number(val) || 0; }

    get volume() { return this._innerAudio ? this._innerAudio.volume : 1; }
    set volume(val) { if (this._innerAudio) this._innerAudio.volume = Math.max(0, Math.min(1, val)); }

    get muted() { return this.volume === 0; }
    set muted(val) { if (this._innerAudio) this._innerAudio.volume = val ? 0 : 1; }

    get playbackRate() { return this._innerAudio ? (this._innerAudio.playbackRate || 1) : 1; }
    set playbackRate(val) { if (this._innerAudio && this._innerAudio.playbackRate !== undefined) this._innerAudio.playbackRate = val; }

    get paused() { return this._innerAudio ? (this._innerAudio.paused !== false) : (this._paused !== false); }
    set paused(val) { this._paused = !!val; }

    get readyState() { return 4; }
    set readyState(val) {}

    get ended() { return this._innerAudio ? (this._innerAudio.ended || false) : (this._ended || false); }
    set ended(val) { this._ended = !!val; }

    play() {
      this._paused = false;
      this._ended = false;
      if (this._innerAudio) {
        this._innerAudio.loop = this.loop;
        this._innerAudio.play();
      }
      return Promise.resolve();
    }

    pause() {
      this._paused = true;
      if (this._innerAudio) {
        this._innerAudio.pause();
      }
    }

    canPlayType(mime) {
      if (!mime) return '';
      const m = String(mime).toLowerCase();
      if (m.includes('webm') || m.includes('opus') || m.includes('vorbis') || m.includes('ogg')) {
        return '';
      }
      if (
        m.includes('mp4') ||
        m.includes('h264') ||
        m.includes('avc1') ||
        m.includes('mp3') ||
        m.includes('mpeg') ||
        m.includes('m4a') ||
        m.includes('aac') ||
        m.includes('wav')
      ) {
        return 'maybe';
      }
      return '';
    }

    addEventListener(type, cb) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(cb);
    }

    removeEventListener(type, cb) {
      if (this._listeners.has(type)) {
        this._listeners.get(type).delete(cb);
      }
    }

    _emit(type, data) {
      const set = this._listeners.get(type);
      if (set) {
        const evt = { type, target: this, ...data };
        set.forEach(cb => { try { cb(evt); } catch (e) {} });
      }
      if (typeof this['on' + type] === 'function') {
        try { this['on' + type]({ type, target: this, ...data }); } catch (e) {}
      }
    }
  }

  // FileReader shim
  class MiniFileReader {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.result = null;
    }
    readAsArrayBuffer(blob) {
      setTimeout(async () => {
        try {
          if (blob && blob._arrayBuffer) {
            this.result = blob._arrayBuffer;
          } else if (blob && typeof blob.arrayBuffer === 'function') {
            this.result = await blob.arrayBuffer();
          } else {
            this.result = new ArrayBuffer(0);
          }
          if (this.onload) this.onload({ target: { result: this.result } });
        } catch (err) {
          if (this.onerror) this.onerror(err);
        }
      }, 0);
    }
    readAsText(blob, encoding) {
      setTimeout(async () => {
        try {
          let ab;
          if (blob && blob._arrayBuffer) ab = blob._arrayBuffer;
          else if (blob && typeof blob.arrayBuffer === 'function') ab = await blob.arrayBuffer();
          else ab = new ArrayBuffer(0);
          this.result = (typeof TextDecoder !== 'undefined') ? new TextDecoder(encoding || 'utf-8').decode(ab) : '';
          if (this.onload) this.onload({ target: { result: this.result } });
        } catch (err) {
          if (this.onerror) this.onerror(err);
        }
      }, 0);
    }
    readAsDataURL(blob) {
      setTimeout(() => {
        this.result = (blob && blob._dataUri) || '';
        if (this.onload) this.onload({ target: { result: this.result } });
      }, 0);
    }
  }

  // FontFace shim
  class MiniFontFace {
    constructor(family, source, descriptors) {
      this.family = family;
      this.source = source;
      this.status = 'loaded';
    }
    load() { return Promise.resolve(this); }
  }

  // URLSearchParams shim
  class MiniURLSearchParams {
    constructor(init) {
      this._params = new Map();
      if (typeof init === 'string') {
        const query = init.startsWith('?') ? init.slice(1) : init;
        query.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) this._params.set(decodeURIComponent(k), decodeURIComponent(v || ''));
        });
      }
    }
    get(k) { return this._params.get(k) || null; }
    has(k) { return this._params.has(k); }
    set(k, v) { this._params.set(k, String(v)); }
    append(k, v) { this._params.set(k, String(v)); }
    delete(k) { this._params.delete(k); }
    toString() {
      const parts = [];
      for (const [k, v] of this._params.entries()) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      return parts.join('&');
    }
  }

  // Register Audio, FileReader, FontFace, URLSearchParams across all global scopes
  const globalTargets = [
    root,
    (typeof globalThis !== 'undefined' ? globalThis : null),
    (typeof window !== 'undefined' ? window : null),
    (typeof self !== 'undefined' ? self : null),
    (typeof global !== 'undefined' ? global : null)
  ];
  globalTargets.forEach(target => {
    if (target) {
      target.Audio = MiniAudio;
      if (!target.HTMLAudioElement) target.HTMLAudioElement = MiniAudio;
      if (!target.HTMLVideoElement) target.HTMLVideoElement = MiniElement;
      if (!target.HTMLMediaElement) target.HTMLMediaElement = MiniElement;
      if (!target.FileReader) target.FileReader = MiniFileReader;
      if (!target.FontFace) target.FontFace = MiniFontFace;
      if (!target.URLSearchParams) target.URLSearchParams = MiniURLSearchParams;
      if (!target.OfflineAudioContext) target.OfflineAudioContext = target.AudioContext || root.AudioContext;
    }
  });

  // 8. Main Canvas Management
  let mainCanvas = null;
  let mainCanvasAssigned = false;

  function getOnScreenCanvas() {
    if (typeof canvas !== 'undefined' && canvas) {
      console.log('[C3 Adapter] Bound to global canvas');
      return canvas;
    }
    if (typeof root !== 'undefined' && root.canvas) {
      console.log('[C3 Adapter] Bound to root.canvas');
      return root.canvas;
    }
    if (typeof window !== 'undefined' && window.canvas) {
      console.log('[C3 Adapter] Bound to window.canvas');
      return window.canvas;
    }
    if (typeof globalThis !== 'undefined' && globalThis.canvas) {
      console.log('[C3 Adapter] Bound to globalThis.canvas');
      return globalThis.canvas;
    }
    if (typeof tt !== 'undefined' && tt.createCanvas) {
      console.log('[C3 Adapter] Created canvas via tt.createCanvas()');
      return tt.createCanvas();
    }
    return null;
  }

  function getOrCreateMainCanvas() {
    if (!mainCanvas) {
      mainCanvas = getOnScreenCanvas();
      if (!mainCanvas) {
        mainCanvas = new MiniElement('CANVAS');
      }
      if (!mainCanvas.tagName) mainCanvas.tagName = 'CANVAS';
      if (!mainCanvas.nodeName) mainCanvas.nodeName = 'CANVAS';
      if (!mainCanvas.focus) mainCanvas.focus = () => {};
      if (!mainCanvas.blur) mainCanvas.blur = () => {};
      if (!mainCanvas.style) mainCanvas.style = new MiniStyle();
      mainCanvas.style.position = 'absolute';
      mainCanvas.style.left = '0px';
      mainCanvas.style.top = '0px';
      mainCanvas.style.display = 'block';
      mainCanvas.style.width = (root.innerWidth || 393) + 'px';
      mainCanvas.style.height = (root.innerHeight || 852) + 'px';

      const targetW = Math.round((root.innerWidth || 393) * (root.devicePixelRatio || 1));
      const targetH = Math.round((root.innerHeight || 852) * (root.devicePixelRatio || 1));
      if (!mainCanvas.width || mainCanvas.width === 0) mainCanvas.width = targetW;
      if (!mainCanvas.height || mainCanvas.height === 0) mainCanvas.height = targetH;

      if (!mainCanvas.getBoundingClientRect) {
        mainCanvas.getBoundingClientRect = () => ({
          left: 0, top: 0,
          width: root.innerWidth || 393,
          height: root.innerHeight || 852,
          right: root.innerWidth || 393,
          bottom: root.innerHeight || 852,
          x: 0, y: 0
        });
      }
      if (!mainCanvas.transferControlToOffscreen) {
        mainCanvas.transferControlToOffscreen = () => mainCanvas;
      }
      if (!mainCanvas.remove) {
        mainCanvas.remove = function () {
          if (this.parentElement) this.parentElement.removeChild(this);
        };
      }
      if (!mainCanvas.getContext) {
        const mockContext = {
          fillStyle: '',
          fillRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8Array(4) }),
          measureText: () => ({ width: 0 }),
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          getExtension: () => ({})
        };
        mainCanvas.getContext = (type) => mockContext;
      }
      const canvasListeners = new Map();
      mainCanvas.addEventListener = function (type, fn, opt) {
        if (typeof fn !== 'function') return;
        if (!canvasListeners.has(type)) canvasListeners.set(type, new Set());
        canvasListeners.get(type).add(fn);
      };
      mainCanvas.removeEventListener = function (type, fn, opt) {
        if (canvasListeners.has(type)) canvasListeners.get(type).delete(fn);
      };
      mainCanvas.dispatchEvent = function (evt) {
        if (!evt || !evt.type) return true;
        const set = canvasListeners.get(evt.type);
        if (set) {
          for (const fn of Array.from(set)) {
            try { fn.call(mainCanvas, evt); } catch (err) { console.error('[Canvas Event Error]', evt.type, err); }
          }
        }
        return true;
      };
      miniGameCanvases.add(mainCanvas);
      root.canvas = mainCanvas;
      if (typeof window !== 'undefined') window.canvas = mainCanvas;
      if (typeof globalThis !== 'undefined') globalThis.canvas = mainCanvas;
    }
    if (mainCanvas) {
      if (!mainCanvas.tagName) mainCanvas.tagName = 'CANVAS';
      if (!mainCanvas.nodeName) mainCanvas.nodeName = 'CANVAS';
      if (!mainCanvas.focus) mainCanvas.focus = () => {};
      if (!mainCanvas.blur) mainCanvas.blur = () => {};
    }
    return mainCanvas;
  }

  // 9. Document Polyfill & Head Script Interceptor
  class MiniDocument extends MiniElement {
    constructor() {
      super('#document');
      this.documentElement = new MiniElement('HTML');
      this.head = new MiniElement('HEAD');
      this.body = new MiniElement('BODY');
      this.documentElement.appendChild(this.head);
      this.documentElement.appendChild(this.body);
      this.visibilityState = 'visible';
      this.hidden = false;
      this.scrollingElement = { scrollTop: 0, scrollLeft: 0 };
      this.activeElement = null;
      this.referrer = '';
      this.title = 'Tiny Miners';
      this.fonts = {
        add(font) {},
        delete(font) { return false; },
        clear() {},
        has(font) { return false; },
        load() { return Promise.resolve([]); },
        ready: Promise.resolve()
      };
    }
    createElement(tag) {
      return createAdaptedElement(tag);
    }
    getElementById(id) {
      return this.querySelector('#' + id);
    }
    querySelector(sel) {
      return this.documentElement ? this.documentElement.querySelector(sel) : null;
    }
    querySelectorAll(sel) {
      return this.documentElement ? this.documentElement.querySelectorAll(sel) : [];
    }
    getElementsByTagName(tag) {
      return this.documentElement ? this.documentElement.getElementsByTagName(tag) : [];
    }
    getElementsByClassName(cls) {
      return this.documentElement ? this.documentElement.getElementsByClassName(cls) : [];
    }
    hasFocus() {
      return true;
    }
  }

  function createAdaptedElement(tag) {
    const t = String(tag).toLowerCase();
    if (t === 'script') {
      const s = new MiniElement('SCRIPT');
      s.src = '';
      s.type = '';
      s.async = false;
      s.onload = null;
      s.onerror = null;
      return s;
    }
    if (t === 'canvas') {
      if (!mainCanvasAssigned) {
        mainCanvasAssigned = true;
        return getOrCreateMainCanvas();
      }
            const c = typeof tt !== 'undefined' && tt.createCanvas ? tt.createCanvas() : new MiniElement('CANVAS');
      if (!c.tagName) c.tagName = 'CANVAS';
      if (!c.nodeName) c.nodeName = 'CANVAS';
      if (!c.focus) c.focus = () => {};
      if (!c.blur) c.blur = () => {};
      if (!c.getContext) {
        const mock2d = {
          fillStyle: '',
          fillRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8Array(4) }),
          measureText: () => ({ width: 0 }),
          clearRect: () => {},
          save: () => {},
          restore: () => {}
        };
        c.getContext = (type) => (type === '2d' ? mock2d : null);
      }
      if (!c.toBlob) {
        c.toBlob = (cb, mime) => { if (cb) cb({ type: mime || 'image/png' }); };
      }
      if (!c.style) c.style = new MiniStyle();
      if (!c.classList) {
        const cls = new Set();
        c.classList = { add: x => cls.add(x), remove: x => cls.delete(x), contains: x => cls.has(x) };
      }
      if (!c.remove) c.remove = function() { if (this.parentElement) this.parentElement.removeChild(this); };
      if (!c.transferControlToOffscreen) c.transferControlToOffscreen = () => c;
      if (!c.getBoundingClientRect) c.getBoundingClientRect = () => ({
        left: 0, top: 0, width: root.innerWidth || 393, height: root.innerHeight || 852
      });
      miniGameCanvases.add(c);
      return c;
    }
    if (t === 'img' || t === 'image') {
      const img = typeof tt !== 'undefined' && tt.createImage ? tt.createImage() : new MiniElement('IMG');
      miniGameImages.add(img);
      return img;
    }
    if (t === 'audio') {
      return new MiniAudio();
    }
    return new MiniElement(tag);
  }

  function patchDOMContainer(container) {
    if (!container) return;
    const origAppend = container.appendChild;
    container.appendChild = function (child) {
      if (!child) return child;
      if (typeof origAppend === 'function') {
        try {
          return origAppend.call(this, child);
        } catch (e) {
          // Native Node check failed (e.g. Helium C++ expecting native Node)
        }
      }
      if (child.parentElement && child.parentElement.removeChild) {
        try { child.parentElement.removeChild(child); } catch (e) {}
      }
      try { child.parentElement = this; } catch (e) {
        try {
          Object.defineProperty(child, 'parentElement', {
            value: this,
            configurable: true,
            writable: true
          });
        } catch (err) {}
      }
      if (Array.isArray(this.children)) {
        if (!this.children.includes(child)) this.children.push(child);
      } else {
        if (!this._customChildren) this._customChildren = [];
        if (!this._customChildren.includes(child)) this._customChildren.push(child);
      }
      return child;
    };

    const origRemove = container.removeChild;
    container.removeChild = function (child) {
      if (!child) return child;
      if (typeof origRemove === 'function') {
        try {
          return origRemove.call(this, child);
        } catch (e) {}
      }
      if (Array.isArray(this.children)) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
      }
      if (this._customChildren) {
        const idx = this._customChildren.indexOf(child);
        if (idx !== -1) this._customChildren.splice(idx, 1);
      }
      try { child.parentElement = null; } catch (e) {
        try {
          Object.defineProperty(child, 'parentElement', {
            value: null,
            configurable: true,
            writable: true
          });
        } catch (err) {}
      }
      return child;
    };

    const origInsert = container.insertBefore;
    container.insertBefore = function (newChild, refChild) {
      if (!newChild) return newChild;
      if (typeof origInsert === 'function') {
        try {
          return origInsert.call(this, newChild, refChild);
        } catch (e) {}
      }
      if (!refChild) return this.appendChild(newChild);
      const list = Array.isArray(this.children) ? this.children : this._customChildren;
      if (list) {
        const idx = list.indexOf(refChild);
        if (idx !== -1) {
          list.splice(idx, 0, newChild);
          try { newChild.parentElement = this; } catch (e) {
            try {
              Object.defineProperty(newChild, 'parentElement', {
                value: this,
                configurable: true,
                writable: true
              });
            } catch (err) {}
          }
          return newChild;
        }
      }
      return this.appendChild(newChild);
    };
  }

  const docListeners = new Map();
  if (!root.document) {
    root.document = new MiniDocument();
  } else {
    // Intercept native document methods
    root.document.hasFocus = () => true;
    if (!root.document.head) root.document.head = new MiniElement('HEAD');
    if (!root.document.body) root.document.body = new MiniElement('BODY');
    if (!root.document.documentElement) root.document.documentElement = new MiniElement('HTML');
    if (!root.document.scrollingElement) root.document.scrollingElement = root.document.documentElement || { scrollTop: 0, scrollLeft: 0 };
    if (!root.document.fonts) {
      root.document.fonts = {
        add(font) {},
        delete(font) { return false; },
        clear() {},
        has(font) { return false; },
        load() { return Promise.resolve([]); },
        ready: Promise.resolve()
      };
    }

    patchDOMContainer(root.document.body);
    patchDOMContainer(root.document.head);
    patchDOMContainer(root.document.documentElement);
    patchDOMContainer(root.document);

    if (root.Node && root.Node.prototype) {
      patchDOMContainer(root.Node.prototype);
    }
    if (root.Element && root.Element.prototype) {
      patchDOMContainer(root.Element.prototype);
    }

    try {
      Object.defineProperty(root.document, 'createElement', {
        value: function (tag) { return createAdaptedElement(tag); },
        writable: true,
        configurable: true
      });
    } catch (e) {
      root.document.createElement = function (tag) { return createAdaptedElement(tag); };
    }
    if (root.Document && root.Document.prototype) {
      try {
        root.Document.prototype.createElement = function (tag) { return createAdaptedElement(tag); };
      } catch (e) {}
    }

    if (!root.document.querySelector) root.document.querySelector = (sel) => root.document.documentElement ? root.document.documentElement.querySelector(sel) : null;
    if (!root.document.querySelectorAll) root.document.querySelectorAll = (sel) => root.document.documentElement ? root.document.documentElement.querySelectorAll(sel) : [];
    if (!root.document.getElementsByTagName) root.document.getElementsByTagName = (tag) => root.document.documentElement ? root.document.documentElement.getElementsByTagName(tag) : [];
    if (!root.document.getElementsByClassName) root.document.getElementsByClassName = (cls) => root.document.documentElement ? root.document.documentElement.getElementsByClassName(cls) : [];
    if (!root.document.getElementById) root.document.getElementById = (id) => root.document.querySelector ? root.document.querySelector('#' + id) : null;
    if (root.document && typeof root.document.activeElement === 'undefined') {
      try {
        Object.defineProperty(root.document, 'activeElement', {
          value: null,
          writable: true,
          configurable: true
        });
      } catch (e) {
        root.document.activeElement = null;
      }
    }
  }

  if (typeof window !== 'undefined') window.document = root.document;
  if (typeof globalThis !== 'undefined') globalThis.document = root.document;

  const polyfillCanPlayType = function (mime) {
    if (!mime) return '';
    if (mime.includes('mp4') || mime.includes('h264') || mime.includes('avc1') || mime.includes('mp3') || mime.includes('mpeg') || mime.includes('m4a')) return 'maybe';
    return '';
  };
  if (typeof root.HTMLMediaElement !== 'undefined' && root.HTMLMediaElement.prototype && !root.HTMLMediaElement.prototype.canPlayType) {
    try { root.HTMLMediaElement.prototype.canPlayType = polyfillCanPlayType; } catch (e) {}
  }
  if (typeof root.HTMLVideoElement !== 'undefined' && root.HTMLVideoElement.prototype && !root.HTMLVideoElement.prototype.canPlayType) {
    try { root.HTMLVideoElement.prototype.canPlayType = polyfillCanPlayType; } catch (e) {}
  }
  if (typeof root.HTMLAudioElement !== 'undefined' && root.HTMLAudioElement.prototype && !root.HTMLAudioElement.prototype.canPlayType) {
    try { root.HTMLAudioElement.prototype.canPlayType = polyfillCanPlayType; } catch (e) {}
  }

  // Intercept document.head.appendChild for dynamic script loading
  if (root.document && root.document.head) {
    const prevHeadAppend = root.document.head.appendChild ? root.document.head.appendChild.bind(root.document.head) : null;
    root.document.head.appendChild = function (child) {
      if (child && (child.tagName === 'SCRIPT' || child.nodeName === 'SCRIPT')) {
        if (child.src) {
          const loader = root.__loadScript || globalThis.__loadScript;
          console.log('[C3 Adapter] Head script appended with src:', child.src);
          if (typeof loader === 'function') {
            loader(child.src).then(() => {
              if (typeof child.onload === 'function') setTimeout(child.onload, 0);
            }).catch(err => {
              console.error('[C3 Adapter] Script load error:', child.src, err);
              if (typeof child.onerror === 'function') setTimeout(() => child.onerror(err), 0);
              else if (typeof child.onload === 'function') setTimeout(child.onload, 0);
            });
          } else {
            console.warn('[C3 Adapter] No __loadScript registered, calling onload directly.');
            if (typeof child.onload === 'function') setTimeout(child.onload, 0);
          }
        } else if (child.textContent) {
          try {
            (new Function(child.textContent))();
          } catch (e) {
            console.error('[C3 Adapter] Inline script execution error:', e);
          }
          if (typeof child.onload === 'function') setTimeout(child.onload, 0);
        }
        return child;
      }
      return prevHeadAppend ? prevHeadAppend(child) : child;
    };
  }

  // Ensure document EventTarget methods
  if (!root.document.addEventListener || typeof root.document.addEventListener !== 'function') {
    root.document.addEventListener = function (type, listener, options) {
      if (typeof listener !== 'function') return;
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(listener);
    };
  } else {
    const origDocAdd = root.document.addEventListener;
    root.document.addEventListener = function (type, listener, options) {
      if (typeof listener !== 'function') return;
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(listener);
      try { origDocAdd.call(root.document, type, listener, options); } catch (e) {}
    };
  }

  if (!root.document.removeEventListener || typeof root.document.removeEventListener !== 'function') {
    root.document.removeEventListener = function (type, listener, options) {
      if (docListeners.has(type)) docListeners.get(type).delete(listener);
    };
  }

  if (!root.document.dispatchEvent || typeof root.document.dispatchEvent !== 'function') {
    root.document.dispatchEvent = function (evt) {
      if (!evt || !evt.type) return true;
      const set = docListeners.get(evt.type);
      if (set) {
        for (const fn of Array.from(set)) {
          try { fn.call(root.document, evt); } catch (err) { console.error('[Doc Event Error]', evt.type, err); }
        }
      }
      return true;
    };
  }

  // 10. LocalStorage shim (ensures getItem returns null for empty or non-existent keys)
  const rawStorage = root.localStorage;
  const safeStorage = {
    getItem(k) {
      try {
        let val = null;
        if (typeof tt !== 'undefined' && tt.getStorageSync) {
          val = tt.getStorageSync(k);
        } else if (rawStorage && rawStorage.getItem) {
          val = rawStorage.getItem(k);
        }
        if (val === '' || val === undefined || val === null) return null;
        return val;
      } catch (e) {
        return null;
      }
    },
    setItem(k, v) {
      try {
        if (typeof tt !== 'undefined' && tt.setStorageSync) {
          tt.setStorageSync(k, String(v));
        } else if (rawStorage && rawStorage.setItem) {
          rawStorage.setItem(k, String(v));
        }
      } catch (e) {}
    },
    removeItem(k) {
      try {
        if (typeof tt !== 'undefined' && tt.removeStorageSync) {
          tt.removeStorageSync(k);
        } else if (rawStorage && rawStorage.removeItem) {
          rawStorage.removeItem(k);
        }
      } catch (e) {}
    },
    clear() {
      try {
        if (typeof tt !== 'undefined' && tt.clearStorageSync) {
          tt.clearStorageSync();
        } else if (rawStorage && rawStorage.clear) {
          rawStorage.clear();
        }
      } catch (e) {}
    }
  };
  root.localStorage = safeStorage;
  if (typeof globalThis !== 'undefined') globalThis.localStorage = safeStorage;
  if (typeof window !== 'undefined') window.localStorage = safeStorage;
  if (typeof self !== 'undefined') self.localStorage = safeStorage;

  // 10.5. XMLHttpRequest shim for local files & assets
  const OriginalXHR = root.XMLHttpRequest;
  class AdaptedXMLHttpRequest {
    constructor() {
      this._xhr = OriginalXHR ? new OriginalXHR() : null;
      this._isLocal = false;
      this._url = '';
      this._method = 'GET';
      this._headers = new Map();
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.responseType = '';
      this.timeout = 0;
      this.withCredentials = false;
      this.onreadystatechange = null;
      this.onload = null;
      this.onerror = null;
      this.ontimeout = null;
      this.onabort = null;
      this.upload = { onprogress: null };
    }

    open(method, url, async, user, password) {
      this._method = method;
      this._url = url;
      let clean = typeof url === 'string' ? url : (url && url.href ? url.href : String(url));
      if (clean.startsWith('https://localhost/')) clean = clean.substring('https://localhost/'.length);
      if (clean.startsWith('http://localhost/')) clean = clean.substring('http://localhost/'.length);
      if (clean.startsWith('https://minigame.local/')) clean = clean.substring('https://minigame.local/'.length);
      if (clean.startsWith('file:///')) clean = clean.substring('file:///'.length);
      if (clean.startsWith('./')) clean = clean.substring(2);
      if (clean.startsWith('/')) clean = clean.substring(1);

      const isHttp = /^https?:\/\//i.test(clean);
      this._isLocal = !isHttp;
      this._cleanPath = clean.split('?')[0].split('#')[0];

      if (!this._isLocal && this._xhr) {
        return this._xhr.open(method, url, async !== false, user, password);
      }
      this.readyState = 1; // OPENED
      if (typeof this.onreadystatechange === 'function') {
        try { this.onreadystatechange(); } catch (e) {}
      }
    }

    setRequestHeader(header, value) {
      if (!this._isLocal && this._xhr) {
        return this._xhr.setRequestHeader(header, value);
      }
      this._headers.set(header, value);
    }

    overrideMimeType(mime) {
      if (!this._isLocal && this._xhr && this._xhr.overrideMimeType) {
        return this._xhr.overrideMimeType(mime);
      }
    }

    send(data) {
      if (!this._isLocal && this._xhr) {
        this._xhr.timeout = this.timeout;
        this._xhr.withCredentials = this.withCredentials;
        this._xhr.responseType = this.responseType;
        this._xhr.onreadystatechange = () => {
          this.readyState = this._xhr.readyState;
          this.status = this._xhr.status;
          this.statusText = this._xhr.statusText;
          this.responseText = this._xhr.responseText;
          this.response = this._xhr.response;
          if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
        };
        this._xhr.onload = (e) => { if (typeof this.onload === 'function') this.onload(e); };
        this._xhr.onerror = (e) => { if (typeof this.onerror === 'function') this.onerror(e); };
        this._xhr.ontimeout = (e) => { if (typeof this.ontimeout === 'function') this.ontimeout(e); };
        this._xhr.onabort = (e) => { if (typeof this.onabort === 'function') this.onabort(e); };
        return this._xhr.send(data);
      }

      // Check in-memory embedded assets (subpackage images)
      const embeddedMap = globalThis.__minersEmbeddedImages || globalThis.__embeddedAssets || globalThis.__diggerEmbeddedImages;
      let embeddedDataUri = null;
      if (embeddedMap) {
        if (embeddedMap[this._cleanPath]) embeddedDataUri = embeddedMap[this._cleanPath];
        else if (embeddedMap['images/' + this._cleanPath]) embeddedDataUri = embeddedMap['images/' + this._cleanPath];
        else if (this._cleanPath.startsWith('images/') && embeddedMap[this._cleanPath.substring('images/'.length)]) {
          embeddedDataUri = embeddedMap[this._cleanPath.substring('images/'.length)];
        }
      }

      if (embeddedDataUri) {
        setTimeout(() => {
          const commaIdx = embeddedDataUri.indexOf(',');
          const base64Data = commaIdx >= 0 ? embeddedDataUri.substring(commaIdx + 1) : embeddedDataUri;
          let arrayBuf;
          if (typeof tt !== 'undefined' && tt.base64ToArrayBuffer) {
            arrayBuf = tt.base64ToArrayBuffer(base64Data);
          } else if (typeof Buffer !== 'undefined') {
            const b = Buffer.from(base64Data, 'base64');
            arrayBuf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
          } else {
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            arrayBuf = bytes.buffer;
          }
          this.status = 200;
          this.statusText = 'OK';
          this.responseText = '';
          this.response = arrayBuf;
          this.readyState = 4;
          if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
          if (typeof this.onload === 'function') this.onload();
        }, 0);
        return;
      }

      // Local file reading via tt.getFileSystemManager
      setTimeout(() => {
        try {
          if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
            const fs = tt.getFileSystemManager();
            let buf = null;
            const candidates = [
              this._cleanPath,
              './' + this._cleanPath,
              'data/' + this._cleanPath,
              './data/' + this._cleanPath,
              'images/' + this._cleanPath,
              './images/' + this._cleanPath,
              'media/' + this._cleanPath,
              './media/' + this._cleanPath
            ];
            for (const candidate of candidates) {
              try {
                buf = fs.readFileSync(candidate);
                if (buf) break;
              } catch (e) {}
            }

            if (buf) {
              let text = '';
              let arrayBuf = null;
              if (typeof buf === 'string') {
                text = buf;
                arrayBuf = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(buf).buffer : null;
              } else if (buf instanceof ArrayBuffer) {
                arrayBuf = buf;
                if (typeof TextDecoder !== 'undefined') {
                  text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
                } else {
                  const u8 = new Uint8Array(buf);
                  for (let i = 0; i < u8.length; i++) text += String.fromCharCode(u8[i]);
                }
              } else if (buf && buf.buffer) {
                arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
                if (typeof TextDecoder !== 'undefined') {
                  text = new TextDecoder('utf-8').decode(buf);
                } else {
                  const u8 = new Uint8Array(buf);
                  for (let i = 0; i < u8.length; i++) text += String.fromCharCode(u8[i]);
                }
              } else {
                text = String(buf || '');
                arrayBuf = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(text).buffer : null;
              }

              this.status = 200;
              this.statusText = 'OK';
              this.responseText = text;
              this.response = (this.responseType === 'arraybuffer') ? arrayBuf : text;
              this.readyState = 4;
              if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
              if (typeof this.onload === 'function') this.onload();
              return;
            }
          }

          // File not found
          this.status = 404;
          this.statusText = 'Not Found';
          this.responseText = '';
          this.response = '';
          this.readyState = 4;
          if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
          if (typeof this.onerror === 'function') this.onerror(new Error('File not found: ' + this._cleanPath));
        } catch (err) {
          this.status = 500;
          this.statusText = 'Internal Server Error';
          this.readyState = 4;
          if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
          if (typeof this.onerror === 'function') this.onerror(err);
        }
      }, 0);
    }

    abort() {
      if (!this._isLocal && this._xhr) this._xhr.abort();
    }

    getAllResponseHeaders() {
      return !this._isLocal && this._xhr ? this._xhr.getAllResponseHeaders() : '';
    }

    getResponseHeader(name) {
      return !this._isLocal && this._xhr ? this._xhr.getResponseHeader(name) : null;
    }
  }

  root.XMLHttpRequest = AdaptedXMLHttpRequest;
  if (typeof globalThis !== 'undefined') globalThis.XMLHttpRequest = AdaptedXMLHttpRequest;
  if (typeof window !== 'undefined') window.XMLHttpRequest = AdaptedXMLHttpRequest;
  if (typeof self !== 'undefined') self.XMLHttpRequest = AdaptedXMLHttpRequest;

  // Storage persistence
  if (!root.navigator.storage) {
    root.navigator.storage = {
      persisted: () => Promise.resolve(true),
      persist: () => Promise.resolve(true)
    };
  }

  // 11. Fetch shim for local JSON & binary assets
  const originalFetch = root.fetch;
  root.fetch = function (url, options) {
    let path = typeof url === 'string' ? url : (url && url.href ? url.href : String(url));
    if (path.startsWith('https://localhost/')) path = path.substring('https://localhost/'.length);
    if (path.startsWith('http://localhost/')) path = path.substring('http://localhost/'.length);
    if (path.startsWith('https://minigame.local/')) path = path.substring('https://minigame.local/'.length);
    if (path.startsWith('file:///')) path = path.substring('file:///'.length);
    if (path.startsWith('./')) path = path.substring(2);
    if (path.startsWith('/')) path = path.substring(1);

    const cleanPath = path.split('?')[0].split('#')[0];

    // 0. Direct in-memory pass-through for data.json
    if (cleanPath === 'data.json' || cleanPath === 'data/data.json' || cleanPath.endsWith('/data.json')) {
      let dataObj = globalThis.__c3DataJson;
      if (!dataObj && typeof tt !== 'undefined' && tt.getFileSystemManager) {
        try {
          const fs = tt.getFileSystemManager();
          const content = fs.readFileSync('data/data.json', 'utf8');
          dataObj = JSON.parse(content);
          globalThis.__c3DataJson = dataObj;
        } catch (e) {}
      }
      if (!dataObj && typeof require === 'function') {
        try { dataObj = require('./data/data.json'); } catch (e) {}
      }
      if (dataObj) {
        const textVal = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          text: () => Promise.resolve(textVal),
          json: () => Promise.resolve(typeof dataObj === 'string' ? JSON.parse(dataObj) : dataObj),
          blob: () => Promise.resolve(typeof Blob !== 'undefined' ? new Blob([textVal], { type: 'application/json' }) : { size: textVal.length }),
          arrayBuffer: () => Promise.resolve((typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(textVal).buffer : null))
        });
      }
    }

    // 0.1 Direct read for noise.wasm
    if (cleanPath === 'noise.wasm' || cleanPath.endsWith('/noise.wasm')) {
      let wasmBuf = null;
      if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
        try { wasmBuf = tt.getFileSystemManager().readFileSync('noise.wasm'); } catch (e) {}
      }
      if (!wasmBuf && typeof require === 'function') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = [
            path.resolve('noise.wasm'),
            path.resolve(__dirname, '../noise.wasm'),
            path.resolve(__dirname, 'noise.wasm')
          ];
          for (const c of candidates) {
            if (fs.existsSync(c)) { wasmBuf = fs.readFileSync(c); break; }
          }
        } catch (e) {}
      }
      if (wasmBuf) {
        let ab = wasmBuf;
        if (ArrayBuffer.isView(wasmBuf)) {
          ab = wasmBuf.buffer.slice(wasmBuf.byteOffset, wasmBuf.byteOffset + wasmBuf.byteLength);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/wasm']]),
          text: () => Promise.resolve(''),
          json: () => Promise.reject(new Error('WASM is not JSON')),
          blob: () => Promise.resolve(typeof Blob !== 'undefined' ? new Blob([ab], { type: 'application/wasm' }) : { size: ab.byteLength }),
          arrayBuffer: () => Promise.resolve(ab)
        });
      }
    }

    // 1. Check in-memory embedded assets (subpackage images)
    const embeddedMap = globalThis.__minersEmbeddedImages || globalThis.__embeddedAssets || globalThis.__diggerEmbeddedImages;
    let embeddedDataUri = null;
    if (embeddedMap) {
      if (embeddedMap[cleanPath]) embeddedDataUri = embeddedMap[cleanPath];
      else if (embeddedMap['images/' + cleanPath]) embeddedDataUri = embeddedMap['images/' + cleanPath];
      else if (cleanPath.startsWith('images/') && embeddedMap[cleanPath.substring('images/'.length)]) {
        embeddedDataUri = embeddedMap[cleanPath.substring('images/'.length)];
      }
    }

    if (embeddedDataUri) {
      const commaIdx = embeddedDataUri.indexOf(',');
      const base64Data = commaIdx >= 0 ? embeddedDataUri.substring(commaIdx + 1) : embeddedDataUri;
      const mimeMatch = /^data:(image\/[^;]+);base64/.exec(embeddedDataUri);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';

      let arrayBuf;
      if (typeof tt !== 'undefined' && tt.base64ToArrayBuffer) {
        arrayBuf = tt.base64ToArrayBuffer(base64Data);
      } else if (typeof Buffer !== 'undefined') {
        const b = Buffer.from(base64Data, 'base64');
        arrayBuf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      } else {
        const binary = atob(base64Data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        arrayBuf = bytes.buffer;
      }

      const blobObj = typeof Blob !== 'undefined' ? new Blob([arrayBuf], { type: mimeType }) : { size: arrayBuf.byteLength, type: mimeType };
      blobObj._dataUri = embeddedDataUri;
      blobObj._arrayBuffer = arrayBuf;
      blobObj._path = cleanPath;

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', mimeType]]),
        text: () => Promise.resolve(''),
        json: () => Promise.reject(new Error('Embedded image asset is not JSON')),
        blob: () => Promise.resolve(blobObj),
        arrayBuffer: () => Promise.resolve(arrayBuf)
      });
    }

    // 2. Read from filesystem via tt.getFileSystemManager
    if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
      const fs = tt.getFileSystemManager();
      let buf = null;
      const candidates = [
        cleanPath,
        './' + cleanPath,
        'data/' + cleanPath,
        './data/' + cleanPath,
        'images/' + cleanPath,
        './images/' + cleanPath,
        'media/' + cleanPath,
        './media/' + cleanPath
      ];
      for (const candidate of candidates) {
        try {
          buf = fs.readFileSync(candidate);
          if (buf) break;
        } catch (e) {}
      }

      if (buf) {
        let arrayBuf;
        let textVal;
        if (typeof buf === 'string') {
          textVal = buf;
          arrayBuf = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(buf).buffer : null;
        } else if (buf instanceof ArrayBuffer || (buf && Object.prototype.toString.call(buf) === '[object ArrayBuffer]')) {
          arrayBuf = buf;
          if (typeof TextDecoder !== 'undefined') {
            textVal = new TextDecoder('utf-8').decode(new Uint8Array(buf));
          } else {
            const u8 = new Uint8Array(buf);
            let s = '';
            for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
            try { textVal = decodeURIComponent(escape(s)); } catch (e) { textVal = s; }
          }
        } else if (ArrayBuffer.isView(buf) || (buf && buf.buffer)) {
          arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          if (typeof TextDecoder !== 'undefined') {
            textVal = new TextDecoder('utf-8').decode(buf);
          } else {
            const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
            let s = '';
            for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
            try { textVal = decodeURIComponent(escape(s)); } catch (e) { textVal = s; }
          }
        } else {
          textVal = String(buf || '');
          arrayBuf = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(textVal).buffer : null;
        }

        const blobObj = typeof Blob !== 'undefined' ? new Blob([buf]) : { size: arrayBuf ? arrayBuf.byteLength : 0 };
        blobObj._arrayBuffer = arrayBuf;
        blobObj._path = cleanPath;

        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map(),
          text: () => Promise.resolve(textVal),
          json: () => {
            try { return Promise.resolve(JSON.parse(textVal)); } catch (e) { return Promise.reject(e); }
          },
          blob: () => Promise.resolve(blobObj),
          arrayBuffer: () => Promise.resolve(arrayBuf)
        });
      }
    }

    
    // 2.5 Fallback for Node.js testing environment
    if ((typeof tt === 'undefined' || !tt.getFileSystemManager) && typeof require === 'function') {
      try {
        const nodeFs = require('fs');
        const nodePath = require('path');
        const candidates = [
          cleanPath,
          './' + cleanPath,
          'data/' + cleanPath,
          './data/' + cleanPath,
          'images/' + cleanPath,
          './images/' + cleanPath,
          'media/' + cleanPath,
          './media/' + cleanPath
        ];
        let buf = null;
        for (const c of candidates) {
          const resolved = nodePath.resolve(__dirname, '..', c);
          if (nodeFs.existsSync(resolved)) {
            buf = nodeFs.readFileSync(resolved);
            break;
          }
        }
        if (buf) {
          const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          const textVal = buf.toString('utf8');
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map(),
            text: () => Promise.resolve(textVal),
            json: () => {
              try { return Promise.resolve(JSON.parse(textVal)); } catch (e) { return Promise.reject(e); }
            },
            blob: () => Promise.resolve({ size: arrayBuf.byteLength, _arrayBuffer: arrayBuf }),
            arrayBuffer: () => Promise.resolve(arrayBuf)
          });
        }
      } catch (e) {}
    }

    if (typeof originalFetch === 'function') {
      return originalFetch(url, options);
    }
    return Promise.reject(new Error('No fetch implementation for: ' + cleanPath));
  };
  if (typeof globalThis !== 'undefined') globalThis.fetch = root.fetch;
  if (typeof window !== 'undefined') window.fetch = root.fetch;
  if (typeof self !== 'undefined') self.fetch = root.fetch;

  // 12. Touch & Pointer Events
  function setupTouchEvents() {
    if (typeof tt === 'undefined') return;
    const canvas = getOrCreateMainCanvas();

    const convertTouch = (t) => ({
      identifier: t.identifier,
      clientX: t.clientX,
      clientY: t.clientY,
      pageX: t.pageX || t.clientX,
      pageY: t.pageY || t.clientY,
      screenX: t.clientX,
      screenY: t.clientY,
      target: canvas
    });

    let isDispatching = false;
    const dispatch = (type, e) => {
      if (isDispatching) return;
      isDispatching = true;
      try {
        const touches = (e.touches || []).map(convertTouch);
        const changedTouches = (e.changedTouches || []).map(convertTouch);
        const first = changedTouches[0] || touches[0] || { clientX: 0, clientY: 0 };

        const touchEvt = {
          type,
          touches,
          changedTouches,
          targetTouches: touches,
          target: canvas,
          preventDefault() {},
          stopPropagation() {}
        };

        if (canvas.dispatchEvent) canvas.dispatchEvent(touchEvt);
        if (root.dispatchEvent) root.dispatchEvent(touchEvt);

        const pointerType = type === 'touchstart' ? 'pointerdown' : (type === 'touchmove' ? 'pointermove' : (type === 'touchend' ? 'pointerup' : 'pointercancel'));
        const pointerEvt = {
          type: pointerType,
          pointerId: first.identifier || 1,
          pointerType: 'touch',
          isPrimary: true,
          clientX: first.clientX,
          clientY: first.clientY,
          pageX: first.pageX,
          pageY: first.pageY,
          button: 0,
          buttons: 1,
          target: canvas,
          preventDefault() {},
          stopPropagation() {}
        };

        if (canvas.dispatchEvent) canvas.dispatchEvent(pointerEvt);
        if (root.dispatchEvent) root.dispatchEvent(pointerEvt);
      } finally {
        isDispatching = false;
      }
    };

    if (tt.onTouchStart) tt.onTouchStart((e) => dispatch('touchstart', e));
    if (tt.onTouchMove) tt.onTouchMove((e) => dispatch('touchmove', e));
    if (tt.onTouchEnd) tt.onTouchEnd((e) => dispatch('touchend', e));
    if (tt.onTouchCancel) tt.onTouchCancel((e) => dispatch('touchcancel', e));
  }

  setupTouchEvents();

  root.C3Adapter = {
    installed: true,
    getCanvas: getOrCreateMainCanvas
  };

  console.log('[C3 adapter] installed', {
    screenWidth: root.innerWidth,
    screenHeight: root.innerHeight,
    pixelRatio: root.devicePixelRatio
  });
})();


  if (typeof tt !== 'undefined') {
    if (tt.onError) {
      tt.onError((err) => {
        console.error('[Global tt.onError]', err);
      });
    }
    if (tt.onUnhandledRejection) {
      tt.onUnhandledRejection((res) => {
        console.error('[Global tt.onUnhandledRejection]', res.reason || res);
      });
    }
  }


if (typeof WebAssembly !== 'undefined') {
  const origInstantiateStreaming = WebAssembly.instantiateStreaming;
  WebAssembly.instantiateStreaming = async function (resp, importObject) {
    let buf = null;
    try {
      const response = await resp;
      if (response && typeof response.arrayBuffer === 'function') {
        buf = await response.arrayBuffer();
      } else if (response && response._arrayBuffer) {
        buf = response._arrayBuffer;
      }
      if (buf) {
        return await WebAssembly.instantiate(buf, importObject);
      }
      if (origInstantiateStreaming) {
        return await origInstantiateStreaming(resp, importObject);
      }
    } catch (e) {
      if (buf) {
        try {
          return await WebAssembly.instantiate(buf, importObject);
        } catch (e2) {}
      }
      console.warn('[WebAssembly] instantiateStreaming error:', e);
      throw e;
    }
  };
}
