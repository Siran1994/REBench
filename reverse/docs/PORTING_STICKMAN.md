# Construct 3 转抖音小游戏移植说明 (Stickman Maze Run)

## 1. 工程概述
- **原游戏名称**：StickmanMazeRun
- **底层引擎**：Construct 3（Web/HTML5 封装，Poki SDK 出口）
- **交付包**：`stickman_maze_run_package.rar`（一次 Construct 3 Web 导出，含 `index.html`、`scripts/`、`data.json`、`images/`、`media/`、`fonts/`）
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，横屏 landscape）

## 2. 引擎识别结论（门禁判定）
通过 `inspect_apk.py` 扫描确认：
- **引擎**：Construct 3（`scripts/c3runtime.js` + `data.json` + `images/*-sheet*.webp`）
- **复杂度**：274 个对象类型、9 个家族、**138 个场景**（含 80 个单人关 1p_*、20 个双人关 2p_*，以及 2pctag / 2pcrace / 1pcd / 1pcw 等挑战关与 UI 场景）、9 个事件表（共 139 个逻辑节点）、2 个 Tilemap、43 个音频、1 个字体（Jersey25-Regular）
- **检测到的插件**：Audio、Avix_PokiSDK_ForC3、Browser、Camera3D、Dictionary、Keyboard、LocalStorage、Mouse、NinePatch、PlatformInfo、Shape3D、TextBox、Tilemap、Touch、gamepad
- **门禁**：✅ PROCEED（非 Unity、非 Haxe/Cocos/Godot）

## 3. 核心架构与适配层
- **适配器**：`adapter/tt-c3-adapter.js`（由技能模板生成，`__diggerEmbeddedImages` 全局名统一改写为 `__stickmanEmbeddedImages`）
  - 提供 `window`/`document`/`navigator`/`screen` 垫片，`visualViewport`（修复 Krypton 扫码黑屏）
  - `tt.createCanvas()` 主画面渲染与全屏尺寸同步（`tt.getSystemInfoSync`）
  - 触摸/鼠标事件映射、`AudioContext`/`Audio`/`FontFace`、`localStorage → tt.*Storage*`、`fetch/XHR` 本地文件读取垫片
  - 拦截 `document.head.appendChild(script)` 并将脚本路由到 `globalThis.__loadScript`
- **启动入口**：`game.js`
  - `MiniBlob`/`MiniFile`/`MiniImageData`/`MiniEvent`/`MiniCustomEvent` 全局垫片
  - `atob`/`btoa` 纯 JS Base64 实现（防 Krypton `atob is not defined`）
  - `window.C3_ModernJSSupport_OK`/`C3_IsSupported` 直接置位，绕过 `modernjscheck.js` 的 `#` 私有字段探测
  - Poki SDK 空实现垫片（`PokiSDK` 全局，防 `Avix_PokiSDK_ForC3` 插件崩溃）
  - iOS 重新进入小游戏时 `tt.setDeviceOrientation({value:'landscape'})` 强制横屏
  - `tt.loadSubpackage` 异步预加载 images/media/data，之后触发 `deviceready`
- **运行时入口**：`scripts/c3main.minigame.js`
  - `require("./c3runtime.js")` + `require("./objRefTable.js")`
  - 覆写 `C3.BlobToImage`，将图片 ArrayBuffer 转 Data-URI 直接喂给 `C3.FetchImage`（避免 `URL.createObjectURL` 依赖）
- **scripts/main.js 关键改造**：
  - 顶部注入 `location` 垫片（`https://minigame.local`）
  - 末尾 `start-export`：`useWorker:false`、`runtimeScriptList:["scripts/c3main.minigame.js"]`、`exportType:"cordova"`、`runtimeBaseUrl:"https://minigame.local/"`

## 4. 分包架构（主包 3.745MB，满足 4MB 红线）
| 分包 | 根目录 | 内容 | 状态 |
|---|---|---|---|
| 主包 | `/` | `game.js`、`adapter/`、`scripts/`、`fonts/font.ttf`、`icons/`、`poki-sdk.js` | 3.745 MB ✅ |
| images | `images/` | 73 张 webp 图集、`embedded-assets.js`（Base64 映射）、`game.js` | ✅ |
| media | `media/` | 43 个 webm、`game.js` | ✅ |
| data | `data/` | `data.json`（8.9MB）、`game.js` | ✅ |

- `game.json` 以 **`subPackages`**（大写 P）声明三个分包，横屏 `deviceOrientation:"landscape"`。
- 各分包根目录均含 `game.js` 入口（抖音编译铁律）。

## 5. 已应用的兼容性修复与本地化
1. **`modernjscheck.js`**：将带 `#` 私有字段探测的原始实现替换为直接写 `window["C3_ModernJSSupport_OK"]=true`。
2. **`objRefTable.js`**：扫描未见 `switch:`/`class switch` 保留字冲突，无需改写。
3. **`main.js`**：`location` 垫片 + `useWorker:false` + `exportType:"cordova"`，使 C3 DOM 运行时在抖音宿主主线程运行。
4. **图片加载**：`embedded-assets.js` 以 `images/<file>.webp` 为键，与 `data.json` 的 1493 处 `images/` 引用一一对应（73/73 全命中，0 缺失）。
5. **字体替换与适配**：剔除原 `Jersey25-Regular.ttf`，替换为通用中文字体 `fonts/font.ttf`（1.83MB），并在 `tt-c3-adapter.js` 与 `game.js` 中接入 `tt.loadFontFace` 动态注册与预加载。
6. **全量汉化**：将游戏主标题（火柴人迷宫跑酷）、所有玩法模式（1P 剧情模式、2P 双人合作、2P 双人对决、在线速通、抓人模式、竞速模式等）、关卡世界、结算页面、商城装扮及通关赞美词全量本地化为简体中文。

## 6. 导入与运行方式
1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. **导入项目**，目录选择：`D:\Desktop\REBench\reverse\stickman-tt-minigame`。
3. AppID 可填测试 AppID（默认 `testAppId`）或自有小游戏 AppID。
4. 编译运行，模拟器查看启动画面后真机扫码验证横屏与音效。

## 7. 说明与已知边界
- 源包为 **Poki Web 出口**，非 Cordova/Google Play 打包；因此本项目未包含 digger 版中的 `cordova.js`、`plugins/`、`google-services.json` 等原生封装，运行时以 `exportType:"cordova"` 模拟 deviceready 生命周期以复用 C3 内置的 cordova 分支。
- `Avix_PokiSDK_ForC3` 插件已随 `c3runtime.js` 打包，Poki 能力以空实现垫片替代（`rewardedBreak` 恒返回 `true`），不影响玩法。
- 真机 Android（Krypton）/ iOS（Helium）最终表现需以真机扫码为准。
