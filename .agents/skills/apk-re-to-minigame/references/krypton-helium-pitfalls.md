# 抖音小游戏双端运行时（Krypton 与 Helium）避坑实战指南

抖音小游戏在 Android 和 iOS 上采用两套完全不同的底层 C++ 渲染引擎：
- **Android 端**：基于 **Krypton** 引擎（结合 Skity 渲染加速）
- **iOS 端**：基于 **Helium** 引擎

二者在 JS 运行环境、浏览器 DOM/BOM 模拟、API 完整性上存在显著差异。以下为已验证的真实踩坑记录与标准解法。

---

## 1. 安卓真机扫码黑屏问题

### 现象
扫码调试时无报错或日志中断，但手机屏幕完全黑屏，无法进入主场景。

### 根因 1：缺失 `window.visualViewport`
- **原因**：Krypton 在初始化屏幕或布局大小时会读取 `window.visualViewport.width`。若未垫片或缺少事件派发能力，后续 C3 渲染管线会中断或视口宽高为 0。
- **解法**：在适配层 `adapter/tt-c3-adapter.js` 全局注入完备的 `visualViewport`：
```javascript
if (typeof window.visualViewport === 'undefined') {
  const listeners = {};
  window.visualViewport = {
    width: info.windowWidth || info.screenWidth,
    height: info.windowHeight || info.screenHeight,
    scale: 1,
    pageLeft: 0,
    pageTop: 0,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    removeEventListener(type, cb) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(f => f !== cb);
    },
    dispatchEvent(evt) {
      const cbs = listeners[evt.type];
      if (cbs) cbs.forEach(f => { try { f(evt); } catch (e) {} });
      return true;
    }
  };
}
```

### 根因 2：硬编码 iPhone UserAgent
- **原因**：历史适配器常直接硬编码 `Mozilla/5.0 (iPhone; CPU iPhone OS...)`，导致 Android Krypton 误走 iOS 原生视口修正分支，坐标和尺寸全部错位。
- **解法**：根据 `tt.getSystemInfoSync().platform` 动态拼接 UA：
```javascript
const platform = (info.platform || '').toLowerCase();
const isAndroid = platform.includes('android');
const baseUa = isAndroid
  ? `Mozilla/5.0 (Linux; Android 10; Mobile; rv:88.0) Gecko/88.0 Firefox/88.0`
  : `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15`;
```

---

## 2. 核心全局垫片缺失

### `atob is not defined`
- **现象**：`ReferenceError: atob is not defined at scripts/c3runtime.js`
- **原因**：Krypton 不包含浏览器内置的 base64 编解码方法 `atob` / `btoa`。
- **解法**：在 `game.js` 与适配层开头挂载纯 JS Base64 解码器，并同步挂载到 `globalThis`、`window`、`self`：
```javascript
const _b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function _polyAtob(input) {
  if (typeof tt !== 'undefined' && tt.base64ToArrayBuffer) {
    try {
      const ab = tt.base64ToArrayBuffer(String(input));
      const u8 = new Uint8Array(ab);
      let s = '', chunk = 8192;
      for (let i = 0; i < u8.length; i += chunk) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
      }
      return s;
    } catch (e) {}
  }
  let str = String(input).replace(/[=]+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & (bs >> (-2 * bc & 6))) : 0) {
    buffer = _b64chars.indexOf(buffer);
  }
  return output;
}
globalThis.atob = window.atob = self.atob = _polyAtob;
```

### `Blob is not defined` / `URL.createObjectURL` 报错
- **现象**：Construct 3 解析二进制模型或图集时报 `Failed to construct 'URL'` 或 `Blob is not defined`。
- **解法**：实现轻量 `MiniBlob` 类（支持 `slice()`, `arrayBuffer()`, `text()`, `stream()`），并在 `URL.createObjectURL` 中将 MiniBlob 直接转换为 Base64 Data-URI。

### `ReferenceError: DOMRect is not defined`
- **现象**：`Unhandled exception running script ...: ReferenceError: DOMRect is not defined at Rect.toDOMRect (c3runtime.js)`
- **原因**：C3 原生 SDK 中的 `Rect.prototype.toDOMRect` 和 `Quad.prototype.toDOMQuad`（以及场景脚本调用 `inst.getBoundingBox()`）依赖 W3C Geometry API（`DOMRect`, `DOMPoint`, `DOMQuad`, `DOMMatrix`）。移动端小游戏运行时（Android Krypton 与 iOS Helium）未提供这些 DOM 几何对象。
- **解法**：在 `game.js` 和适配层实现标准且轻量的 `DOMRectReadOnly`, `DOMRect`, `DOMPointReadOnly`, `DOMPoint`, `DOMQuad`, `DOMMatrixReadOnly`, `DOMMatrix` 垫片，并挂载到全局作用域；同时对 `toDOMRect` 和 `toDOMQuad` 增加安全回退。

### Android Krypton 字体大小极小（10px 降级）问题
- **现象**：在 PC 开发者工具模拟器中文字大小正常，但在 Android 抖音真机上，所有 Text 插件文本（标题、按钮文字、数字）全部缩成微小的默认字号。
- **原因**：Construct 3 引擎内部历史上使用 `pt`（点）作为字体大小单位，生成形如 `bold 36pt "Arial"` 的 Canvas 字体字符串。
  - PC 模拟器运行在 Chromium 内核，支持 `pt` 并会自动换算为像素（`1pt = 1.333px`）。
  - Android 真机运行在 **Krypton**（Skia C++）原生 Canvas 2D 引擎，其原生字体解析器**仅支持 `px` 像素单位，且不支持字体族名带引号**。
  - 当解析 `pt` 失败时，Krypton 会静默忽略，并降级为 HTML5 Canvas 默认字体 `10px sans-serif`。
  - 在手机的高 DPR（如 2.75 或 3.0）高分屏下，10px 的离屏纹理贴图贴到 3D/2D 场景中，文字被进一步压缩到只有 **3.3 物理像素**，呈现极小笔画。
- **解法**：
  1. 在 `c3runtime.js` 的 `RendererText._GetFontString()` 中，将所有的 `pt` 单位显式转换为 `px`（`px = Math.round(pt * 4 / 3)`），并去掉字体名周围的双引号。
  2. 在适配层 `tt-c3-adapter.js` 拦截 Canvas2D 的 `ctx.font` 属性设置器，自动将输入的 `(\d+)pt` 正则替换为对应的 `px` 像素值，去除引号，确保双重兜底。

---

## 3. iOS 重启游戏变竖屏问题

### 现象
在苹果手机端点击右上角“…”菜单选择“重新进入小游戏”后，原横屏游戏画面变成了竖屏显示，布局被压扁。

### 根因
iOS 抖音小游戏宿主在重启实例时，默认以手机当前物理持握姿态初始化窗口，如果未显式锁定方向，视口宽高可能颠倒。

### 解法
1. `game.json` 显式声明：
   ```json
   { "deviceOrientation": "landscape" }
   ```
2. 在 `game.js` 和适配器中监听 `tt.onShow`，强行重设方向：
   ```javascript
   if (tt.setDeviceOrientation) {
     tt.setDeviceOrientation({ value: 'landscape' });
   }
   tt.onShow(() => {
     if (tt.setDeviceOrientation) {
       tt.setDeviceOrientation({ value: 'landscape' });
     }
   });
   ```

---

## 4. 位图字体 0/00 与特殊货币符号错位

### 现象
游戏中卖出矿石或打开建造面板时，原本应显示 `煤矿 x100` 或 `$700`，结果显示为 `00x100` 或单独一个 `0`。

### 根因
- Construct 3 的 `Spritefont2`（位图字体）依赖字符串映射表（如 `"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ..."`）。
- 海外游戏中常将 `£`、`$`、`¢` 作为金币/能量图标直接画在位图字体图集中。
- 若汉化时直接覆盖了字体映射表或图集索引发生了偏移，原货币符号就会落在 `'0'` 或 `' '` 的格子里，导致显示成 `0` 或 `00`。

### 解法
- 检查 `data.json` 中 `Spritefont2` 对象的 `character-set` 字符串。
- 保证原有特殊符号（`£/¥/$/€`）在字符集中的索引位置与美术切图完全一致。

---

## 5. GLSL ES 1.00 着色器编译崩溃 (S0012 错误)

### 现象
在 Android 真机（Krypton 引擎 / Mali 或 Adreno GPU）扫码运行时黑屏，控制台报错：
`WebGL shader compilation failed: ERROR: 0:xx: 'v' : non-constant initialiser for global variable` 或 `S0012: Value being assigned must be a constant`。

### 根因
- 桌面 Chrome WebGL 允许在片元/顶点着色器的全局作用域中使用非常量（如 `uniform` 变量）初始化全局变量（例如：`highp float v = u_fade;` 或 `lowp vec4 col = texture2D(...);`）。
- Android 移动端 GPU 驱动严格执行 **OpenGL ES 2.0 / GLSL ES 1.00** 规范：**全局变量声明只能由编译期常量表达式（Constant Expression）初始化**。一旦着色器存在全局非常量赋值，着色器编译直接失败并抛出致命异常，导致 C3 整个渲染管线中断。

### 解法
1. **全局变量声明与初始化解耦**：
   排查着色器源码或 `c3runtime.js` 中的 shader 模板，将全局非常量变量移入 `void main()` 函数体内赋值：
   ```glsl
   // 错误写法 (GLSL ES 1.00 必崩)
   uniform lowp float u_intensity;
   lowp float intensity = u_intensity * 2.0;
   void main() { ... }

   // 正确写法
   uniform lowp float u_intensity;
   lowp float intensity;
   void main() {
     intensity = u_intensity * 2.0;
     ...
   }
   ```
2. **C3 编译熔断降级 (Shader Fallback)**：
   在 `scripts/c3runtime.js` 的 `WebGLShaderProgram.Compile` 中增加 try-catch 降级逻辑。当某个滤镜特效 Shader 编译失败时，自动降级为系统默认直通着色器，避免单个特效报错导致整盘游戏黑屏。

---

## 6. WebM Opus 音频原生解码崩溃与单线程 Wasm 软解管线

### 现象
游戏播放音效或背景音乐时，Android 真机报错：
`AudioDecodeWorker error: unsupported audio format` 或 `AudioContext.decodeAudioData failed`，导致全游静音甚至主进程死锁。

### 根因
1. **原生解码器不兼容**：抖音小游戏 Android Krypton / iOS Helium 的原生音频解码器（如 `AudioDecodeWorker`）仅原生支持 MP3、M4A、AAC，对 `.webm` 封装的 Opus 音频支持不稳定或直接拒绝。
2. **C3 误判原生支持**：C3 会探测 `canPlayType('audio/webm; codecs="opus"')`。若适配层返回 `"maybe"` 或 `"probably"`，C3 便试图直接调用原生硬解，触发底层 C++ 报错。
3. **缺失 Web Worker 环境**：当 C3 走软件解码（Wasm）时，默认通过 `JobWorker` 将解码任务派发至 Web Worker。然而小游戏运行于单线程环境，没有标准的浏览器 Web Worker，导致任务挂起、解码回调永不触发。

### 解法
1. **适配器阻断原生 WebM 声明**：
   在 `adapter/tt-c3-adapter.js` 的 `MiniAudio.prototype.canPlayType` 中，针对包含 `webm` 或 `opus` 的请求强制返回 `""`（空字符串），声明不支持硬件解码，迫使 C3 走 Wasm 软件解码。
2. **主入口预加载 Opus WASM**：
   在 `game.js` 的 `initGame()` 中，通过 `tt.getFileSystemManager().readFileSync` 同步读取 `scripts/opus.wasm.wasm`，挂载至 `Module.wasmBinary`，并载入 `scripts/opus.wasm.js`：
   ```javascript
   const fs = tt.getFileSystemManager();
   const wasmBinary = fs.readFileSync('scripts/opus.wasm.wasm');
   const g = globalThis;
   g.JobHandlers = g.JobHandlers || {};
   g.sentBuffers = g.sentBuffers || new Map();
   g.Module = g.Module || {};
   g.sentBuffers.set('opus-decoder-wasm', wasmBinary);
   g.Module.wasmBinary = wasmBinary;
   require('./scripts/opus.wasm.js');
   ```
3. **单线程化改写 `_WasmDecodeWebMOpus`**：
   在 `scripts/c3runtime.js` 或 `scripts/main.js` 中拦截 `_WasmDecodeWebMOpus`，直接在本线程同步/异步调用 `g.JobHandlers["OpusDecode"]` 处理解码，跳过 `JobWorker` 派发：
   ```javascript
   // 单线程就地运行 Opus 软解任务
   const result = await g.JobHandlers["OpusDecode"]({
     "arrayBuffer": webmBuffer
   });
   ```
4. **SafeAudioContext 二进制嗅探**：
   在适配层的 `ctx.decodeAudioData` 中嗅探二进制头部，若匹配 WebM EBML 魔数（`0x1A 0x45 0xDF 0xA3`），自动转走软件 Opus 解码器并构造 `AudioBuffer` 返回。

---

## 7. Android Krypton AudioParam 缺失与首次交互解锁

### 现象
游戏触发音效渐弱、音量过渡或音效停止时报错：
`TypeError: ap.cancelScheduledValues is not a function` 或 `AudioContext was not allowed to start`。

### 根因
1. Krypton 原生 AudioContext 的 AudioNode（GainNode、StereoPannerNode 等）仅提供了基础的 `value` 读写，缺失了 W3C 标准的音频自动化调度方法（如 `cancelScheduledValues`、`cancelAndHoldAtTime`、`linearRampToValueAtTime`）。
2. 移动端安全策略：AudioContext 创建后默认为 `suspended` 挂起状态，未经过用户交互前禁止出声。

### 解法
1. **提供 `ensureAudioParam` 垫片**：
   在适配器中对所有 AudioParam 对象（`gain`, `pan`, `playbackRate` 等）执行安全补齐：
   ```javascript
   function ensureAudioParam(param, defaultValue = 0) {
     if (!param || typeof param !== 'object') param = { value: defaultValue };
     if (typeof param.value !== 'number') param.value = defaultValue;
     const noopSelf = function (val) { if (val !== undefined) this.value = Number(val); return this; };
     if (typeof param.setValueAtTime !== 'function') param.setValueAtTime = noopSelf;
     if (typeof param.linearRampToValueAtTime !== 'function') param.linearRampToValueAtTime = noopSelf;
     if (typeof param.exponentialRampToValueAtTime !== 'function') param.exponentialRampToValueAtTime = noopSelf;
     if (typeof param.setTargetAtTime !== 'function') param.setTargetAtTime = noopSelf;
     if (typeof param.setValueCurveAtTime !== 'function') param.setValueCurveAtTime = function () { return this; };
     if (typeof param.cancelScheduledValues !== 'function') param.cancelScheduledValues = function () { return this; };
     if (typeof param.cancelAndHoldAtTime !== 'function') param.cancelAndHoldAtTime = function () { return this; };
     return param;
   }
   ```
2. **全局首触解除静音锁定**：
   在适配器和 `game.js` 中监听 `tt.onTouchStart`、`tt.onTouchEnd` 和 `tt.onShow`，首次触发时自动调用 `ctx.resume()`。

---

## 8. ES6 原型链 Getter/Setter 严格模式赋值冲突

### 现象
Android Krypton 在 strict 模式下报致命错误：
`TypeError: Cannot set property duration of #<MiniAudio> which has only a getter`。

### 根因
- `MiniAudio` 继承了基类 `MiniElement`。
- `MiniAudio` 在原型上定义了只读 getter（如 `get duration() { return this._duration; }`），但未声明对应的 `set duration(v)`。
- 在基类 `MiniElement` 构造函数中，存在 `this.duration = 0;` 初始化语句。
- **ES6 规范**：在严格模式（`'use strict'`）下，如果实例或其原型链上存在只读 getter 而无 setter，直接对该属性进行普通赋值（`this.prop = val`）将直接抛出 `TypeError`。

### 解法
1. **对所有只读 getter 属性对称提供空 setter**：
   ```javascript
   class MiniAudio extends MiniElement {
     get duration() { return this._duration || 0; }
     set duration(v) {} // 必须提供空 setter，避免严格模式赋值抛错
     get paused() { return this._paused; }
     set paused(v) {}
     get readyState() { return this._readyState; }
     set readyState(v) {}
     get ended() { return this._ended; }
     set ended(v) {}
   }
   ```
2. **基类构造函数采用防御式属性赋值**：
   在 `MiniElement` 构造函数中使用 `try { this[k] = v; } catch (e) {}` 包装，防止派生类只读属性阻断初始化。

---

## 9. 数据分包中 `data.json` 读取陷阱与存储持久化

### 现象
1. 分包加载完成后，执行 `require('./data/data.json')` 抛出模块找不到或 JSON 解析错误。
2. 玩家在游戏中获得金币、升级建筑后退出游戏，再次扫码进入时数据全部清空。

### 根因
1. **小游戏分包并非 Node 环境**：部分真机上的 CommonJS `require` 仅能加载 `.js` 代码，不能稳定读取分包内的 `.json` 静态数据。
2. **缺少 IndexedDB 导致存储内存化**：Construct 3 默认依赖 `localForage`，优先选用 IndexedDB。小游戏环境不支持 IndexedDB，导致其静默降级为临时内存存储（Memory Storage），游戏退出或刷新后数据丢失。

### 解法
1. **通过 `tt.getFileSystemManager()` 同步预读数据**：
   在 `game.js` 的 `initGame()` 中等待 `loadSub('data')` 成功后，立刻通过小游戏文件系统读取并缓存在全局：
   ```javascript
   const fs = tt.getFileSystemManager();
   const content = fs.readFileSync('data/data.json', 'utf8');
   globalThis.__c3DataJson = JSON.parse(content);
   ```
   并在 C3 资源加载逻辑中优先命中 `globalThis.__c3DataJson`。
2. **本地存储桥接 `tt.getStorageSync` / `tt.setStorageSync`**：
   在 `adapter/tt-c3-adapter.js` 中将 `window.localStorage` 的 `getItem`、`setItem`、`removeItem` 完全桥接到小游戏的同步存储 API，确保存档实时落地物理磁盘。

---

## 10. WASM 静态资源被抖音小游戏编译器过滤与 JS 内嵌解法

### 现象
1. 控制台报错：
   `API_ERROR: readFileSync:fail no such file or directory, readFileSync scripts/opus.wasm.wasm`
   或 `readFileSync:fail no such file or directory, readFileSync noise.wasm`
2. 紧接着抛出：
   `failed to asynchronously prepare wasm: not yet received opus blob`
   `Error: unhandledRejection: abort("not yet received opus blob")`
   `Error: No fetch implementation for: noise.wasm`
   导致音频软解失败甚至引擎主逻辑中断。

### 根因
- 抖音小游戏开发者工具与真机编译器存在静态资源文件类型白名单机制（仅自动打包 `.js`、`.json` 及常见图片、音视频文件）。
- `.wasm` 扩展名不在默认打包白名单内，项目目录中的 `noise.wasm` 和 `scripts/opus.wasm.wasm` **不会被拷贝到小游戏的虚拟文件系统**。
- 因此在运行时调用 `tt.getFileSystemManager().readFileSync('noise.wasm')` 时必然报 `no such file or directory`。

### 解法
1. **生成 `scripts/embedded-wasm.js` 内嵌 Base64**：
   将 `.wasm` 二进制转为 Base64 字符串内嵌在 JS 模块中（38KB 的 `noise.wasm` 仅 ~50KB Base64，121KB 的 `opus.wasm` 仅 ~162KB Base64，完全不影响 4MB 主包限制）。
2. **利用 `tt.base64ToArrayBuffer` 极速解码**：
   在 `embedded-wasm.js` 中导出 `getNoiseWasmBuffer()` 和 `getOpusWasmBuffer()`，优先通过原生 C++ 提供的 `tt.base64ToArrayBuffer` 瞬间转换回 `ArrayBuffer`（耗时 < 1ms）。
3. **主入口预置全局与适配层兜底**：
   - 在 `game.js` 入口直接执行 `globalThis.__noiseWasmBuffer = embeddedWasm.getNoiseWasmBuffer();` 与 `sentBuffers.set('opus-decoder-wasm', embeddedWasm.getOpusWasmBuffer());`；
   - 在 `adapter/tt-c3-adapter.js` 的 `fetch` 垫片中拦截 `noise.wasm` 与 `opus.wasm.wasm`，直接返回包含内联 Buffer 的 Mock Response；
   - 在 `scripts/opus.wasm.js` 的 `getBinaryPromise` 中增加对 `__opusWasmBuffer` 与 `embedded-wasm.js` 的直接读取，彻底杜绝 `abort("not yet received opus blob")`。


