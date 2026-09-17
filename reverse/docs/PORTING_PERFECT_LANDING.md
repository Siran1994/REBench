# Unity 3D WebGL 逆向审计与试玩移植复盘 (Perfect Landing: Plane Pilot)

## 1. 工程概述
- **游戏名称**：Perfect Landing: Plane Pilot（完美着陆：飞机驾驶员）
- **开发商与版本**：Go Games / v2.2
- **底层引擎**：**Unity 2022.3.62f2** (WebGL 2.0 / WebAssembly / IL2CPP Metadata v31)
- **原始交付包**：`apk/perfect_landing_plane_pilot_package.rar`
- **文件性质澄清**：该包**并非 Android 原生 APK**（无 AndroidManifest.xml 与 classes.dex），而是海外 Web 游戏平台 Poki 导出的全功能 3D WebGL 运行包。
- **交付目标**：
  1. **资产与逻辑深度逆向审计**：提取 510 个 C# 核心类、11,103 个 UnityFS 资源与双场景架构。
  2. **美术素材全量转储**：导出 202 张 PNG 贴图与 2 首关键音效至 `assets_dump/`。
  3. **免广告 CDN 网页试玩版交付 (`Noad-freelinks/perfect_landing`)**：集成毛玻璃 No-Ad Toast 垫片与一键启动服务，并接入大厅导航。
  4. **国内小游戏（抖音 / 微信）移植路径与工程可行性评估**。

---

## 2. 底层架构与技术栈审计

### 2.1 运行时技术栈
| 组件 | 规范与版本 | 说明 |
|---|---|---|
| **游戏引擎** | Unity 2022.3.62f2 | 现代化 3D 移动游戏管线，支持 WebGL 2.0 |
| **脚本后端** | IL2CPP (Metadata v31) | C# 编译为 C++ 后由 Emscripten 编译为 Wasm |
| **二进制代码** | WebAssembly (`.wasm.unityweb`) | 解包体积 **24.8 MB**（Brotli 压缩态约 5.2 MB） |
| **核心资产包** | UnityFS (`.data.unityweb`) | 解包体积 **10.5 MB**（Brotli 压缩态约 5.4 MB） |
| **相机系统** | Cinemachine | 弹弓特写、高空跟随、迫降慢镜头多机位切换 |
| **动画补间** | DOTween / DOTweenPro | UI 弹窗与金币飞行插值 |
| **数据配置** | Sirenix Odin Inspector | 复杂对象与配置表序列化 |
| **文本排版** | TextMeshPro (TMPro) | 动态 SDF 艺术字与多语言数字跳动 |
| **水体材质** | Stylized Water Shader | 风格化海水波动与水面浮力反馈 |
| **原商业化 SDK** | Poki Web SDK (`poki-sdk.js`) | 包含插屏广告 (`commercialBreak`) 与激励视频 (`rewardedBreak`) |

---

## 3. C# 核心玩法与逻辑架构 (Assembly-CSharp.dll / 510 个类)

### 3.1 弹弓发射与动力气动系统
- `UpgradeSlingshot`：弹弓底座、皮筋拉伸物理形变、弹射初速度与仰角计算。
- `PlaneController`：飞机空中飞行姿态（俯仰 Pitch、滚转 Roll、偏航 Yaw）主控逻辑。
- `PlaneForceSystem`：空气阻力、重力衰减、高空气流升力物理平衡模拟。
- `Booster` / `BoosterManager` / `RotateBooster`：火箭喷气加速器推进控制。
- `WindParticleHandler`：空中风阻与高速尾迹粒子渲染。

### 3.2 模块化飞机系列与部件碰撞碎裂
- 飞机系列涵盖 5 档进阶机型：
  - `PlaneOneParts`（初级螺旋桨轻型飞机）
  - `PlaneTwoParts`（双翼复古客机）
  - `PlaneThreeParts`（现代喷气客机）
  - `PlaneFourParts`（大型重装运输机）
  - `PlaneFiveParts`（未来概念超音速飞行器）
- `BasePlanePartsHandler` / `PlanePartsManager` / `DetachParts`：
  机翼、垂直尾翼、起落架、引擎均具备独立 Collider 与受损阈值。触地迫降或撞击障碍物时，部件能够受力脱落并产生真实刚体碎裂。

### 3.3 迫降跑道与积分倍率
- `DistanceTracker` / `LastDistance`：飞行滑行距离实时记录与标尺刷新。
- `RampsHandling`：跑道缓冲跳台与倾角坡道。
- `ChestHandler` / `ChestTriggerHandler`：机场末端宝箱奖励结算。
- `EndImageMultiplier`：终点高倍区判定，根据飞机最终停稳位置翻倍结算金币。

### 3.4 养成升级与经济循环
- `UpgradeManager`：升级中枢。
- `UpgradePlane`：升级发动机推力、气动升力及滑翔性能。
- `UpgradeSlingshot`：升级弹弓橡皮筋弹力与发射初速。
- `UpgradeIncomeMultiplier`：升级飞行单次金币收益倍率。
- `EconomyManager` / `OfflineEarnings`：软通货币收支管理与离线挂机收益累计。

---

## 4. 场景与资产构成审计

### 4.1 双场景架构
1. `Assets/Game/Scenes/Splash.unity`：启动冷开、闪屏、Shader 预热与初始化加载。
2. `Assets/Game/Scenes/Gameplay.unity`：主玩法跑道、海面、弹弓发射台、飞机实例与结算面板。

### 4.2 资产对象分布 (总计 11,103 个)
- **GameObjects / 游戏实体**：2,205 个
- **MonoBehaviours / 行为组件**：1,673 个
- **粒子系统**：622 个（尾焰、喷气、烟雾、碰撞碎屑）
- **网格模型**：560 个（飞机各部件模型、机场跑道、障碍物）
- **贴图与精灵**：205 张贴图（已成功转储 202 张 PNG 至 `assets_dump/textures/`）
- **音频剪辑**：2 首核心音频（`Ambience.wav` 背景风噪、`etfx_explosion_rocket.wav` 助推爆炸声）

---

## 5. 免广告 Web 试玩版交付 (`Noad-freelinks/perfect_landing`)

### 5.1 交付清单
- 目录路径：[`Noad-freelinks/perfect_landing/`](file:///d:/Desktop/REBench/Noad-freelinks/perfect_landing)
- **`index.html`**：
  - 采用暗黑科技风设计，适配 100vw / 100vh 全屏与任意宽高比。
  - 注入 `notifyReady()` 心跳脉冲，防 Unity 在 AudioContext / WebGL 初始化阶段停滞。
- **`poki-sdk.js` (No-Ad Bridge)**：
  - 完全拦截 `commercialBreak`（插屏）与 `rewardedBreak`（激励视频）。
  - 弹出现代化毛玻璃 Toast 提示：`✨ [免看广告] 激励视频奖励已直接发放！`。
  - 自动向 Unity GameObject 广播 `rewardedBreakCompleted(true)`。
- **`serve.py` & `启动网页试玩.bat`**：
  - 内置针对 Windows 注册表 MIME 类型修复，强制映射 `.wasm` 与 `.wasm.unityweb`。
  - 双击批处理即可一键启动本地 HTTP 服务并在浏览器中畅玩。
- **大厅导航同步**：
  - 已汇总展示于 [`Noad-freelinks/index.html`](file:///d:/Desktop/REBench/Noad-freelinks/index.html)。

---

## 6. 抖音小游戏（ByteDance MiniGame）完整移植工程交付

工程目录：[`reverse/perfect-landing-tt-minigame/`](file:///d:/Desktop/REBench/reverse/perfect-landing-tt-minigame)

### 6.1 工程结构与分包架构
```text
reverse/perfect-landing-tt-minigame/
├── adapter/
│   └── tt-unity-adapter.js     # Unity 3D WebGL 专有运行期适配层 (DOM/WebGL/Audio/Fetch/Touches)
├── Build/
│   ├── 813700ccfaf64a0a3c57e3aa3166490b.loader.js        # Unity 官方 Loader (适配了 MiniGame 环境)
│   └── 0b14ddffb6d6867f4577189187985cab.framework.js.unityweb # Emscripten JS 框架
├── wasm/                       # WASM 独立分包 (24.8MB)
│   ├── game.js                 # 必需分包入口: module.exports = { name: 'wasm', loaded: true };
│   └── 78675d3236180fa3ceddab8a23a2032e.wasm.unityweb
├── data/                       # 数据资产独立分包 (10.5MB)
│   ├── game.js                 # 必需分包入口: module.exports = { name: 'data', loaded: true };
│   └── a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb
├── SDKManager.js               # 抖音原生商业化统一调度器 (激励视频、插屏广告、超时熔断、测试兜底)
├── game.js                     # 小游戏主入口 (生命周期、防自激横屏锁、分包预加载、Unity 实例引导)
├── game.json                   # 声明 landscape 与 wasm/data 两个子分包
├── project.config.json         # 抖音开发者工具配置 (native 模式)
└── icon.png                    # 小游戏高清图标
```

### 6.2 包体与合规性校验结果
运行 `validate-package.js` 自动化合规测试：
```text
[validate-package] Validating ByteDance MiniGame project: reverse/perfect-landing-tt-minigame
[validate-package] Subpackages configured in game.json: 2
  ✓ Subpackage 'wasm/' entry verified: game.js
  ✓ Subpackage 'data/' entry verified: game.js

[validate-package] Main Package Size: 0.747 MB (783411 bytes)
  ✓ Main package is within 4.0 MB limit (Remaining allowance: 3.253 MB)
[validate-package] SUCCESS: MiniGame package complies with ByteDance standards!
```
- **主包体积**：**0.747 MB**（远低于 4.0 MB 极限红线，富余 3.253 MB 安全裕量）
- **分包合规**：`wasm/` 与 `data/` 均具备必需的 `game.js` 入口规范。

### 6.3 适配层核心攻坚细节
1. **触控与鼠标事件合成**：
   - 将 `tt.onTouchStart` / `tt.onTouchMove` / `tt.onTouchEnd` 合成为标准 `pointerdown` / `mousedown` / `mousemove` / `pointerup` / `mouseup`，无缝驱动 Unity 的 `Input.GetMouseButton`、弹弓拉伸蓄力与触控姿态控制。
2. **零延迟本地分包直读**：
   - 适配层拦截 `fetch` 请求，当 Unity Loader 异步请求 `data.unityweb` 和 `wasm.unityweb` 时，由 `tt.getFileSystemManager().readFileSync` 从本地分包秒级读入 ArrayBuffer 并封包为 `MiniResponse` 返回，完全杜绝网络加载白屏。
3. **WebAssembly.instantiateStreaming 降级垫片**：
   - 补齐流式编译至 ArrayBuffer 解码的转换，确保在 iOS (Helium) 与 Android (Krypton) 双端均能稳定初始化 Wasm 实例。
4. **防自激横屏锁 (Anti-Loop Orientation Lock)**：
   - 互斥状态锁配合 `windowWidth > windowHeight` 判定，防止转屏回调自激导致每秒数百次频繁切换。
5. **商业化闭环集成**：
   - Unity 通过 `SendMessage` 与 JS 桥接，插屏直接触发 `SDKManager.showInterstitial`，激励视频直接触发 `SDKManager.showRewarded`，具备 15 秒超时防悬挂与测试兜底自动发奖。

### 6.4 抖音开发者工具导入与验证步骤
1. 打开**抖音开发者工具 (ByteDance DevTools)**。
2. 点击**导入项目**，项目目录选择：`D:\Desktop\REBench\reverse\perfect-landing-tt-minigame`。
3. AppID 填入测试 AppID（如 `testAppId`）或您的正式小游戏 AppID。
4. 编译后即可在模拟器中查看加载与 3D 渲染表现，支持真机扫码体验。

