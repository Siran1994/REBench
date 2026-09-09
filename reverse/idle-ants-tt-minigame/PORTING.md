# Construct 3 转抖音小游戏移植与架构说明 (Idle Ants / idle_ants_package)

## 1. 工程概述
- **游戏原名**：Idle Ants (蚂蚁军团 / 放置蚂蚁)
- **底层引擎**：Construct 3 (Poki Web / HTML5 导出版，C3 Runtime v1080)
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，竖屏 portrait）
- **设计分辨率**：1080 × 1920 (9:16 Portrait)
- **工程目录**：`reverse/idle-ants-tt-minigame`

---

## 2. 核心架构与分包设计 (ByteDance 4MB 合规)
抖音开放平台强制要求**主包体积必须 <= 4.0 MB**。本项目采用三路独立分包架构，确保主包安全冗余空间充裕：

| 包体划分 | 包含内容 | 体积 | 合规状态 |
|---|---|---|---|
| **主包 (Main Package)** | `game.js`, `game.json`, `project.config.json`, `adapter/`, `scripts/`, `noise.wasm`, `poki-sdk.js`, 基础工具库 | **2.327 MB** | 严守 4.0 MB 硬卡点（剩余 1.673 MB 配额，优于 3.0 MB 推荐线） |
| **图片分包 (`images/`)** | 60+ 张纹理图集切片、蚂蚁皮肤、世界装饰图、`game.js` 入口 | 2.260 MB | 独立分包按需异步加载 |
| **音频分包 (`media/`)** | 43 个 `.webm` 音频资源、3 个新手教学 `.mp4` 视频、`game.js` 入口 | 1.680 MB | 独立分包按需异步加载 |
| **数据分包 (`data/`)** | `data.json` 关卡核心工程数据、布局实例、数值表、`game.js` 入口 | 1.180 MB | 独立分包按需异步加载 |

> [!TIP]
> **分包入口铁律**：已按抖音编译器规范，在 `images/`、`media/`、`data/` 各自根目录下自动补齐独立的 `game.js`（`module.exports = {};`）。

---

## 3. 关键技术适配与双端（Krypton & Helium）避坑

### 1. 安卓真机扫码黑屏防范 (`visualViewport` & `atob`)
- **Android Krypton 引擎**初始化与布局计算依赖 `window.visualViewport`。已在 `adapter/tt-c3-adapter.js` 与 `game.js` 中全局注入具备 `addEventListener` 与尺寸查询能力的事件对象。
- 补齐纯 JS 实现的 `atob` / `btoa`，防止低版本 Krypton 抛出 `atob is not defined` 导致运行中断。

### 2. CommonJS UMD 矩阵库加载修复
- 原版 `c3runtime.js` 头部引入的 `glMatrix` 包含 UMD 检测，在小游戏 CommonJS `require()` 环境下误将矩阵方法绑定至局部 `exports` 而未挂载至 `self.glMatrix`。已修正导出逻辑，同步绑定至 `self.glMatrix` 与 `globalThis.glMatrix`。

### 3. WebAssembly 与随机数噪声支持 (`noise.wasm`)
- 原游戏使用 `noise.wasm` 进行随机数生成与路径噪声模拟。
- 在 `game.js` 中通过 `tt.getFileSystemManager().readFileSync('noise.wasm')` 预载二进制 ArrayBuffer，并在 `c3runtime.js` 的 `_InstatiateWASMModule()` 中优先采用预载 Buffer 调用 `WebAssembly.instantiate`，实现无缝加载。

### 4. 商业化 SDK 零代码桥接 (`PokiSDK` -> 抖音原生广告)
- 通过在根目录重构 `poki-sdk.js`，将原本基于 Poki 平台的商业化点位自动对齐至抖音原生小游戏 API：
  - `rewardedBreak()` $\rightarrow$ `tt.createRewardedVideoAd()`（离线收益 2/3 倍领取、极速蚁/机甲蚁/黄金蚁提前解锁、金币钱袋、加速等）
  - `commercialBreak()` $\rightarrow$ `tt.createInterstitialAd()`（世界切换插屏）
  - 本地或调试环境下具备自动发放奖励的优雅降级容错。

### 5. 完整简体中文本地化 (`zh`)
- 在 `scripts/project/language.js` 中补充了全套简体中文翻译字典（含主界面、四大核心升级属性、三大特殊蚂蚁属性说明、离线收益弹窗等）。
- 在 `scripts/project/saveData.js` 中将检测语言首选项设置为中文优先。

### 6. 竖屏锁定与屏幕自适应
- 在 `game.json` 中配置 `"deviceOrientation": "portrait"`。
- 在 `adapter/tt-c3-adapter.js` 中监听 `tt.onShow`，持续校准竖屏方向，彻底防止 iOS Helium 切后台或菜单重启时被压扁变竖屏。

### 7. ES6 Module `import` 编译报错与业务模块打包平铺
- **现象**：运行时抛出 `SyntaxError: Cannot use import statement outside a module`，导致 `scripts/project/main.js` 加载失败，引发后续 `TypeError: runtime.curWorldId is not a function`。
- **原因**：C3 在 `scripts/project/` 下生成了 8 个使用 ES6 `import`/`export` 的模块脚本，抖音小游戏底层 JS 引擎（CommonJS 模式）无法直接解析 `import` 关键字。
- **解法**：将 `CoroutineYield`、`FastBigInt`、`language`、`staticData`、`saveData`、`websdkwrapper`、`RuntimeMixin` 统一打包平铺至 `scripts/project/main.js`，消除所有 ES6 `import`/`export` 关键字，并在 `game.js` 中显式注册 `scriptModules`，彻底根除语法报错，保证 `RuntimeMixin` 顺利混入 `runtime`。

---

## 3.5 世界装饰物灰色光晕 (Grey halo / 灰边) 修复

**现象**：世界装饰物（叶子、西瓜、蓝蛋等 `ObjectBack` / `ObjectFront` 实例）在游戏内渲染为一大团灰白色的「云雾状」光晕（对比正常版应为干净的图形 + 淡紫投影）。

**原因**：这些装饰纹理由游戏美术**烘焙了半透明的灰色柔和投影/光晕**。运行时用两个 shader 将其抠掉并重新上色：
- `skymen_ChromaTintDropShadow`（`ObjectBack`）：先按 `colorKey=grey(0.5)` 做色键抠图，再乘 `tintColor(0.769)` 上色，最后叠加淡紫投影。
- `Mikal_Chromakey`（`ObjectFront`）：按 `colorKey=grey(0.5)` 做色键抠图。

二者 `tolerance=0.15`。由于烘焙光晕的外侧是**半透明且偏亮**的灰（RGB≈0.84、alpha≈0.1~0.5），与 colorKey(0.5) 的色距 ≈0.65 > 0.15，色键抠图**抠不掉**它；残留的半透明灰被 tint 后又叠到底色上，就成了灰云。

**解法**（`scripts/c3runtime.js` 中两个 shader 的 `glsl`）：在做色键匹配之外，**追加一条「低饱和 + 半透明」判定**，把这类半透明灰光晕一并抠掉，同时保留不透明的灰色内容（花盆等）与彩色主体：

```glsl
lowp float maxc = max(front.r, max(front.g, front.b));
lowp float minc = min(front.r, min(front.g, front.b));
lowp float sat = maxc - minc;
if (diff <= effTol) { front = vec4(0.0); }
else if (sat < 0.16 && front.a < 0.995) { front = vec4(0.0); }  // 半透明灰色光晕
```

`ChromaTintDropShadow` 的投影采样 `testPointTex` 也同理加一条 `tsat` 判定，避免在残留光晕上额外叠投影。`effTol = max(tolerance, 0.08)` 为前置兜底。经 CPU 逐像素模拟验证：装饰蛋的光晕被干净移除，蛋体与不透明灰内容不变。

---

## 4. 导入与运行方式

1. 打开 **抖音开发者工具**（ByteDance DevTools）。
2. 点击 **导入项目**。
3. 选择项目路径：`d:\Desktop\REBench\reverse\idle-ants-tt-minigame`。
4. AppID 可以填测试 AppID 或开发者自己的小游戏 AppID（默认为 `tt130065bd8d63616c02`）。
5. 在工具内点击“编译”即可在左侧模拟器中预览游戏（支持蚂蚁搬运、离线收益结算、金币升级与世界解锁）。
6. 点击上方“真机调试”生成二维码，使用手机抖音 App 扫码进行 Android (Krypton) 与 iOS (Helium) 双端真机验证。
