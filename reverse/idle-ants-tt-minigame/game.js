/**
 * ByteDance MiniGame Entry for Idle Ants (Construct 3)
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

// Geometry Polyfills for Krypton (Android) & Helium (iOS)
class MiniDOMRectReadOnly {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this._x = +x || 0;
    this._y = +y || 0;
    this._width = +width || 0;
    this._height = +height || 0;
  }
  get x() { return this._x; }
  get y() { return this._y; }
  get width() { return this._width; }
  get height() { return this._height; }
  get top() { return Math.min(this._y, this._y + this._height); }
  get bottom() { return Math.max(this._y, this._y + this._height); }
  get left() { return Math.min(this._x, this._x + this._width); }
  get right() { return Math.max(this._x, this._x + this._width); }
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      left: this.left
    };
  }
  static fromRect(other) {
    return new MiniDOMRectReadOnly(
      other ? other.x : 0,
      other ? other.y : 0,
      other ? other.width : 0,
      other ? other.height : 0
    );
  }
}

class MiniDOMRect extends MiniDOMRectReadOnly {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    super(x, y, width, height);
  }
  get x() { return this._x; }
  set x(v) { this._x = +v || 0; }
  get y() { return this._y; }
  set y(v) { this._y = +v || 0; }
  get width() { return this._width; }
  set width(v) { this._width = +v || 0; }
  get height() { return this._height; }
  set height(v) { this._height = +v || 0; }
  static fromRect(other) {
    return new MiniDOMRect(
      other ? other.x : 0,
      other ? other.y : 0,
      other ? other.width : 0,
      other ? other.height : 0
    );
  }
}

class MiniDOMPointReadOnly {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this._x = +x || 0;
    this._y = +y || 0;
    this._z = +z || 0;
    this._w = +w || 1;
  }
  get x() { return this._x; }
  get y() { return this._y; }
  get z() { return this._z; }
  get w() { return this._w; }
  matrixTransform() { return this; }
  toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
  static fromPoint(other) {
    return new MiniDOMPointReadOnly(
      other ? other.x : 0,
      other ? other.y : 0,
      other ? other.z : 0,
      other && typeof other.w === 'number' ? other.w : 1
    );
  }
}

class MiniDOMPoint extends MiniDOMPointReadOnly {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    super(x, y, z, w);
  }
  get x() { return this._x; }
  set x(v) { this._x = +v || 0; }
  get y() { return this._y; }
  set y(v) { this._y = +v || 0; }
  get z() { return this._z; }
  set z(v) { this._z = +v || 0; }
  get w() { return this._w; }
  set w(v) { this._w = +v || 1; }
  static fromPoint(other) {
    return new MiniDOMPoint(
      other ? other.x : 0,
      other ? other.y : 0,
      other ? other.z : 0,
      other && typeof other.w === 'number' ? other.w : 1
    );
  }
}

class MiniDOMQuad {
  constructor(p1, p2, p3, p4) {
    this.p1 = p1 ? MiniDOMPoint.fromPoint(p1) : new MiniDOMPoint();
    this.p2 = p2 ? MiniDOMPoint.fromPoint(p2) : new MiniDOMPoint();
    this.p3 = p3 ? MiniDOMPoint.fromPoint(p3) : new MiniDOMPoint();
    this.p4 = p4 ? MiniDOMPoint.fromPoint(p4) : new MiniDOMPoint();
  }
  getBounds() {
    const minX = Math.min(this.p1.x, this.p2.x, this.p3.x, this.p4.x);
    const maxX = Math.max(this.p1.x, this.p2.x, this.p3.x, this.p4.x);
    const minY = Math.min(this.p1.y, this.p2.y, this.p3.y, this.p4.y);
    const maxY = Math.max(this.p1.y, this.p2.y, this.p3.y, this.p4.y);
    return new MiniDOMRect(minX, minY, maxX - minX, maxY - minY);
  }
  toJSON() { return { p1: this.p1, p2: this.p2, p3: this.p3, p4: this.p4 }; }
  static fromRect(rect) {
    if (!rect) return new MiniDOMQuad();
    const p1 = new MiniDOMPoint(rect.x, rect.y);
    const p2 = new MiniDOMPoint(rect.x + rect.width, rect.y);
    const p3 = new MiniDOMPoint(rect.x + rect.width, rect.y + rect.height);
    const p4 = new MiniDOMPoint(rect.x, rect.y + rect.height);
    return new MiniDOMQuad(p1, p2, p3, p4);
  }
  static fromQuad(other) {
    return new MiniDOMQuad(other ? other.p1 : null, other ? other.p2 : null, other ? other.p3 : null, other ? other.p4 : null);
  }
}

class MiniDOMMatrixReadOnly {
  constructor() {
    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
    this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
    this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
    this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
    this.is2D = true;
    this.isIdentity = true;
  }
  transformPoint(point) { return point ? MiniDOMPoint.fromPoint(point) : new MiniDOMPoint(); }
  toFloat32Array() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  toFloat64Array() { return new Float64Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  static fromMatrix() { return new MiniDOMMatrixReadOnly(); }
}
class MiniDOMMatrix extends MiniDOMMatrixReadOnly {
  static fromMatrix() { return new MiniDOMMatrix(); }
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
  if (!target.DOMRectReadOnly) target.DOMRectReadOnly = MiniDOMRectReadOnly;
  if (!target.DOMRect) target.DOMRect = MiniDOMRect;
  if (!target.DOMPointReadOnly) target.DOMPointReadOnly = MiniDOMPointReadOnly;
  if (!target.DOMPoint) target.DOMPoint = MiniDOMPoint;
  if (!target.DOMQuad) target.DOMQuad = MiniDOMQuad;
  if (!target.DOMMatrixReadOnly) target.DOMMatrixReadOnly = MiniDOMMatrixReadOnly;
  if (!target.DOMMatrix) target.DOMMatrix = MiniDOMMatrix;
};

if (typeof globalThis !== 'undefined') _exposeGlobals(globalThis);
if (typeof window !== 'undefined') _exposeGlobals(window);
if (typeof self !== 'undefined') _exposeGlobals(self);
if (typeof global !== 'undefined') _exposeGlobals(global);

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

console.log('[IdleAnts] Initializing ByteDance MiniGame environment...');

// Ensure C3 support flags are set
if (typeof window !== 'undefined') {
  window.C3_ModernJSSupport_OK = true;
  window.C3_IsSupported = true;
}

// Set & Lock Portrait Orientation
if (typeof tt !== 'undefined') {
  if (tt.setDeviceOrientation) {
    try {
      tt.setDeviceOrientation({ value: 'portrait' });
    } catch (e) {}
  }
  if (tt.onShow) {
    tt.onShow(() => {
      if (tt.setDeviceOrientation) {
        try {
          tt.setDeviceOrientation({ value: 'portrait' });
        } catch (e) {}
      }
    });
  }
}

// Load Core Libs, SDKManager & PokiSDK Bridge
require('./lodash.custom.min.js');
require('./tween.js');
require('./SDKManager.js');
require('./poki-sdk.js');

// Dynamic script loader for Construct 3 runtime scripts
const scriptModules = {
  'scripts/c3runtime.js': () => {
    require('./scripts/c3runtime.js');
    if (typeof self !== 'undefined' && self.C3 && self.C3.Supports) {
      self.C3.Supports.ImageBitmap = false;
      self.C3.Supports.ImageBitmapOptions = false;
      self.C3.Supports.ImageBitmapOptionsResize = false;
    }
  },
  'scripts/supportcheck.js': () => { require('./scripts/supportcheck.js'); },
  'scripts/main.js': () => { require('./scripts/main.js'); },
  'scripts/offlineclient.js': () => {},
  'scripts/project/main.js': () => { require('./scripts/project/main.js'); },
  'scripts/project/scriptsInEvents.js': () => { require('./scripts/project/scriptsInEvents.js'); },
  'SDKManager.js': () => { require('./SDKManager.js'); }
};

globalThis.__loadScript = async function (src) {
  let clean = src;
  if (clean.startsWith('https://localhost/')) clean = clean.substring('https://localhost/'.length);
  if (clean.startsWith('http://localhost/')) clean = clean.substring('http://localhost/'.length);
  if (clean.startsWith('https://minigame.local/')) clean = clean.substring('https://minigame.local/'.length);
  if (clean.startsWith('file:///')) clean = clean.substring('file:///'.length);
  if (clean.startsWith('./')) clean = clean.substring(2);
  if (clean.startsWith('/')) clean = clean.substring(1);

  console.log('[IdleAnts] Loading script module:', clean);

  if (scriptModules[clean]) {
    scriptModules[clean]();
    return;
  }
  if (typeof require === 'function') {
    try {
      require('./' + clean);
      return;
    } catch (err) {
      console.warn('[IdleAnts] Could not load script module:', clean, err);
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
        console.log(`[IdleAnts] Subpackage ${name} loaded successfully`);
        resolve();
      },
      fail: (err) => {
        console.warn(`[IdleAnts] Subpackage ${name} load fail:`, err);
        resolve();
      }
    });
    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((res) => {
        console.log(`[IdleAnts] loading ${name}: ${res.progress}%`);
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
      console.log('[IdleAnts] Dispatched deviceready event to document');
    } catch (e) {
      console.warn('[IdleAnts] deviceready dispatch warning:', e);
    }
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      const evt = typeof Event !== 'undefined' ? new Event('deviceready') : { type: 'deviceready' };
      window.dispatchEvent(evt);
      console.log('[IdleAnts] Dispatched deviceready event to window');
    } catch (e) {}
  }
}

async function initGame() {
  console.log('[IdleAnts] Loading subpackages before starting runtime...');
  await Promise.all([
    loadSub('images'),
    loadSub('media'),
    loadSub('data')
  ]);

  // Preload embedded image assets for zero-IO texture creation
  try {
    const embedded = require('./images/embedded-assets.js');
    globalThis.__idleAntsEmbeddedImages = embedded;
    globalThis.__embeddedAssets = embedded;
    console.log('[IdleAnts] Loaded embedded-assets count:', Object.keys(embedded).length);
  } catch (e) {
    console.warn('[IdleAnts] Failed to load embedded-assets.js:', e);
  }

  // Preload data.json into global memory for zero-IO C3 startup
  try {
    if (!globalThis.__c3DataJson) {
      if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
        const fs = tt.getFileSystemManager();
        const content = fs.readFileSync('data/data.json', 'utf8');
        globalThis.__c3DataJson = JSON.parse(content);
        console.log('[IdleAnts] Loaded data.json via FileSystemManager successfully');
      } else if (typeof require === 'function') {
        globalThis.__c3DataJson = require('./data/data.json');
        console.log('[IdleAnts] Loaded data.json into globalThis.__c3DataJson successfully');
      }
    }
  } catch (e) {
    console.warn('[IdleAnts] Failed to preload ./data/data.json:', e);
  }

  // Preload Opus WASM decoder for in-thread WebM audio decoding
  try {
    let wasmBinary = null;
    if (typeof tt !== 'undefined' && tt.getFileSystemManager) {
      try {
        wasmBinary = tt.getFileSystemManager().readFileSync('scripts/opus.wasm.wasm');
      } catch (e) {
        console.warn('[IdleAnts] Could not read opus.wasm.wasm via FileSystemManager:', e);
      }
    } else if (typeof require === 'function') {
      try {
        const nodeFs = require('fs');
        const nodePath = require('path');
        const p = nodePath.resolve(__dirname, 'scripts/opus.wasm.wasm');
        if (nodeFs.existsSync(p)) {
          const buf = nodeFs.readFileSync(p);
          wasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
      } catch (e) {}
    }
    const g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : self);
    const sentBufs = g.sentBuffers || new Map();
    g.sentBuffers = sentBufs;
    if (typeof window !== 'undefined') window.sentBuffers = sentBufs;
    if (typeof self !== 'undefined') self.sentBuffers = sentBufs;

    const sentBls = g.sentBlobs || new Map();
    g.sentBlobs = sentBls;
    if (typeof window !== 'undefined') window.sentBlobs = sentBls;
    if (typeof self !== 'undefined') self.sentBlobs = sentBls;

    g.JobHandlers = g.JobHandlers || {};
    g.Module = g.Module || {};
    if (wasmBinary) {
      sentBufs.set('opus-decoder-wasm', wasmBinary);
      g.Module.wasmBinary = wasmBinary;
      console.log('[IdleAnts] Set opus-decoder-wasm binary, byteLength:', wasmBinary.byteLength);
    }
    if (typeof require === 'function') {
      require('./scripts/opus.wasm.js');
      console.log('[IdleAnts] Preloaded opus.wasm.js successfully');
    }
  } catch (e) {
    console.warn('[IdleAnts] Failed to preload opus.wasm:', e);
  }

  // Preload noise.wasm binary into Module / global buffer
  try {
    const fs = (typeof tt !== 'undefined' && tt.getFileSystemManager) ? tt.getFileSystemManager() : null;
    if (fs && fs.readFileSync) {
      const noiseBuffer = fs.readFileSync('noise.wasm');
      if (noiseBuffer) {
        globalThis.__noiseWasmBuffer = noiseBuffer;
        console.log('[IdleAnts] Preloaded noise.wasm into global memory');
      }
    }
  } catch (e) {
    console.warn('[IdleAnts] noise.wasm preload warning:', e);
  }

  console.log('[IdleAnts] Starting C3 main runtime...');
  require('./scripts/supportcheck.js');
  require('./scripts/main.js');

  triggerDeviceReady();
}

initGame();

console.log('[IdleAnts] Game entry script bootstrap complete.');
