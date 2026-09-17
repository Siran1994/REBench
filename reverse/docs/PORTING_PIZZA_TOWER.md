# Construct 2 转抖音小游戏与免广告试玩移植复盘 (Pizza Tower)

## 1. 工程概述
- **游戏名称**：Pizza Tower (披萨塔大亨 / 披萨餐厅模拟放置)
- **底层引擎**：**Scirra Construct 2 (C2)** + **Spine WebGL** 骨骼动画
- **原始交付包**：`apk/pizza_tower_package.rar`（真实包体为 Poki Web 导出的 HTML5 工程，非 Android APK）
- **适配目标**：
  1. **抖音小游戏（ByteDance MiniGame）**：Native 模式，横屏 landscape，完整分包架构，接入 `SDKManager`。
  2. **CDN 免广告网页版试玩（No-Ad Free-Link）**：全功能免外网脱机运行，内置一键启动服务与发奖垫片。

---

## 2. 引擎识别与审计结论

通过技术审计确认：
- **引擎特征**：`c2runtime.js` + `data.js` + `jquery-2.1.1.min.js` + `spine_webgl.js`。
- **复杂度**：167 个对象类型、14 个家族（Families）、3 个场景（`loaderlayout`、`gamelayout`、`template`）、9 个核心事件表（`GameManager`、`IdleManager`、`UIManager`、`UnitsManager`、`SpineData`、`DiceGame`、`PlatformManager`、`Loader`、`Template`）。
- **插件集合**：17 个 C2 原生插件 + 2 个扩展插件（`SpinePlugin`、`SpineWebGL`）。
- **行为扩展**：`LiteTween`、`Pin`、`Sine`、`Fade`、`Rotate`、`CustomMovement`、`TextProperties`。
- **多语言**：`localisation.json` 原生内置 10 国语言（含简体中文 `zh`）。

---

## 3. 核心架构与适配层攻坚

### 3.1 Construct 2 专属适配器 (`adapter/tt-c2-adapter.js`)
与 Construct 3 的模块化设计不同，Construct 2 与 DOM 和 `jQuery 2.1.1` 深度绑定。我们在适配层中攻克了以下关键断点：
1. **DOM 文档与元素节点规范化**：
   - 为 `MiniDocument` 赋予 `nodeType = 9` 与 `defaultView = window`，并实现 `createComment` 与 `createDocumentFragment`。
   - 为 `MiniElement` 赋予 `nodeType = 1`，并补齐 Sizzle 依赖的 `cloneNode(deep)`、`contains(node)`、`compareDocumentPosition` 与 `getElementsByTagName`，使 `jQuery 2.1.1` 零报错无缝初始化。
2. **画布与容器结构**：
   - 将主画布 ID 设为 `c2canvas`，并在适配器初始化阶段自动生成 `#c2canvasdiv` 容器包裹 `c2canvas` 并挂载至 `document.body`，满足 C2 运行时的 DOM 挂载树依赖。
3. **数据预加载与 XHR 零延迟拦截**：
   - C2 原生通过 `new XMLHttpRequest()` 异步拉取 `data.js`。适配器拦截 `data.js` 与 `localisation.json` 的请求，直接从内存变量（`globalThis.__c2DataJs` / `globalThis.__c2LocalisationJson`）即时返回，避免异步 IO 卡顿。
4. **Spine WebGL 骨骼动画引擎绑定**：
   - 为 `scripts/spine_webgl.js` 注入 CommonJS 与全局环境导出（`window.spine = spine; globalThis.spine = spine;`），确保角色骨骼动画在 WebGL 上下文中流畅运转。

### 3.2 商业化与平台调度 (`SDKManager.js`)
- 将原本的 PokiSDK 广告请求无缝路由至小游戏 `SDKManager`：
  - `PokiSDK.commercialBreak()` ➔ `SDKManager.showInterstitial()`（插屏广告）
  - `PokiSDK.rewardedBreak()` ➔ `SDKManager.showRewarded()`（激励视频广告）
- 自带 15 秒超时熔断保护与开发环境调试兜底自动发奖，彻底杜绝悬挂死锁。

---

## 4. 分包体积与规范核验

严格遵守抖音开放平台 **4.0 MB 主包体积红线**：
- 剔除冗余的 24 首 `.ogg` 音频（瘦身 2.15 MB），全面使用小游戏原生支持极佳的 `.m4a`（2.47 MB）。
- 拆分 3 个标准分包：

| 分包 | 根目录 | 内容 | 状态 |
|---|---|---|---|
| **主包** | `/` | `game.js`、`SDKManager.js`、`adapter/`、`scripts/`、`fonts/`、`project.config.json` | **1.843 MB** ✅（低于 4.0 MB，富余 2.157 MB） |
| **images** | `images/` | 102 张 PNG 纹理与精灵切片 + `images/game.js` | 1.90 MB ✅ |
| **media** | `media/` | 24 首 `.m4a` 音频 + `media/game.js` | 2.47 MB ✅ |
| **data** | `data/` | `data.js` + `localisation.json` + `data/game.js` | 1.24 MB ✅ |

自动化校验工具执行结果：
```text
[validate-package] Validating ByteDance MiniGame project: reverse/pizza-tower-tt-minigame
[validate-package] Subpackages configured in game.json: 3
  ✓ Subpackage 'images/' entry verified: game.js
  ✓ Subpackage 'media/' entry verified: game.js
  ✓ Subpackage 'data/' entry verified: game.js
[validate-package] Main Package Size: 1.843 MB (1932861 bytes)
  ✓ Main package is within 4.0 MB limit (Remaining allowance: 2.157 MB)
[validate-package] SUCCESS: MiniGame package complies with ByteDance standards!
```

---

## 5. 免广告 Web 试玩版交付 (`Noad-freelinks/pizza_tower`)

- 交付路径：[`Noad-freelinks/pizza_tower/`](file:///d:/Desktop/REBench/Noad-freelinks/pizza_tower)
- **核心能力**：
  1. 注入 `noad-bridge.js`，拦截所有广告请求并弹出毛玻璃反馈：`✨ [免看广告] 奖励已直接发放！`。
  2. 提供针对 Windows 环境纠正 MIME 类型的 `serve.py` 与双击即启的 `启动网页试玩.bat`。
  3. 已同步汇入大厅导航门户 [`Noad-freelinks/index.html`](file:///d:/Desktop/REBench/Noad-freelinks/index.html)。

---

## 6. 全量中文本地化精细重校与纠正

原包内置的 `localisation.json` 中包含 116 条中文词条，但存在大量脱离游戏语境的低级机翻。本次移植对全部 116 条词条进行了深度重校并全量同步：
1. **彻底修复核心误翻**：
   - 棋盘小游戏 `Pawns Left`：由“兵左”纠正为“**剩余棋子**”。
   - 零售外送部成就 `Upgrade Outlet`：由“将插座升级”纠正为“**外送前台升至等级**”。
   - 经理加速状态 `Boost Available In`：由“升压适用于”纠正为“**加速冷却时间：**”。
   - 骑手加速技能 `Boost Transporter`：由“增强你的运输机”纠正为“**骑手狂飙配送**”。
   - 看广告恢复生命 `Refill Lives`：由“看广告让生活充实起来”纠正为“**看视频立即补满体力**”。
   - 认输比赛 `Concede Match`：由“失球比赛”纠正为“**放弃比赛**”。
   - 挂机收益 `Offline Earnings`：由“线下收益”纠正为“**挂机离线收益**”。
2. **多端同步生效**：
   - 小游戏分包工程：`reverse/pizza-tower-tt-minigame/data/localisation.json`
   - CDN 试玩工程：`Noad-freelinks/pizza_tower/localisation.json`
   - 原始解压工程：`reverse/pizza_tower_package/localisation.json`

---

## 7. 开发者工具导入与运行指南

1. 启动**抖音开发者工具**（ByteDance DevTools）。
2. 点击**导入项目**，项目目录选择：`D:\Desktop\REBench\reverse\pizza-tower-tt-minigame`。
3. AppID 输入测试 AppID（`testAppId`）或您的小游戏 AppID。
4. 编译后即可在模拟器中预览披萨塔建造、员工招募、电梯转运及骰子棋盘副玩法，并可通过右上角真机预览扫码验证。

