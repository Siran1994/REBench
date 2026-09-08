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

require('./adapter/tt-c3-adapter.js');

// Poki SDK no-op shim (the Avix_PokiSDK_ForC3 plugin is bundled in c3runtime)
if (typeof window !== 'undefined') {
  if (!window.PokiSDK) window.PokiSDK = {
    init: function() { return Promise.resolve(); },
    commercialBreak: function() { return Promise.resolve(); },
    rewardedBreak: function() { return Promise.resolve(true); },
    gameLoadingStart: function() {},
    gameLoadingFinished: function() {},
    gameLoadingProgress: function() {},
    gameplayStart: function() {},
    gameplayStop: function() {},
    happyTime: function() {},
    setDebug: function() {}
  };
}

console.log('[Stickman] Initializing ByteDance MiniGame environment...');

// Ensure C3 support flags are set
if (typeof window !== 'undefined') {
  window.C3_ModernJSSupport_OK = true;
  window.C3_IsSupported = true;
}

// iOS (Helium): force landscape on "重新进入小游戏" re-entry
if (typeof tt !== 'undefined' && tt.onShow) {
  tt.onShow(() => {
    try { if (tt.setDeviceOrientation) tt.setDeviceOrientation({ value: 'landscape' }); } catch (e) {}
  });
}

// Dynamic script loader for Construct 3 runtime scripts
const scriptModules = {
  'scripts/c3main.js': () => { require('./scripts/c3main.minigame.js'); },
  'scripts/c3main.minigame.js': () => { require('./scripts/c3main.minigame.js'); },
  'scripts/c3runtime.js': () => { require('./scripts/c3runtime.js'); },
  'scripts/objRefTable.js': () => { require('./scripts/objRefTable.js'); }
};

globalThis.__loadScript = async function (src) {
  let clean = src;
  if (clean.startsWith('https://localhost/')) clean = clean.substring('https://localhost/'.length);
  if (clean.startsWith('http://localhost/')) clean = clean.substring('http://localhost/'.length);
  if (clean.startsWith('https://minigame.local/')) clean = clean.substring('https://minigame.local/'.length);
  if (clean.startsWith('file:///')) clean = clean.substring('file:///'.length);
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (clean.startsWith('/')) clean = clean.substring(1);

  console.log('[Stickman] Loading script module:', clean);

  if (scriptModules[clean]) {
    scriptModules[clean]();
    return;
  }
  if (typeof require === 'function') {
    try {
      require('./' + clean);
      return;
    } catch (err) {
      console.warn('[Stickman] Could not load script module:', clean, err);
    }
  }
};

// Import main game logic
require('./scripts/main.js');

// Preload subpackages before dispatching deviceready
function loadSub(name) {
  return new Promise((resolve) => {
    if (typeof tt === 'undefined' || !tt.loadSubpackage) return resolve();
    const task = tt.loadSubpackage({
      name,
      success: () => {
        console.log(`[Stickman] Subpackage ${name} loaded successfully`);
        resolve();
      },
      fail: (err) => {
        console.warn(`[Stickman] Subpackage ${name} load fail:`, err);
        resolve();
      }
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((res) => {
        console.log(`[Stickman] loading ${name}: ${res.progress}%`);
      });
    }
  });
}

// Trigger deviceready lifecycle event for Cordova-wrapped exports
let devicereadyFired = false;
function triggerDeviceReady() {
  if (devicereadyFired) return;
  devicereadyFired = true;
  if (typeof document !== 'undefined' && document.dispatchEvent) {
    try {
      const evt = typeof Event !== 'undefined' ? new Event('deviceready') : { type: 'deviceready' };
      document.dispatchEvent(evt);
      console.log('[Stickman] Dispatched deviceready event');
    } catch (e) {
      console.warn('[Stickman] deviceready dispatch warning:', e);
    }
  }
}

async function initGame() {
  console.log('[Stickman] Loading subpackages before starting runtime...');
  await Promise.all([
    loadSub('images'),
    loadSub('media'),
    loadSub('data')
  ]);
  // Fallback check: if embedded images not registered yet, require directly
  try {
    if (!globalThis.__stickmanEmbeddedImages && typeof require === 'function') {
      globalThis.__stickmanEmbeddedImages = require('./images/embedded-assets.js');
      console.log('[Stickman] Direct required embedded-assets:', Object.keys(globalThis.__stickmanEmbeddedImages).length);
    }
  } catch (e) {}

  console.log('[Stickman] Ready, triggering deviceready...');
  triggerDeviceReady();
}

initGame();

console.log('[Stickman] Game entry script loaded.');
