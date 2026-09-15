# Construct 3 转抖音小游戏移植说明 (Stickman Parkour Skyland)

## 1. 工程概述
- **原游戏名称**：Stickman Parkour Skyland (火柴人空岛跑酷)
- **底层引擎**：Construct 3（Web/HTML5 单线程 DOM 模式，Poki SDK 出口）
- **交付源包**：`apk/stickman_parkour_skyland_package.rar`
- **移植产物路径**：`d:\Desktop\REBench\reverse\stickman-parkour-tt-minigame`
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，横屏 landscape）

## 2. 引擎识别结论（门禁判定）
通过 `inspect_apk.py` 扫描确认：
- **引擎**：Construct 3（`scripts/c3runtime.js` + `data.json` + `images/*-sheet*.webp`）
- **复杂度**：49 个对象类型、**65 个场景 (Layout)**（包含 60 个正式大卷轴跑酷关卡 `LVL1`～`LVL60`，以及 Loading / Start / Menu / END / List）、8 个事件表（共 59 个顶层逻辑节点）、2 个 Tilemap、24 个音频、2 个英文字体（rubikmonoone-regular, comictalecopy）
- **检测到的关键插件**：Audio、Keyboard、Touch、ValerypopoffTouchPlus、PlatformInfo、Text、AJAX、Lang、Browser、LocalStorage、SF、Tilemap、TiledBackground、Particles、PokiSDK
- **门禁状态**：✅ **PROCEED（门禁通过）**，未检出任何 Unity、Cocos、Haxe 或 Unreal 原生二进制。

## 3. 核心架构与适配层
- **适配器**：`adapter/tt-c3-adapter.js`
  - 提供 `window`/`document`/`navigator`/`screen` 垫片，`visualViewport`（修复 Android Krypton 扫码黑屏）
  - `tt.createCanvas()` 主画面渲染与全屏尺寸同步（`tt.getSystemInfoSync`）
  - 触摸/鼠标事件映射、`AudioContext`/`ensureAudioParam`（`cancelScheduledValues` 等方法防闪退）
  - `localStorage → tt.*Storage*`、`fetch/XHR` 本地文件读取垫片（包含 `data.json` 与 `Lang.json` 零 IO 快速内存旁路）
  - 拦截 `document.head.appendChild(script)` 并将脚本路由到 `globalThis.__loadScript`
- **启动入口**：`game.js`
  - `MiniBlob`/`MiniFile`/`MiniImageData`/`MiniEvent`/`MiniCustomEvent`/`MiniResponse` 全局垫片
  - `atob`/`btoa` 纯 JS Base64 实现（防 Krypton `atob is not defined`）
  - `window.C3_ModernJSSupport_OK`/`C3_IsSupported` 直接置位
  - **PokiSDK Bridge**：无缝桥接至 `SDKManager`（`commercialBreak` 调度插屏广告、`rewardedBreak` 调度激励视频发奖）
  - **防死循环横屏锁定机制**：互斥锁 `_isSettingOrientation` + `windowWidth > windowHeight` 判断，彻底杜绝 iOS/Android 热重启自激死循环
  - `tt.loadSubpackage` 异步预加载 images/media/data，之后触发 `deviceready`
  - `tt.loadFontFace` 动态加载裁剪后的通用中文字体 `fonts/font.ttf`，并将原英文字体名（`rubikmonoone-regular`、`comictalecopy`）注册为别名，全局零成本无缝渲染中文字体
- **商业化管理器**：`SDKManager.js`
  - 统一调度激励视频 (`showRewarded`) 与插屏 (`showInterstitial`)，内置 15s 熔断与开发降级
  - 支持短震动、添加桌面、侧边栏及存档控制

## 4. 分包架构（主包 2.651 MB，严格符合 4.0 MB 红线）
| 分包 | 根目录 | 内容 | 大小 | 状态 |
|---|---|---|---|---|
| **主包** | `/` | `game.js`、`adapter/`、`scripts/`、`SDKManager.js`、`fonts/font.ttf` (33KB)、`icons/`、`Lang.json` | **2.651 MB** | ✅ 达标（余量 1.349 MB） |
| **images** | `images/` | 35 张 webp 图集、`embedded-assets.js`、`game.js` | 3.604 MB | ✅ 独立分包 |
| **media** | `media/` | 24 个 webm 音频、`game.js` | 2.359 MB | ✅ 独立分包 |
| **data** | `data/` | `data.json`、`game.js` | 0.930 MB | ✅ 独立分包 |

- `game.json` 以 **`subPackages`** 声明 `images`、`media`、`data` 三大分包，横屏 `deviceOrientation: "landscape"`。
- 每个分包根目录下均补全必需的 `game.js` 编译入口。

## 5. 本地化与中文字体
1. **`Lang.json` 全量汉化**：将游戏内 26 组全量核心引导提示与系统界面文本（包括移动教程、跳跃提示、攀爬教程、流沙、冰面、岩浆警告、过关表彰及关卡列表等）全部本地化为地道简体中文。
2. **中文字体微型裁剪**：提取全量字表，使用 `pyftsubset` 将 `font/font.ttf`（原 1.92 MB）裁剪为仅 **33.8 KB** 的精简中文字体库，置入 `fonts/font.ttf`，极大节省主包空间并实现秒开。
3. **字体别名映射**：通过 `tt.loadFontFace` 将原字体名 `rubikmonoone-regular` 与 `comictalecopy` 直接映射至 `fonts/font.ttf`，无需修改 `data.json` 即可直接渲染中文字体。

## 6. 导入与运行方式
1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. **导入项目**，目录选择：`D:\Desktop\REBench\reverse\stickman-parkour-tt-minigame`。
3. AppID 填写测试 AppID（如 `testAppId`）或自有小游戏 AppID。
4. 编译预览，在模拟器查看启动画面后真机扫码验证横屏、关卡跑酷操作、音效与广告激励发奖。
