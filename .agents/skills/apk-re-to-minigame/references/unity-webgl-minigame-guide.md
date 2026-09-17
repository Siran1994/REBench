# Unity WebGL 移植抖音小游戏实战与深度避坑指南

本文档全面沉淀了将 **Unity WebGL (Unity 2020 / 2021 / 2022+ / WebAssembly / IL2CPP)** 导出的游戏工程完整移植适配为**抖音小游戏（ByteDance MiniGame）**的技术架构、关键断点与核心避坑守则。

---

## 一、Unity WebGL 运行时技术特征与包体结构

### 1. 核心运行特征
- **运行引擎**：Unity WebGL Player（Emscripten 编译工具链）
- **核心文件三件套**：
  - `*.wasm` / `*.wasm.unityweb`：编译后的游戏底层 WebAssembly 二进制逻辑库（包含游戏逻辑与 IL2CPP 运行时）。
  - `*.data` / `*.bin` / `*.data.unityweb`：UnityFS 核心资产包（场景、Mesh 网格、纹理贴图、Prefab、AudioClip、着色器）。
  - `*.framework.js` / `*.framework.js.unityweb`：Emscripten 与 Unity 核心 JavaScript 桥接框架层。
  - `*.loader.js`：Unity 官方启动器脚本，提供 `createUnityInstance(canvas, config, onProgress)` 入口。

### 2. 抖音小游戏工程标准目录规划
```text
my-unity-tt-minigame/
├── adapter/
│   └── tt-unity-adapter.js       # Unity 专属运行时适配层（Window/DOM/Canvas/Audio/Storage垫片）
├── Build/
│   ├── [hash].framework.js       # 框架运行时脚本（含尺寸修复、eval替换、DOM查询兜底）
│   └── [hash].loader.js          # Unity 实例加载引导脚本
├── wasm/                         # WASM 分包（体积较大，必须独立分包）
│   ├── game.js                   # 必需分包入口：module.exports = {};
│   └── [hash].wasm               # 原始解压态 WebAssembly 二进制
├── data/                         # 核心资产分包（体积较大，必须独立分包）
│   ├── game.js                   # 必需分包入口：module.exports = {};
│   └── [hash].bin                # 原始解压态资产二进制
├── SDKManager.js                 # 商业化与平台统一调度器（插屏、激励视频、超时熔断）
├── game.js                       # 小游戏主启动入口（内存预载、桥接挂载、启动 createUnityInstance）
├── game.json                     # 全局分包配置与横竖屏声明
└── project.config.json           # 抖音开发者工具工程配置
```

---

## 二、四大致命陷阱与核心攻坚（血泪经验）

### 陷阱 1：画布 3×3 极低分辨率与模糊渐变陷阱（根本原因与正解）

#### 现象
游戏在抖音开发者工具模拟器中能正常启动、主循环在跑、事件在派发，但游戏画面呈现大面积模糊拉伸的天空渐变与底部单色杂块，**完全看不到 3D 模型与 UI 文字**。

#### 根因剖析
1. Unity 引擎在启动初始化或转屏时，会调用 Emscripten 导出的 C++ 桥接函数：
   ```javascript
   function _JS_SystemInfo_GetCanvasClientSize(domElementSelector, outWidth, outHeight)
   ```
2. Unity 2020+ 传入的选择器默认是 `"#unity-canvas"`。原 Web 模板代码逻辑为：
   ```javascript
   var selector = UTF8ToString(domElementSelector);
   var canvas = selector == "#canvas" ? Module["canvas"] : document.querySelector(selector);
   ```
3. 在抖音小游戏开发环境中，画布是宿主环境通过 `tt.createCanvas()` 生成的原生画布，**并不是 IDE Webview DOM 树中的 HTML 元素**！`document.querySelector("#unity-canvas")` 执行结果必然返回 `null`！
4. 由于 `canvas === null`，`_JS_SystemInfo_GetCanvasClientSize` 计算出的宽高为 `0 × 0`。
5. Unity 引擎内部做了一道保底保护：当检测到尺寸 `<= 0` 时，强制截断为最小值 `1 × 1`。
6. 接着，Unity 将该尺寸乘以当前宿主的 `devicePixelRatio`（例如 iPhone 15 Pro 的 DPR 为 3）：
   $$\text{RenderWidth} = 1 \times 3 = 3,\quad \text{RenderHeight} = 1 \times 3 = 3$$
7. Unity 随后主动调用 `_emscripten_set_canvas_element_size(target, 3, 3)`，将原生画布的绘图缓冲区彻底重设为了 **3 × 3 像素**！
8. WebGL 着色器在 3×3 像素的 Framebuffer 上绘制完场景后，被小游戏容器以双线性过滤（Bilinear Interpolation）强行拉伸放大到整个 2556 × 1179 的屏幕上，所有 3D 飞机、跑道和 UI 全部被平滑融化成了彩色模糊团块！

#### 修复方案
在 `*.framework.js` 中彻底修复 `_JS_SystemInfo_GetCanvasClientSize`：
```javascript
function _JS_SystemInfo_GetCanvasClientSize(domElementSelector, outWidth, outHeight) {
  var selector = UTF8ToString(domElementSelector);
  // 第一优先级直接使用 Module["canvas"]，杜绝 document.querySelector 失败返回 null
  var canvas = Module["canvas"];
  if (!canvas && typeof document !== "undefined" && typeof document.querySelector === "function") {
    try { canvas = document.querySelector(selector); } catch (e) {}
  }
  if (!canvas && typeof Module !== "undefined") { canvas = Module["canvas"]; }

  var w = 0, h = 0;
  if (canvas) {
    if (typeof canvas.getBoundingClientRect === "function") {
      var size = canvas.getBoundingClientRect();
      w = size.width; h = size.height;
    } else {
      w = canvas.clientWidth || canvas.width;
      h = canvas.clientHeight || canvas.height;
    }
  }
  // 保底尺寸兜底（横屏基准）
  if (!w || !h) {
    var cw = window.innerWidth || (typeof screen !== "undefined" && screen.width) || 852;
    var ch = window.innerHeight || (typeof screen !== "undefined" && screen.height) || 393;
    w = cw; h = ch;
  }
  var sw = Math.max(w, h);
  var sh = Math.min(w, h);
  console.log("[GetCanvasClientSize] selector:", selector, "returning:", sw, "x", sh);
  HEAPF64[outWidth >> 3] = sw;
  HEAPF64[outHeight >> 3] = sh;
}
```

---

### 陷阱 2：绝对禁止使用 `Object.defineProperty` 覆写 `canvas.width/height`

#### 现象
当尝试通过 `Object.defineProperty(canvas, 'width', { value: 2556 })` 强行将画布尺寸改回高清时，**游戏界面立即变为全黑（黑屏）**。

#### 根因剖析
1. 抖音小游戏环境中的 `tt.createCanvas()` 是底层 C++ 绑定的宿主原生对象。其 `width` 与 `height` 属性挂载了底层原生 Setter：
   ```text
   JS canvas.width = 2556  ➔ 触发 C++ 原生 NativeCanvas::SetWidth(2556)  ➔ 重新分配 GPU Framebuffer 内存
   ```
2. 当使用 `Object.defineProperty` 强行将 `width` 和 `height` 改写为普通的 JS Data Property 时，**底层 C++ Setter 被永久切断移除**！
3. 结果是：JS 层面读取 `canvas.width` 确实显示为 2556，但底层 C++ 原生帧缓冲区根本没有得到通知扩容，依然停留在旧状态或 WebGL 上下文断连，导致 WebGL 上下文报告 Framebuffer Incomplete，**造成全黑屏**！

#### 铁律守则
> [!CAUTION]
> **绝对禁止**在小游戏环境对 `tt.createCanvas()` 返回的对象的 `width` / `height` 使用 `Object.defineProperty`！
> 必须始终通过正常的直接赋值语句（`canvas.width = targetW; canvas.height = targetH;`）触发底层的原生帧缓冲扩容。

---

### 陷阱 3：视口触摸坐标映射 (`MapViewportCoordinate`) 丢失

#### 现象
游戏画面渲染成功后，点击屏幕任意按钮、UI 或手势拉动无任何响应。

#### 根因剖析
在 `framework.js` 中：
```javascript
function _JS_DOM_MapViewportCoordinateToElementLocalCoordinate(viewportX, viewportY, targetX, targetY) {
  var canvas = document.querySelector(jsCanvasSelector());
  var rect = canvas && canvas.getBoundingClientRect();
  HEAPU32[targetX >> 2] = viewportX - (rect ? rect.left : 0);
  HEAPU32[targetY >> 2] = viewportY - (rect ? rect.top : 0);
}
```
`document.querySelector(jsCanvasSelector())` 在小游戏环境再次返回 `null`，导致触摸视口映射偏移异常。

#### 修复方案
```javascript
function _JS_DOM_MapViewportCoordinateToElementLocalCoordinate(viewportX, viewportY, targetX, targetY) {
  var canvas = Module["canvas"];
  if (!canvas && typeof document !== "undefined" && typeof document.querySelector === "function") {
    try { canvas = document.querySelector(jsCanvasSelector()); } catch (e) {}
  }
  var rect = canvas && typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
  HEAPU32[targetX >> 2] = viewportX - (rect ? rect.left : 0);
  HEAPU32[targetY >> 2] = viewportY - (rect ? rect.top : 0);
}
```

---

### 陷阱 4：WASM 与 Data 二进制网络竞争与内存预载

#### 现象
小游戏在不同性能手机上冷启动时偶发卡死在 0% 或报 `fetch failed`、`RangeError: WebAssembly.instantiate`。

#### 根因剖析
Unity WebGL 默认通过浏览器 `fetch()` 异步流式加载 `.wasm` 和 `.data`。在小游戏分包环境中，网络拦截垫片容易受到分包挂载延迟、本地绝对路径协议差异影响，导致请求并发竞态。

#### 修复方案（内存预装载）
在 `game.js` 主入口中，在调用 `createUnityInstance` 之前，使用 `FileSystemManager.readFileSync` 主动预载二进制至内存：
```javascript
// 1. 预读 wasm 与 data
const fs = tt.getFileSystemManager();
const wasmBuffer = fs.readFileSync('wasm/78675d3236180fa3ceddab8a23a2032e.wasm');
const dataBuffer = fs.readFileSync('data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin');

// 2. 直接注入 unityConfig，规避运行时 fetch
const unityConfig = {
  dataUrl: "data/a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin",
  frameworkUrl: "Build/0b14ddffb6d6867f4577189187985cab.framework.js",
  codeUrl: "wasm/78675d3236180fa3ceddab8a23a2032e.wasm",
  streamingAssetsUrl: "StreamingAssets",
  wasmBinary: wasmBuffer,
  dataBinary: dataBuffer,
  devicePixelRatio: tt.getSystemInfoSync().pixelRatio || 1,
  matchWebGLToCanvasSize: true,
  cacheControl: function () { return "no-store"; }
};

createUnityInstance(canvas, unityConfig, onProgress);
```

---

## 三、Unity 常见运行时兼容补丁汇总

| 模块 | 原始问题 | 补丁实现 |
|---|---|---|
| **Eval 脚本执行** | `_JS_Eval_EvalJS` 使用了 `eval()`，小游戏报安全异常 | 改为 `new Function(code)()` 或专用调度器派发 |
| **音频长度安全** | `_JS_Sound_GetLength` 在未加载完时读取长度抛异常 | 增加通道与实例有效性判空保底 |
| **屏幕方向锁定** | Unity 启动可能将横屏误报为 `Portrait` | 在 `loader.js` 与适配层强制 `width = Math.max(w,h); height = Math.min(w,h)` |
| **广告 SDK 桥接** | 原海外 SDK（如 PokiSDK）挂载在全局 `window` | 注入桥接桩将 `commercialBreak` 与 `rewardedBreak` 转发至 `SDKManager` |
| **WebGL 上下文** | 原生 `webgl2` 请求在部分机型失败 | 适配层 `getContext` 增加按序降级：`webgl2` ➔ `webgl` ➔ `experimental-webgl` |
