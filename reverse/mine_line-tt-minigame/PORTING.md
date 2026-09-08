# Construct 3 转抖音小游戏移植与架构说明 (Tiny Miners / mine_line_package)

## 1. 工程概述
- **游戏原名**：Tiny Miners (小小矿工)
- **底层引擎**：Construct 3 (Web / HTML5 导出版)
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，竖屏 portrait）
- **设计分辨率**：1080 × 1920 (9:16 Portrait)
- **工程目录**：`reverse/mine_line-tt-minigame`

---

## 2. 核心架构与分包设计 (ByteDance 4MB 合规)
由于抖音开放平台有严格的**主包体积 <= 4.0 MB**硬性限制，本项目实施了规范的 3 分包拆解架构：

| 包体划分 | 包含内容 | 体积 | 状态 |
|---|---|---|---|
| **主包 (Main Package)** | `game.js`, `game.json`, `project.config.json`, `adapter/`, `scripts/`, `noise.wasm`, `poki-sdk.js` | **2.219 MB** | 严守 4.0 MB 红线（剩余配额 1.78 MB，优于 3.0 MB 推荐线） |
| **图片分包 (`images/`)** | 32 张切片图集、`embedded-assets.js`、`game.js` 入口 | 192 KB | 独立分包按需加载 |
| **音频分包 (`media/`)** | 26 个 `.webm` 音频资源与 BGM、`game.js` 入口 | 880 KB | 独立分包按需加载 |
| **数据分包 (`data/`)** | `data.json` 关卡工程核心数据、数值字典、`game.js` 入口 | 740 KB | 独立分包按需加载 |

---

## 3. 关键技术突破与双端（Krypton & Helium）适配

### 1. WebAssembly 与地下矿脉程序化生成支持
- 游戏使用了 `noise.wasm` 进行地下矿脉地形的柏林噪声生成与随机数生成。
- 在 `tt-c3-adapter.js` 中全局挂载了 `MiniResponse` 类，并针对 `WebAssembly.instantiateStreaming` 提供了安全降级到 `WebAssembly.instantiate(arrayBuffer)` 的包装层，彻底避免双端运行时因流式编译报错导致的地牢加载中断。

### 2. CommonJS UMD 模块加载修复
- 原版 `c3runtime.js` 头部引入的 `glMatrix` 库包含 UMD 检测，在小游戏 CommonJS `require()` 环境下误将矩阵方法绑定到局部 `exports` 而未暴露到 `self.glMatrix`，导致运行时抛出 `Cannot read properties of undefined (reading 'vec3')`。
- 本移植工程已在 `c3runtime.js` 头部统一将 `glMatrix` 导出同步挂载至 `self.glMatrix` 与 `globalThis.glMatrix`，保障矩阵运算管线畅通。

### 3. 海外 SDK 剥离与字节广告零代码接入
- **GameAnalytics 剥离**：移除了原 218 KB 的海外数据打点包，注入轻量打桩层，主包直接减重 218 KB。
- **Poki 变现零代码对齐**：通过重构 `poki-sdk.js`，将原本游戏内调用的 Poki 广告入口全自动无缝映射到抖音原生广告 API：
  - `rewardedBreak()` $\rightarrow$ `tt.createRewardedVideoAd()`（激励视频）
  - `commercialBreak()` $\rightarrow$ `tt.createInterstitialAd()`（插屏广告）

### 4. 竖屏锁定与屏幕尺寸自适应
- 在 `game.json` 中配置 `"deviceOrientation": "portrait"`。
- 在 `tt-c3-adapter.js` 与 `game.js` 中接入 `tt.setDeviceOrientation({ value: 'portrait' })`，并注册 `tt.onShow` 监听防止 iOS 端切后台或重启小游戏时被压扁或方向错位。

### 5. 双端核心垫片全量覆盖
- 注入了 `MiniBlob`（支持 `slice()`, `arrayBuffer()`, `text()`, `stream()`）、`MiniFile`、`MiniImageData`、`MiniEvent`、`MiniCustomEvent`、`MiniResponse`。
- 注入纯 JS 实现的 `atob` / `btoa`，防止 Android Krypton 报 `atob is not defined`。
- 注入完备的 `window.visualViewport` 事件目标，防止安卓真机扫码黑屏。

---

## 4. 导入与运行方式

1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. 点击 **导入项目**。
3. 选择项目路径：`d:\Desktop\REBench\reverse\mine_line-tt-minigame`。
4. AppID 可以填测试 AppID 或您自己的小游戏 AppID（默认为 `testAppId`）。
5. 在工具内点击“编译”即可在左侧模拟器中预览游戏，支持竖屏单手挖掘、升级与建造！
6. 点击上方“真机调试”生成二维码，使用抖音 App 扫码进行 Android / iOS 真机验证。
