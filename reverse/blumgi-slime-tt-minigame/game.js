/**
 * ByteDance MiniGame Entry for Blumgi Slime (Construct 3)
 * Ported to ByteDance MiniGame (Krypton & Helium dual-engine compliant)
 */

// 0. Robust location polyfill (prevents Helium "Cannot read properties of undefined (reading 'substr')")
const safeLocation = {
  protocol: 'https:',
  origin: 'https://minigame.local',
  pathname: '/index.html',
  search: '',
  hash: '',
  href: 'https://minigame.local/index.html',
  host: 'minigame.local',
  hostname: 'minigame.local',
  port: '',
  reload: () => {},
  toString: () => 'https://minigame.local/index.html'
};

const _exposeLocation = (target) => {
  if (!target) return;
  try {
    if (!target.location || !target.location.protocol) {
      target.location = safeLocation;
    }
  } catch (e) {
    try {
      Object.defineProperty(target, 'location', {
        value: safeLocation,
        writable: true,
        configurable: true
      });
    } catch (e2) {}
  }
};
if (typeof globalThis !== 'undefined') _exposeLocation(globalThis);
if (typeof window !== 'undefined') _exposeLocation(window);
if (typeof self !== 'undefined') _exposeLocation(self);

// 1. Core Polyfills: MiniBlob, MiniFile, MiniImageData, MiniResponse, MiniEvent, MiniCustomEvent
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
      this.width = Number(h) || 0;
      this.height = Math.floor(w.length / 4 / (this.width || 1));
    } else {
      this.width = Number(w) || 0;
      this.height = Number(h) || 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  }
}

class MiniResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status !== undefined ? init.status : 200;
    this.statusText = init.statusText !== undefined ? init.statusText : 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(init.headers ? (Array.isArray(init.headers) ? init.headers : Object.entries(init.headers)) : []);
  }
  text() {
    if (typeof this._body === 'string') return Promise.resolve(this._body);
    if (this._body instanceof MiniBlob || (this._body && typeof this._body.text === 'function')) return this._body.text();
    if (this._body instanceof ArrayBuffer) {
      if (typeof TextDecoder !== 'undefined') return Promise.resolve(new TextDecoder('utf-8').decode(this._body));
      const u8 = new Uint8Array(this._body);
      let s = '';
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return Promise.resolve(s);
    }
    return Promise.resolve(String(this._body || ''));
  }
  json() {
    return this.text().then(t => JSON.parse(t));
  }
  blob() {
    if (this._body instanceof MiniBlob) return Promise.resolve(this._body);
    return Promise.resolve(new MiniBlob([this._body]));
  }
  arrayBuffer() {
    if (this._body instanceof ArrayBuffer) return Promise.resolve(this._body);
    if (ArrayBuffer.isView(this._body)) {
      return Promise.resolve(this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength));
    }
    if (this._body instanceof MiniBlob || (this._body && typeof this._body.arrayBuffer === 'function')) {
      return this._body.arrayBuffer();
    }
    return this.text().then(t => {
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(t).buffer;
      const ab = new ArrayBuffer(t.length);
      const u8 = new Uint8Array(ab);
      for (let i = 0; i < t.length; i++) u8[i] = t.charCodeAt(i);
      return ab;
    });
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
  if (!target.Response) target.Response = MiniResponse;
  if (!target.Event) target.Event = MiniEvent;
  if (!target.CustomEvent) target.CustomEvent = MiniCustomEvent;
};

if (typeof globalThis !== 'undefined') _exposeGlobals(globalThis);
if (typeof window !== 'undefined') _exposeGlobals(window);
if (typeof self !== 'undefined') _exposeGlobals(self);

// 2. atob & btoa Polyfill (prevents Android Krypton crashes)
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

// 3. Load Adapter
require('./adapter/tt-c3-adapter.js');

console.log('[BlumgiSlime] Initializing ByteDance MiniGame environment...');

// Ensure C3 support flags are set
if (typeof window !== 'undefined') {
  window.C3_ModernJSSupport_OK = true;
  window.C3_IsSupported = true;
}

// Set & Lock Landscape Orientation
if (typeof tt !== 'undefined') {
  if (tt.setDeviceOrientation) {
    try {
      tt.setDeviceOrientation({ value: 'landscape' });
    } catch (e) {}
  }
  if (tt.onShow) {
    tt.onShow(() => {
      if (tt.setDeviceOrientation) {
        try {
          tt.setDeviceOrientation({ value: 'landscape' });
        } catch (e) {}
      }
    });
  }
}

// Load PokiSDK Bridge
require('./poki-sdk.js');

// Dynamic script loader for Construct 3 runtime scripts
const scriptModules = {
  'box2d.wasm.js': () => { require('./box2d.wasm.js'); },
  'scripts/box2d.wasm.js': () => { require('./box2d.wasm.js'); },
  'scripts/c3runtime.js': () => {
    require('./scripts/c3runtime.js');
    if (typeof self !== 'undefined' && self.C3 && self.C3.Supports) {
      self.C3.Supports.ImageBitmap = false;
      self.C3.Supports.ImageBitmapOptions = false;
      self.C3.Supports.ImageBitmapOptionsResize = false;
    }
  },
  'scripts/objRefTable.js': () => { require('./scripts/objRefTable.js'); },
  'scripts/project/main.js': () => { require('./scripts/project/main.js'); },
  'scripts/project/javaScriptInEvents.js': () => { require('./scripts/project/javaScriptInEvents.js'); },
  'scripts/supportcheck.js': () => { require('./scripts/supportcheck.js'); },
  'scripts/main.js': () => { require('./scripts/main.js'); }
};

globalThis.__loadScript = async function (src) {
  let clean = src;
  if (clean.startsWith('https://localhost/')) clean = clean.substring('https://localhost/'.length);
  if (clean.startsWith('http://localhost/')) clean = clean.substring('http://localhost/'.length);
  if (clean.startsWith('https://minigame.local/')) clean = clean.substring('https://minigame.local/'.length);
  if (clean.startsWith('file:///')) clean = clean.substring('file:///'.length);
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (clean.startsWith('/')) clean = clean.substring(1);

  console.log('[BlumgiSlime] Loading script module:', clean);

  if (scriptModules[clean]) {
    scriptModules[clean]();
    return;
  }
  if (typeof require === 'function') {
    try {
      require('./' + clean);
      return;
    } catch (err) {
      console.warn('[BlumgiSlime] Could not load script module:', clean, err);
    }
  }
};

// Subpackage Preloader
function loadSub(name) {
  return new Promise((resolve) => {
    if (typeof tt === 'undefined' || !tt.loadSubpackage) return resolve();
    const task = tt.loadSubpackage({
      name,
      success: () => {
        console.log(`[BlumgiSlime] Subpackage ${name} loaded successfully`);
        resolve();
      },
      fail: (err) => {
        console.warn(`[BlumgiSlime] Subpackage ${name} load fail:`, err);
        resolve();
      }
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((res) => {
        console.log(`[BlumgiSlime] loading ${name}: ${res.progress}%`);
      });
    }
  });
}

// Trigger deviceready lifecycle event if needed
let devicereadyFired = false;
function triggerDeviceReady() {
  if (devicereadyFired) return;
  devicereadyFired = true;
  if (typeof window !== 'undefined') window.__devicereadyFired = true;
  if (typeof document !== 'undefined') document.__devicereadyFired = true;
  if (typeof globalThis !== 'undefined') globalThis.__devicereadyFired = true;
  if (typeof document !== 'undefined' && document.dispatchEvent) {
    try {
      const evt = typeof Event !== 'undefined' ? new Event('deviceready') : { type: 'deviceready' };
      document.dispatchEvent(evt);
      console.log('[BlumgiSlime] Dispatched deviceready event to document');
    } catch (e) {
      console.warn('[BlumgiSlime] deviceready dispatch warning:', e);
    }
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      const evt = typeof Event !== 'undefined' ? new Event('deviceready') : { type: 'deviceready' };
      window.dispatchEvent(evt);
      console.log('[BlumgiSlime] Dispatched deviceready event to window');
    } catch (e) {}
  }
}

async function initGame() {
  console.log('[BlumgiSlime] Loading subpackages before starting runtime...');
  await Promise.all([
    loadSub('images'),
    loadSub('media'),
    loadSub('data')
  ]);

  // Preload data.json into global memory for zero-IO C3 startup
  try {
    if (!globalThis.__c3DataJson) {
      if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
        const fs = tt.getFileSystemManager();
        const content = fs.readFileSync('data/data.json', 'utf8');
        globalThis.__c3DataJson = JSON.parse(content);
        console.log('[BlumgiSlime] Loaded data.json via FileSystemManager successfully');
      } else if (typeof require === 'function') {
        globalThis.__c3DataJson = require('./data/data.json');
        console.log('[BlumgiSlime] Loaded data.json into globalThis.__c3DataJson successfully');
      }
    }
  } catch (e) {
    console.warn('[BlumgiSlime] Failed to preload ./data/data.json:', e);
  }

  // Load embedded image map if available
  try {
    if (!globalThis.__embeddedAssets && typeof require === 'function') {
      globalThis.__embeddedAssets = require('./images/embedded-assets.js');
      console.log('[BlumgiSlime] Loaded embedded-assets count:', Object.keys(globalThis.__embeddedAssets).length);
    }
  } catch (e) {}

  // Preload Box2D WASM binary
  try {
    const embeddedWasm = require('./scripts/embedded-wasm.js');
    if (embeddedWasm && embeddedWasm.getWasmBuffer) {
      globalThis.__box2dWasmBuffer = embeddedWasm.getWasmBuffer('box2d.wasm');
      console.log('[BlumgiSlime] Preloaded box2d.wasm successfully from embedded-wasm.js');
    }
  } catch (e) {
    console.warn('[BlumgiSlime] Failed to preload box2d.wasm from embedded-wasm:', e);
  }

  // Preload Box2D WASM Module JS
  try {
    require('./box2d.wasm.js');
    console.log('[BlumgiSlime] Loaded box2d.wasm.js successfully');
  } catch (e) {
    console.warn('[BlumgiSlime] Failed to require box2d.wasm.js:', e);
  }

  console.log('[BlumgiSlime] Starting C3 main runtime...');
  require('./scripts/supportcheck.js');
  require('./scripts/main.js');

  triggerDeviceReady();
}

initGame();

console.log('[BlumgiSlime] Game entry script bootstrap complete.');
