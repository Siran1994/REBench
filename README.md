# REBench: 移动端游戏逆向分析与小游戏移植工作台

`REBench` 是专用于移动端游戏安装包（`.apk`、`.xapk`、`.apks`、`.rar`、`.zip`）的**自动化引擎特征识别**、**代码资产提取审计**，以及将 **Construct 3**、**Construct 2**、**Unity WebGL** 游戏工程完整移植适配为**抖音小游戏（ByteDance MiniGame）**的标准化工程基座。

---

## 目录索引

- [一、核心工作流与引擎门禁](#一核心工作流与引擎门禁)
- [二、已知测试样本矩阵](#二已知测试样本矩阵)
- [三、规范化项目目录架构](#三规范化项目目录架构)
- [四、常用命令与工具链指南](#四常用命令与工具链指南)
- [五、三大主流引擎移植核心避坑技术](#五三大主流引擎移植核心避坑技术)
- [六、AI Agent 专属技能 (`apk-re-to-minigame`)](#六ai-agent-专属技能-apk-re-to-minigame)

---

## 一、核心工作流与引擎门禁

本项目严格遵循**门禁在前、平台适配第一**的核心原则：
> [!IMPORTANT]
> **工作流铁律**：逆向分析的核心目标是**抖音小游戏端（Phase 1 至 Phase 7）的稳定跑通**。严禁在小游戏适配通过前提前制作无广告试玩链接！CDN 免广告试玩版仅作为小游戏验证完毕后的按需交付物。

```mermaid
graph TD
    A[待逆向包体: .apk / .xapk / .rar / .zip] --> B[第一步: 运行 tools/inspect_apk.py 门禁扫描]
    B --> C{底层引擎判定}
    
    C -->|Unity WebGL| D[【通过门禁】Unity WebGL 管线<br/>Wasm/Data分包 + 尺寸回退 + 内存预载]
    C -->|Construct 2| E[【通过门禁】Construct 2 管线<br/>jQuery/DOM模拟 + c2canvasdiv + XHR拦截 + ogg瘦身]
    C -->|Construct 3| F[【通过门禁】Construct 3 管线<br/>分包瘦身 + WASM内嵌 + ES6降级 + 字体别名映射]
    C -->|Unity Native Android| G[【终止流程】含 libunity.so/libil2cpp.so 纯原生无 WebGL 资产, 立即上报并终止]
    C -->|其他引擎: Haxe/Cocos/Godot| H[【暂停流程】输出特征并上报评估]

    D --> I[小游戏工程架构搭建与 4.0MB 分包]
    E --> I
    F --> I
    I --> J[注入专有适配层、全局垫片与 SDKManager]
    J --> K[排查语法、着色器与运行时异常]
    K --> L[中文字体别名重映射与文本本地化]
    L --> M[抖音开发者工具与真机扫码验证跑通 (核心里程碑)]
    M --> N[【可选附录】按需打包 CDN 免广告脱机试玩版本]
```

---

## 二、已知测试样本矩阵

| 安装包名称 | 识别引擎 | 门禁判定 | 说明 / 成品路径 |
|---|---|---|---|
| **Perfect Landing: Plane Pilot** | **Unity WebGL (2022.3)** | **✅ PROCEED** | 3D 飞机弹射与迫降，已完成移植：`reverse/perfect-landing-tt-minigame` |
| **Pizza Tower** | **Construct 2 + Spine** | **✅ PROCEED** | 餐厅放置建造模拟，已完成移植：`reverse/pizza-tower-tt-minigame` |
| **Digger+Escape_1.1.9** | **Construct 3** | **✅ PROCEED** | 挖掘机逃脱物理闯关，已完成移植：`reverse/digger-tt-minigame` |
| **Blumgi Slime_1.1.0.1** | **Construct 3** | **✅ PROCEED** | 标准 Construct 3 Web 封装，待移植：`apk/Blumgi Slime_1.1.0.1.xapk` |
| **G-Switch 4 / Level Devil** | **Haxe / Lime / OpenFL** | **⏸ PAUSE** | 基于 OpenFL/Lime C++ 引擎，非 Web 架构，暂停评估 |
| **Idle Ants / Stickman Parkour**| **Unity (Native Android)**| **🛑 TERMINATE**| 纯原生 Android IL2CPP 二进制包（非 WebGL），按规范终止 |

---

## 三、规范化项目目录架构

```text
REBench/
├── .agents/skills/apk-re-to-minigame/   # Antigravity / Claude 专属移植技能定义
│   ├── SKILL.md                         # 核心指导手册 (多引擎规则、工作流、踩坑红线)
│   ├── scripts/                         # 自动化工具源码 (inspect_apk, validate-package 等)
│   ├── templates/                       # 双端适配器模板 (tt-unity-adapter, tt-c2-adapter 等)
│   └── references/                      # 深度避坑指南 (Unity WebGL, Construct 2, Krypton/Helium)
├── apk/                                 # 【输入包存放区】外部交付的 .apk / .xapk / .rar 压缩包
├── extracted/                           # 【原始解压区】从包体解压出的原始完整工程
│   ├── perfect_landing_plane_pilot_package/  # Unity WebGL 原始工程
│   ├── pizza_tower_package/                  # Construct 2 原始工程
│   └── digger_escape_web/                    # Construct 3 提取 Web 静态工程
├── reverse/                             # 【核心成品区】移植完成的抖音小游戏与审计报告
│   ├── perfect-landing-tt-minigame/     # 【成品】Unity 3D 抖音小游戏
│   ├── pizza-tower-tt-minigame/         # 【成品】Construct 2 抖音小游戏
│   └── docs/                            # 各项目的逆向复盘审计文档 (PORTING_*.md)
├── Noad-freelinks/                      # 【CDN 试玩区】浏览器脱机免广告试玩版 (按需交付)
│   ├── index.html                       # 试玩大厅导航门户
│   ├── serve.py                         # 针对 Windows MIME 纠偏的微型服务器
│   ├── 启动所有免广告试玩.bat           # 一键启动试玩服务
│   ├── perfect_landing/                 # Unity 试玩版
│   └── pizza_tower/                     # Construct 2 试玩版
├── font/                                # 【通用字库】精简中文字库 (font.ttf)
├── template/                            # 【模板基座】官方小游戏原生工程基准模版 (ttminiGame)
├── tools/                               # 【可复用工具链】解压与自动化处理工具
│   ├── inspect_apk.py                   # 引擎门禁多格式快速扫描器 (支持 APK/RAR/ZIP)
│   ├── validate-package.js              # 小游戏主包 4.0MB 与分包合规校验器
│   ├── embed-images.js                  # 图集分包 game.js 补齐与 Base64 映射生成器
│   ├── embed-wasm.js                    # WASM Base64 模块化内嵌工具
│   ├── export-noad-freelink.js          # CDN 免广告试玩版本导出器
│   ├── analyze_meta.py                  # IL2CPP Metadata 分析器
│   └── UnRAR.exe / unrarw64.exe         # RAR 高速解压依赖
└── scratch/                             # 【排错历史与调试日志归档】
    ├── perfect_landing/                 # Unity 3D 排错脚本集
    ├── pizza_tower/                     # Pizza Tower 汉化与 Spine 调试集
    └── common/                          # 通用测试脚本
```

---

## 四、常用命令与工具链指南

### 1. 扫描与审计游戏包引擎（支持 APK / XAPK / RAR / ZIP）
```bash
python tools/inspect_apk.py "apk/YourGamePackage.rar" -o reverse/docs/audit.json
```

### 2. 校验抖音小游戏合规性（主包 4.0MB 限制 & 分包规范）
```bash
node tools/validate-package.js "reverse/perfect-landing-tt-minigame"
```

### 3. 自动生成分包 `game.js` 与图集映射
```bash
node tools/embed-images.js "reverse/pizza-tower-tt-minigame"
```

### 4. 导出脱机 CDN 免广告试玩版本（小游戏跑通后按需执行）
```bash
node tools/export-noad-freelink.js -s "extracted/pizza_tower_package" -o "Noad-freelinks/pizza_tower" -n "Pizza Tower"
```

---

## 五、三大主流引擎移植核心避坑技术

### 1. Unity WebGL 移植关键避坑
- **画布 3×3 极低分辨率模糊渐变**：
  Unity 启动调用 `_JS_SystemInfo_GetCanvasClientSize("#unity-canvas")`，在小游戏模拟器中 `document.querySelector` 返回 `null` 导致尺寸归零，Unity 保底截断为 `1x1` 乘以 DPR (3) 得到 `3x3`，导致画面被拉伸成大团模糊渐变。
  **正解**：在 `framework.js` 中将该查询第一优先级回退至 `Module["canvas"]` 及其 `getBoundingClientRect()`，准确返回 `852x393`，让 Unity 自然申请 `2556x1179` 视网膜分辨率。
- **严禁使用 `Object.defineProperty` 覆写画布尺寸**：
  小游戏 `tt.createCanvas()` 返回的原生画布对象带有 C++ 绑定 Setter。JS defineProperty 会切断底层通知，导致 WebGL 上下文失配报全黑屏。必须保留正常赋值流程。
- **二进制内存预装载**：
  在 `game.js` 启动前通过 `fs.readFileSync` 预载 `.wasm` 与 `.bin` 入内存，直接注入 `unityConfig.wasmBinary` 与 `unityConfig.dataBinary`，杜绝异步 fetch 竞态与卡死。

### 2. Construct 2 移植关键避坑
- **jQuery 2.1.1 与 DOM 树模拟**：
  补齐 `MiniDocument`（`nodeType=9`、`defaultView`、`createComment`、`createDocumentFragment`）与 `MiniElement`（`nodeType=1`、`cloneNode`、`contains`、`compareDocumentPosition`）。
- **画布包裹树结构**：
  C2 依赖 `<div id="c2canvasdiv"><canvas id="c2canvas"></canvas></div>` 结构，适配层需在初始化时自动生成 `#c2canvasdiv` 并包裹主画布。
- **本地数据 XHR 零延迟拦截**：
  在 `XMLHttpRequest` 垫片中直接拦截 `data.js` 与 `localisation.json`，从预载内存直接返回，彻底消除异步读取超时白屏。
- **音频包体极速瘦身**：
  直接剔除冗余的 `.ogg` 音频，统一使用小游戏原生硬解支持极佳的 `.m4a`，可直接瘦身数兆空间。

### 3. Construct 3 移植关键避坑
- **WASM Base64 模块化内嵌**：
  使用 `embed-wasm.js` 将 `noise.wasm` 等转为 Base64 JS 模块，绕开小游戏打包白名单过滤限制。
- **中文字体别名重映射**：
  使用 `tt.loadFontFace({ family: 'Rounds Black', source: 'url("fonts/font.ttf")' })`，直接将原英文字体名映射到中文字体，无需修改任何 Text 实例配置。
- **横竖屏锁定防死循环**：
  设置互斥锁 `_isSettingOrientation`，在 `windowWidth > windowHeight` 时直接退出，防止每秒数百次的转屏自激死循环。

---

## 六、AI Agent 专属技能 (`apk-re-to-minigame`)

本工程已完成多引擎全面升级。无论在当前工作区还是其他项目，只需对 AI 发送指令：
> **“帮我逆向分析一下这个安装包：apk/xxx.rar”**

AI 助手将自动载入本工作流：
1. 调用 `tools/inspect_apk.py` 识别引擎（自动识别 Unity WebGL / C2 / C3 / Unity Native）；
2. 依据引擎特征自动路由至对应移植方案；
3. **优先专注于抖音小游戏端（分包构建、垫片注入、4MB 合规校验、模拟器/真机跑通）**；
4. 跑通验证后，按需协助生成 CDN 免广告试玩版本！
