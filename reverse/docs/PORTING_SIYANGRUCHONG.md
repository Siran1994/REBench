# 《饲养蠕虫》(worm-capitalist) 抖音小游戏移植与逆向审计复盘报告

## 1. 项目概况与审计结论

| 属性 | 审计结果 |
|---|---|
| **待分析安装包** | `apk/siyangruchong_package.rar` (28.98 MB) |
| **底层游戏引擎** | **Unity WebGL (WebAssembly + IL2CPP)** |
| **Unity 编译版本** | **Unity 2021.3.14f1c1** |
| **IL2CPP 元数据版本** | **v29** (`global-metadata.dat`) |
| **渲染管线** | Universal Render Pipeline (URP) + WebGL 2.0 |
| **原项目标识** | `worm-capitalist` (DefaultCompany) |
| **屏幕朝向** | **横屏 (Landscape)**，基准视口 960x600 |
| **中文本地化状态** | **原生内置简体中文**（包含 `zh-Hans` 字典、`SIMHEI SDF` 字体、`Zhuye` 主页场景） |
| **抖音小游戏工程输出** | `reverse/siyangruchong-tt-minigame/` |
| **审计 JSON 归档** | `reverse/docs/siyangruchong_audit.json` |

---

## 2. 架构设计与分包规划（严守 4.0 MB 红线）

由于原 WebGL 包体的 WASM 核心（24.4 MB）和数据包（32.8 MB）远超抖音小游戏 4.0 MB 主包红线，本工程采用工业级**微内核套壳架构 (Micro-Kernel Wrapper)** 与**官方 WASM 分包 (`wasm_pkg`)**：

```text
reverse/siyangruchong-tt-minigame/
├── game.js                       # 小游戏主启动入口 (分包异步挂载、沙盒缓存管理、引擎拉起)
├── game.json                     # 平台配置 (横屏、iOS高性能模式、wasm_pkg分包声明)
├── project.config.json           # 抖音开发者工具工程配置 (native 模式, urlCheck: false)
├── config.js                     # 游戏运行时配置 (CDN 地址、720p 甜点画质参数、广告位)
├── icon.png                      # 游戏图标 (512x512)
├── SDKManager.js                 # 商业化平台管理器 (激励视频、插屏广告、模拟测试自动发奖)
├── adapter/
│   └── tt-unity-adapter.js       # 综合环境适配层 (DOM/Canvas/AudioContext/Touch/Storage/TextDecoder)
├── engine/
│   ├── unity-loader.js           # 微内核解包启动器 (双轨 WASM 编译、UTF-8 纯 JS 解包、IDBFS 秒级放行)
│   └── framework.js              # 深度加固后的 Unity 2021 WebGL 胶水代码
└── wasm_pkg/                     # 【WASM 官方分包】 (7.104 MB)
    ├── siyangruchong.wasm.br     # Brotli quality=6 压缩后的 WebAssembly 核心
    └── game.js                   # 官方分包入口脚本
```

### 包身体检核验结果（`tools/validate-package.js`）
- **主包体积**：**0.479 MB**（严格限制 $\le 4.0\text{ MB}$，主包余量 3.52 MB，仅占限额 12%）
- **WASM 分包体积**：**7.104 MB**（采用 Brotli quality=6 压缩自 24.4 MB，远低于单分包 20 MB 限额）
- **代码总包体积**：**7.584 MB**（远低于总代码包 30.0 MB 限额）
- **分包合法性**：`wasm_pkg/game.js` 入口存在，`game.json` 字段严格为驼峰 `subPackages` 且 root 路径无尾斜杠。

---

## 3. 十项关键运行期适配与避坑防线

### 1. WASM 编译双轨分流与包内路径直传（避坑第 4、58、59 条）
- **物理成因**：`TTWebAssembly.instantiate(path)` 在 Android 与 iOS 底层严格限定只接受**代码包内相对路径**，绝对不支持 `ArrayBuffer` 和沙盒路径（`ttfile://`），否则会导致 Android 底层 JNI 挂起死锁在 15% 或 50%。
- **实施方案**：
  - WASM 通过 Brotli 压缩入 `wasm_pkg` 官方分包；
  - 双端统一采用包内相对路径直传：`TTWebAssembly.instantiate("wasm_pkg/siyangruchong.wasm.br", imports)`；
  - 启动时由底层 C++ mmap 流式解压编译，零 JS 内存开销，彻底杜绝编译死锁。

### 2. 纯 JS 自包含 UTF-8 快速解包器（避坑第 51 条）
- **物理成因**：Android 移动端真机（如 HONOR、小米）Krypton 运行环境全局未暴露原生 `TextDecoder`。在数据解包阶段直接调用 `new TextDecoder("utf-8")` 会触发致命引用异常，导致无法挂载虚拟文件系统。
- **实施方案**：
  - 在 `tt-unity-adapter.js` 全局注入 `MiniTextDecoder` 与 `MiniTextEncoder`；
  - 在 `unity-loader.js` 数据解包器中内置原生字节级 `decodeUtf8` 函数，确保在任何原生环境下 100% 成功解析 `UnityWebData1.0` 容器并释放核心资产。

### 3. 拔除遗留 IDBFS 阻塞依赖（避坑第 52 条）
- **物理成因**：Unity WebGL 默认在 `preRun` 中添加 `JS_FileSystem_Mount` 并尝试异步与浏览器 IndexedDB 握手同步。在小游戏环境下异步回调常被底层挂起，导致 `runDependencies` 始终为 1，主循环被无限期挂死。
- **实施方案**：
  - 在 `unity-loader.js` 的 `Module` 实例中重写 `unityFileSystemInit` 为同步秒级放行；
  - 在 `framework.js` 内部同步重构，不向 Emscripten 注册任何阻塞依赖，数据解包完毕后 `runDependencies` 立即归零秒进 `callMain()`。

### 4. 原生画布保护与 720p 甜点缩放（避坑第 5、22、42 条）
- **物理成因**：移动端原生 Canvas（`tt.createCanvas()`）若使用 `Object.defineProperty` 覆写 `width/height`，会破坏小游戏底层的 C++ 原生 Setter，导致 WebGL Framebuffer Incomplete 黑屏；此外 2.5K/3K 手机屏物理分辨率过高会导致 GPU 填充率饱和严重掉帧。
- **实施方案**：
  - 适配层严禁用 defineProperty 覆写尺寸，直接通过常规赋值（`cvs.width = ...`）触发底层 C++ Framebuffer 扩容；
  - 横屏以**短边 720p 为基准等比缩放**，冷启动强制长边赋宽、短边赋高，消除冷启动竖屏误报。

### 5. WebGL 双缓冲保留（避坑第 4、32 条）
- **物理成因**：在切场景或异步反序列化主场景期间，Unity 暂停提交 DrawCall，Android Adreno GPU 会将单缓冲画布清空为底色黑色。
- **实施方案**：
  - 在 `canvas.getContext` 与 `unity-loader.js` 的 `webglContextAttributes` 强制开启 `preserveDrawingBuffer: true`，杜绝切场景黑屏。

### 6. WebAudio 真实发声与 3D Panner 旁路直通（避坑第 14、16 条）
- **物理成因**：移动端小游戏不支持直接通过 XHR 加载 WebAudio 音频；且 Unity 默认初始化的 3D 空间音频 `createPanner()` 在原生容器中缺失会导致崩溃。
- **实施方案**：
  - 接入 `tt.getAudioContext()` 原生音频上下文；
  - `createPanner()` 返回增益为 1 的真实 GainNode，挂载 dummy 3D 坐标属性直通音频信号；
  - 监听首触 `touchstart` 触发 `audioCtx.resume()` 解除 iOS/Android Autoplay 静音。

### 7. 全域 Loading 遮罩自愈管理（避坑第 8、33 条）
- **物理成因**：跨语言调用时，若场景就绪信号未送达，Loading 遮罩会永久遮挡在游戏画面之上。
- **实施方案**：
  - 挂载全局单例 `__dismissLoadingMask`，实行一票解除、多级阶梯保底（`postRun` 1.5s 保底、stdout 关键引擎日志保底）。

### 8. SendMessage 智能路由与广告状态机防冻结（避坑第 7、56 条）
- **物理成因**：C# 端的广告与生命周期回调声明为无参方法（`void JSLibCallback_AdFinished()`）。若 JS 端传递空字符串 `""` 会导致方法签名失配被静默丢弃；若模拟广告跳过 `onStart()` 直接调用 `onFinished()`，C# 将把 `Time.timeScale` 重置为初始值 `0.0f` 导致时间永久冻结。
- **实施方案**：
  - 在 `framework.js` 的 `SendMessage` 注入特征识别，凡无参回调一律走零参数 `_SendMessage`；
  - 在模拟发奖或异常降级时，同帧成对触发 `onStart()` 与 `onFinished()`，确保游戏时间恢复 1.0f。

### 9. 随机数熵池（randomDevice）加固（避坑第 30 条）
- **物理成因**：Android 真机未暴露标准 `crypto.getRandomValues` 时，虚拟文件系统读取 `/dev/urandom` 会触发 `abort("randomDevice")` 强杀主线程。
- **实施方案**：
  - 适配层注入 W3C 标准 `crypto.getRandomValues`；
  - `framework.js` 内部私有 `getRandomDevice()` 注入高熵伪随机数兜底，杜绝底层 abort。

### 10. 本地沙盒持久化与缓存击穿机制（避坑第 6、28 条）
- **实施方案**：
  - 数据包拉取后缓存于 `${tt.env.USER_DATA_PATH}/unity_cache_${ASSET_CACHE_VERSION}`；
  - 每次更新资产只需在 `config.js` 中递增 `ASSET_CACHE_VERSION`，即可秒级击穿旧沙盒缓存。

### 11. Emscripten 框架导出闭环（unityFramework 兼容 CommonJS 与全局作用域）
- **物理成因**：Unity WebGL 原生 `framework.js` 仅声明顶层函数 `function unityFramework(Module) { ... }`，在小游戏沙盒 CommonJS 环境下通过 `require('./framework.js')` 会返回空对象 `{}`，抛出 `TypeError: unityFramework is not a function`。
- **实施方案**：
  - 在 `framework.js` 尾部挂载多重导出：支持 `module.exports` 以及 `window / globalThis / GameGlobal.unityFramework`；
  - 在 `engine/unity-loader.js` 中增加多级回退判定（require 返回值 -> default -> globalThis -> window -> GameGlobal），确保双端任何打包环境下均 100% 成功取得 `unityFramework` 引导函数。

### 12. DOM 事件总线与 EventTarget 防御机制（避坑第 22 条）
- **物理成因**：Unity 引擎在 `callMain` 阶段初始化输入层（`emscripten_set_keydown_callback_on_thread` 等）时，调用 Emscripten HTML5 模块向全局目标（`specialHTMLTargets` 0/1/2 即 window/document）注册事件监听。抖音小游戏沙盒中宿主对象并不具备完整的 W3C DOM `EventTarget` 接口，原生 `specialHTMLTargets[0]` 为数字 0，导致执行 `eventHandler.target.addEventListener` 抛出 `TypeError: eventHandler.target.addEventListener is not a function` 强杀引擎。
- **实施方案**：
  - **适配层全面补全**（`tt-unity-adapter.js`）：在 `window`、`globalThis`、`GameGlobal`、`document` 全作用域挂载标准 `addEventListener`、`removeEventListener` 与 `dispatchEvent`，统一路由分发；
  - **胶水层加固防击穿**（`framework.js`）：将 `specialHTMLTargets[0]` 修正映射为 `window`；在 `findEventTarget` 增加保底元素查找；在 `registerOrRemoveHandler` 增加类型校验与回退机制，确保非标准环境事件注册绝对安全，主循环无阻进入。

### 13. 滚轮事件空指针与画布选择器容灾（Cannot read properties of null reading 'onwheel'）
- **物理成因**：Unity 引擎向 `#unity-canvas` 注册滚轮监听（`_emscripten_set_wheel_callback_on_thread`）时，宿主 `document.querySelector` 无法在沙盒中查找到实体 DOM 导致返回 `null`；而原生 Emscripten 未对 `findEventTarget` 返回值进行判空直接调用 `target.onwheel`，直接触发空指针强杀。
- **实施方案**：
  - **选择器穿透回退**（`tt-unity-adapter.js`）：在 `document.querySelector` / `getElementById` 增加穿透兜底，对任何针对画布/容器的选择器一律回退至主画布单例；在画布与全局对象挂载 `onwheel = null`；
  - **空安全短路调用**（`framework.js`）：重构 `findEventTarget`，非 window/document 目标默认定向主画布；在 `_emscripten_set_wheel_callback_on_thread` 增加目标判空与 `addEventListener` 双通道支持，彻底根除空指针崩溃。

### 14. Addressables 远端分包与 UnityWebRequest 网络驱动（unable to load settings.json, ResponseCode : 500）
- **物理成因**：Unity 引擎进入主循环后，通过 Addressables 动态加载 `StreamingAssets/aa/settings.json`、`catalog.json` 及语言字库 AssetBundle。原生 WebGL 依赖 `Module.fetchWithProgress` 作为 `_JS_WebRequest_Send` 的通信驱动。微内核启动器未挂载此方法导致 `fetchImpl` 为 `undefined`，Emscripten 捕获异常后向 C# 端回传模拟 HTTP 500，导致多语言与远程资产初始化中断。此外，Windows 本地 CDN 测试服务容易因命令行被鼠标误选（QuickEdit 模式）而冻结工作线程。
- **实施方案**：
  - **微内核网络驱动注入**（`unity-loader.js`）：实现原生高效的 `fetchWithProgress`，优先通过 `tt.request` 直连拉取 ArrayBuffer 二进制流，绕过小游戏浏览器环境下的 CORS 限制；
  - **全域 Fetch 垫片联动**（`tt-unity-adapter.js`）：全局暴露基于 `tt.request` 的标准 `fetch` 适配器，支持头信息解析与流式进度广播；
### 15. 手机真机沙盒环境隔离与 BOM 作用域闭包防御（杜绝 iOS JavaScriptCore 裸词 location / navigator 抛错）
- **物理成因**：
  - 电脑模拟器（Chromium 内核）具备完整的宿主全局 `window`、`location`、`navigator` 变量，而在手机真机端（特别是 iOS 抖音小游戏依托的 Apple WebKit JavaScriptCore 纯 JS 沙盒）中，环境只暴露 `GameGlobal` 与标准 ECMAScript 全局对象，并不存在全局 `location` 与部分原生 BOM 属性；
  - Unity WebGL 的 `framework.js` 在顶层代码第 10 句检查 `if(!navigator.mediaDevices)` 时，警告输出代码中直接使用了裸词 `location.protocol`；且在多处传感器和媒体枚举逻辑中直接访问未限定的 `navigator`、`screen`。在严格模式或纯净 JSContext 下，解析未在词法作用域声明的标识符会直接抛出 `ReferenceError: Can't find variable: location`，导致真机冷启动调用 `createUnityInstance` 时直接闪退报错；
  - 此外，打包合并脚本或构建工具在同域执行时，若存在全局 `let unityFramework` 声明容易引发标识符重定义异常。
- **实施方案**：
  - **适配层全面兜底**（`tt-unity-adapter.js`）：提前获取系统信息，在全局 `root`、`window`、`GameGlobal`、`globalThis` 完整挂载 `mockLocation`（包含 `href`, `protocol`, `host`, `reload` 等）、`mockNavigator`（包含 `userAgent`, `platform`, `languages`, `getGamepads`）、`WebGLRenderingContext` / `WebGL2RenderingContext` 构造桩；
  - **胶水层函数级闭包防御**（`framework.js` / `apply_framework_patch.py`）：在 `function unityFramework(Module) {` 函数入口第一行显式注入 `var window, var document, var navigator, var location, var screen, var performance, var WebGLRenderingContext...`，使整个 Unity 胶水层及其内部嵌套函数全部闭包绑定当前作用域变量，从根本上物理阻断跨作用域查找引发的 `ReferenceError`；同时将 `navigator.mediaDevices` 处的裸词访问重构为短路安全判定；
  - **启动器变量隔离与弹窗格式化**（`unity-loader.js` & `game.js`）：将导入变量名改为私有 `_importedFramework` 防重定义；弹窗展示全面兼容 iOS JSC 堆栈与 `err.name / err.message` 组合，确保故障感知精准透明。

### 16. 抖音小游戏 TTWebAssembly 桥接与原生检测误杀规避（abort("no native wasm support detected")）
- **物理成因**：
  - Unity Emscripten 胶水代码（`framework.js`）在初始化 WASM 之前，存在一段强硬判定：`if(typeof WebAssembly!=="object"){abort("no native wasm support detected")}`；
  - 字节跳动小游戏为了原生端 JIT 安全限制与优化，在 iOS / Android 原生沙盒中将 WebAssembly 引擎挂载在专有对象 **`TTWebAssembly`** 上，未暴露或禁用了标准的全局 `WebAssembly` 变量；
  - 这导致原生 Emscripten 执行到该检查时，无法在全局直接获取到 `WebAssembly` 对象，误判为环境不支持 WASM，直接触发 `abort("no native wasm support detected")` 强制终止游戏。
- **实施方案**：
  - **平台适配层原生桥接**（`tt-unity-adapter.js`）：将 `TTWebAssembly` 自动向上映射为全局 `WebAssembly`，并补齐 `RuntimeError` 属性，广播到所有全局命名空间；
  - **胶水层局部作用域声明**（`framework.js`）：在顶部 Shim 与 `unityFramework` 局部首行显式定义 `var WebAssembly = ... ? WebAssembly : TTWebAssembly`；
  - **特征放行补丁**（`apply_framework_patch.py`）：将该行检查重构为：只要存在 `TTWebAssembly` 或已经由微内核接管 `Module.instantiateWasm`，即视为合规 WASM 环境直接放行，杜绝误杀。

### 17. UnityWebRequest 与 AbortController 垫片补齐（undefined is not a constructor evaluating 'new AbortController'）
- **物理成因**：
  - Unity 2021 WebGL 的网络层（`_JS_WebRequest_Create`）依赖现代浏览器的 `fetch` 与 `AbortController` 机制实现超时与网络中断控制，在每次创建网络请求时执行 `var abortController = new AbortController;`；
  - 手机真机（iOS JSC / Android 移动沙盒）运行环境中全局未实现 W3C 标准的 `AbortController` 和 `AbortSignal`；
  - 当数据包解包完成进入 `callMain` 后，游戏引擎（如 Addressables 资源管理系统、多语言初始化、网络分析上报）立即发起网络通信请求，触发 `_JS_WebRequest_Create`，因缺失构造函数而抛出致命异常：`TypeError: undefined is not a constructor (evaluating 'new AbortController')`，直接中断游戏初始化。
- **实施方案**：
  - **平台适配层纯 JS 垫片注入**（`tt-unity-adapter.js`）：实现轻量纯 JS 的 `MiniAbortSignal` 与 `MiniAbortController`，支持 `signal.aborted` 状态机与 `addEventListener('abort')` 事件派发；
  - **网络驱动真实中断联动**（`unity-loader.js` & `adapter/tt-unity-adapter.js`）：在 `fetchWithProgress` 与 `miniFetch` 中，监听 `init.signal` 的 `abort` 事件，自动联动调用底层小游戏 `RequestTask.abort()` 实现真实的网络取消；
  - **胶水层局部作用域与防空保底**（`framework.js` / `apply_framework_patch.py`）：在 `unityFramework` 局部首行定义 `AbortController`，并在 `_JS_WebRequest_Create` 增加实例保底，彻底杜绝构造异常。

---

## 4. 本地调试与上线部署指南

### 本地测试与开发者工具导入
1. **启动本地 CDN 服务**：
   ```bash
   python serve_cdn.py
   ```
   服务将监听 `http://127.0.0.1:8088/`，并自动回显局域网 IP。
2. **导入抖音开发者工具**：
   - 打开**抖音开发者工具**，选择“导入项目”；
   - 项目目录选择：`reverse/siyangruchong-tt-minigame`；
   - AppID 可选测试号。
3. **运行验证**：
   - 查看控制台输出：确认视口尺寸与 Canvas 常规赋值；
   - 确认 WASM 分包秒开，数据包完成挂载；
   - 确认进入游戏主界面（《饲养蠕虫》主页），触控喂食、养成和商店均正常发声与交互。

### 正式上线与 CDN 托管
1. 将 `cdn_assets/` 目录下的所有文件上传至生产 CDN（如火山引擎、腾讯云 COS、阿里云 OSS）；
2. 打开 `reverse/siyangruchong-tt-minigame/config.js`，将 `CDN_BASE_URL` 替换为生产正式 CDN 域名；
3. 在 `config.js` 的 `ADS` 字段中配置正式抖音广告位 ID；
4. 在抖音开发者工具中点击“上传”，提交开放平台审核！
