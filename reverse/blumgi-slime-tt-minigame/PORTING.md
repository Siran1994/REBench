# Construct 3 转抖音小游戏移植与架构说明 (Blumgi Slime)

## 1. 工程概述
- **游戏原名**：Blumgi Slime
- **底层引擎**：Construct 3 (Cordova Web 包装版)
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，横屏 landscape）
- **设计分辨率**：1280 × 720 (16:9 Landscape)
- **工程目录**：`reverse/blumgi-slime-tt-minigame`
- **免广告试玩链接**：`Noad-freelinks/blumgi_slime`

---

## 2. 核心架构与分包设计 (ByteDance 4MB 合规)
由于抖音开放平台对主包有严格的**主包体积 <= 4.0 MB**硬性限制，本项目实施了规范的 3 分包拆解架构：

| 包体划分 | 包含内容 | 体积 | 状态 |
|---|---|---|---|
| **主包 (Main Package)** | `game.js`, `game.json`, `project.config.json`, `adapter/`, `scripts/`, `box2d.wasm.js`, `poki-sdk.js`, `embedded-wasm.js` | **3.182 MB** | 严守 4.0 MB 红线（剩余配额 0.818 MB） |
| **图片分包 (`images/`)** | 33 张图集、`embedded-assets.js`、`game.js` 入口 | 270 KB | 独立分包按需加载 |
| **音频分包 (`media/`)** | 11 个 `.webm` 音频资源与 BGM、`game.js` 入口 | 1.80 MB | 独立分包按需加载 |
| **数据分包 (`data/`)** | `data.json`（216 关卡场景与物理拓扑配置）、`game.js` 入口 | 18.59 MB | 独立分包按需加载（<= 20MB 分包上限） |

---

## 3. 关键技术突破与双端（Krypton & Helium）适配

### 1. Box2D WebAssembly 物理引擎二进制内嵌与流式编译降级
- 游戏核心物理弹射（弹跳、重力、关节、碰撞检测）依赖 `box2d.wasm`。
- 抖音开发者工具存在扩展名白名单过滤机制，无法直接打包 `.wasm` 文件。本项目使用 `embed-wasm.js` 将 `box2d.wasm` 转为 Base64 模块 `scripts/embedded-wasm.js`，启动时通过 `tt.base64ToArrayBuffer` 原生加速解码并挂载。
- 在 `tt-c3-adapter.js` 中拦截 `box2d.wasm` 网络请求，直接就地返回内嵌 ArrayBuffer；同时对 `WebAssembly.instantiateStreaming` 提供了安全降级到 `WebAssembly.instantiate(arrayBuffer)` 的兼容层。

### 2. 双端核心垫片全量覆盖
- 注入了 `MiniBlob`（完整支持 `slice()`, `arrayBuffer()`, `text()`, `stream()`）、`MiniFile`、`MiniImageData`、`MiniEvent`、`MiniCustomEvent`、`MiniResponse`。
- 注入纯 JS 实现的 `atob` / `btoa`，彻底避免 Android Krypton 报 `atob is not defined`。
- 注入完备的 `window.visualViewport` 事件目标，防止安卓真机扫码黑屏。

### 3. 横屏锁定与屏幕尺寸自适应
- 在 `game.json` 中配置 `"deviceOrientation": "landscape"`。
- 在 `tt-c3-adapter.js` 与 `game.js` 中接入 `tt.setDeviceOrientation({ value: 'landscape' })`，并注册 `tt.onShow` 监听，防止 iOS Helium 切后台或重启小游戏时被重置为竖屏。

### 4. 变现系统零代码对齐
- 原工程在网页端使用 PokiSDK，在原生端使用 Cordova AdMob 插件。
- 本移植工程注入了轻量级 `poki-sdk.js` 垫片，将原本游戏内调用的广告全自动无缝映射到抖音小游戏原生广告 API：
  - `rewardedBreak()` $\rightarrow$ `tt.createRewardedVideoAd()`（激励视频）
  - `commercialBreak()` $\rightarrow$ `tt.createInterstitialAd()`（插屏广告）
  - 默认自带开发/测试环境降级发奖防挂起保护。

### 5. 现代 JS 语法探针兼容修复
- 原版 `scripts/modernjscheck.js` 包含私有属性语法探测（`#p`），在部分转译环境会报语法异常。已做无损平替并显式标记 `C3_ModernJSSupport_OK = true`。

---

## 4. 导入与运行方式

1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. 点击 **导入项目**。
3. 选择项目路径：`d:\Desktop\REBench\reverse\blumgi-slime-tt-minigame`。
4. AppID 可以填测试 AppID 或您自己的小游戏 AppID（默认为 `testAppId`）。
5. 在工具内点击“编译”即可在左侧模拟器中预览游戏（横屏 16:9 物理弹球）。
6. 点击上方“真机调试”生成二维码，使用抖音 App 扫码进行 Android / iOS 真机体验。
