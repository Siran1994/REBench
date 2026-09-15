# Construct 3 转抖音小游戏移植说明 (Stickman Bike)

## 1. 工程概述
- **原游戏名称**：Stickman Bike (火柴人山地车 / Bike)
- **底层引擎**：Construct 3（Web/HTML5 单线程 DOM 模式，Poki SDK 出口）
- **交付源包**：`apk/stickman_bike_package.rar`
- **移植产物路径**：`d:\Desktop\REBench\reverse\stickman-bike-tt-minigame`
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，横屏 landscape）

## 2. 引擎识别结论（门禁判定）
通过 `inspect_apk.py` 扫描确认：
- **引擎**：Construct 3（`scripts/c3runtime.js` + `data.json` + `images/*-sheet*.webp`）
- **物理系统**：Box2D 物理引擎 (WebAssembly)，包含 `box2d.wasm` 与 `box2d.wasm.js`。
- **复杂度**：106 个对象类型、**27 个场景 (Layout)**（包含 20 个正式越野山地车物理关卡 `lvl1`～`lvl20`，以及 loader / MENU / lvls / settings / GAME / PIECES / TESTS）、4 个事件表（共 85 个顶层逻辑节点）、9 个音频。
- **检测到的关键插件**：Audio、Keyboard、Touch、PlatformInfo、LocalStorage、Browser、Dictionary、Timeline、TiledBackground、SpriteFont、Text、Array、PokiSDK。
- **门禁状态**：✅ **PROCEED（门禁通过）**，未检出任何 Unity、Cocos、Haxe 或 Unreal 原生二进制。

## 3. 核心架构与适配层
- **适配器**：`adapter/tt-c3-adapter.js`
  - 提供 `window`/`document`/`navigator`/`screen`/`history` 垫片，`visualViewport`（修复 Android Krypton 扫码黑屏）。
  - `tt.createCanvas()` 主画面渲染与全屏尺寸同步（`tt.getSystemInfoSync`）。
  - 触摸/鼠标事件映射、`AudioContext`/`ensureAudioParam`（`cancelScheduledValues` 等方法防闪退）。
  - `localStorage → tt.*Storage*`。
  - `fetch/XHR` 本地拦截：
    - `data.json`：直读 `globalThis.__c3DataJson`，零 IO 快速加载。
    - `box2d.wasm`：就地拦截并返回 Base64 还原后的 `ArrayBuffer`。
    - `opus.wasm.wasm`：拦截并返回解码 ArrayBuffer。
  - 拦截 `document.head.appendChild(script)` 并将脚本路由到 `globalThis.__loadScript`。
- **启动入口**：`game.js`
  - `MiniBlob`/`MiniFile`/`MiniImageData`/`MiniEvent`/`MiniCustomEvent`/`MiniResponse` 全局垫片。
  - `atob`/`btoa` 纯 JS Base64 实现（防 Krypton `atob is not defined`）。
  - `window.C3_ModernJSSupport_OK`/`C3_IsSupported` 直接置位。
  - **PokiSDK Bridge**：无缝桥接至 `SDKManager`（`commercialBreak` 调度插屏广告、`rewardedBreak` 调度激励视频发奖）。
  - **防死循环横屏锁定机制**：互斥锁 `_isSettingOrientation` + `windowWidth > windowHeight` 判断，彻底杜绝 iOS/Android 热重启自激死循环。
  - `tt.loadSubpackage` 异步预加载 images/media/data，之后触发 `deviceready`。
  - **Box2D WASM 模块钩子**：预先解压并在 `self.Box2DWasmModule` 中自动注入 `wasmBinary`，彻底解决抖音小游戏白名单过滤 `.wasm` 问题。
- **商业化管理器**：`SDKManager.js`
  - 统一调度激励视频 (`showRewarded`) 与插屏 (`showInterstitial`)，内置 15s 熔断与开发降级。
  - 支持短震动、添加桌面、侧边栏及存档控制（Key: `mountain_bike_stelennnn_2020_8_1`）。

## 4. 关键踩坑与运行时兼容修复记录 (Pitfall Fixes)
1. **`location` 与 `QueryParser` 空安全**：
   - 修复 C3 `QueryParser` 无法读取 `location.search` 与 `location.hash` 导致 `startsWith` 抛错的问题，并在头部注入全功能虚拟 `location` 对象。
2. **`glMatrix` UMD 模块挂载绑定**：
   - CommonJS 环境下 `glMatrix` 默认导向 `exports`，导致后续渲染层从 `self.glMatrix` 读取 `vec3` 时报 `undefined`。已将 UMD 包装器改造为强制挂载至 `self.glMatrix` 和 `globalThis.glMatrix`。
3. **`box2d.wasm.js` 原生 `eval` 剔除**：
   - 移除 Emscripten 模板遗留的 `eval` 全局探测代码，替换为直接对象赋值，规避端内沙箱禁用 `eval` 的限制。
4. **首帧切场景 `_DoChangeLayout` 空指针保护**：
   - 针对初次进入首个场景时 `layoutManager.GetMainRunningLayout()` 返回 `null` 的情况增加空判断，防止调用 `prevLayout._StopRunning()` 触发 `null._StopRunning` 异常。

## 5. 分包架构（主包 3.20 MB，严格符合 4.0 MB 红线）
| 分包 | 根目录 | 内容 | 大小 | 状态 |
|---|---|---|---|---|
| **主包** | `/` | `game.js`、`adapter/`、`scripts/`（含 embedded-wasm.js）、`SDKManager.js`、`icons/`、`style.css` | **3.203 MB** | ✅ 达标（余量 0.797 MB） |
| **images** | `images/` | 22 张 webp 图集、`embedded-assets.js`、`game.js` | 0.435 MB | ✅ 独立分包 |
| **media** | `media/` | 9 个 webm 音频、`game.js` | 0.298 MB | ✅ 独立分包 |
| **data** | `data/` | `data.json`、`game.js` | 0.460 MB | ✅ 独立分包 |

- `game.json` 以 **`subPackages`** 声明 `images`、`media`、`data` 三大分包，横屏 `deviceOrientation: "landscape"`。
- 每个分包根目录下均补全必需的 `game.js` 编译入口。

## 6. 导入与运行方式
1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. **导入项目**，目录选择：`d:\Desktop\REBench\reverse\stickman-bike-tt-minigame`。
3. AppID 填写测试 AppID（如 `tt130065bd8d63616c02` 或自有小游戏 AppID）。
4. 编译预览，在模拟器查看启动画面后真机扫码验证横屏、山地车物理驱动、关卡跳跃、音效与广告激励发奖。
