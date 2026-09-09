# 网页版免广告试玩链接 (No-Ad Free-Link) 深度避坑与打包指南

## 1. 概述与设计目标

在完成 Android APK / XAPK 反编译逆向并移植为抖音小游戏后，商务、发行与运营团队通常需要一套**无需安装任何小游戏客户端、可直接上传至 CDN、并在任意桌面或移动浏览器直接秒开运行**的 Web 免广告试玩版本（No-Ad Free-Link）。

为保证试玩体验与分发效率，该版本必须达成以下 4 项核心标准：
1. **全链路免广告直接发奖**：游戏内所有激励视频、插屏广告、横幅广告均自动拦截并直接触发奖励回调，杜绝卡流程或卡死。
2. **纯相对路径自包含**：所有静态资源（图片、音频、WASM、字典 JSON）支持任意子目录部署，无绝对路径硬编码。
3. **原生 Web 兼容性**：彻底剥离 Android Cordova 容器原生依赖，消除 `resolveLocalFileSystemURL` 与原生插件缺失报错。
4. **本地零门槛一键测试**：提供自动化本地服务脚本与双击启动器，规避浏览器安全限制。

---

## 2. 核心技术痛点与深度避坑

### 2.1 浏览器 `file:///` 协议 CORS 与 ES Module 拦截（本地黑屏元凶）
- **现象**：
  在 Windows 资源管理器中直接双击 `index.html`，浏览器呈现黑屏无内容，F12 控制台报错：
  ```text
  Access to script at 'file:///...' from origin 'null' has been blocked by CORS policy.
  ```
- **根因**：
  Construct 3 等现代 HTML5 引擎采用 `<script type="module" src="scripts/main.js">`，并通过 ES6 `import` 引用核心运行时，同时使用 `fetch('data.json')` 加载数据。根据 **W3C / WHATWG 规范**，本地 `file:///` 协议的 Origin 被判定为 `null`，现代浏览器严禁在 `null` 源下加载跨文件模块脚本与发送 fetch 请求。
- **解决方案**：
  1. 在 `noad-bridge.js` 头部检测 `if (window.location.protocol === 'file:')`，当检测到本地直接双击时，弹出居中高质感毛玻璃提示，清晰告知原因并指引双击 `启动网页试玩.bat`。
  2. 提供配套的微型本地 HTTP 服务启动器。

### 2.2 Windows 注册表导致 Python `http.server` 的 MIME 类型缺陷
- **现象**：
  在本地运行常规 `python -m http.server 8080` 后访问，Chrome 仍然拒绝加载脚本，报错：
  ```text
  Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/plain". Strict MIME type checking is enforced for module scripts per HTML spec.
  ```
- **根因**：
  Windows 注册表中 `HKEY_CLASSES_ROOT\.js` 的 `Content Type` 经常被第三方文本编辑器或系统默认修改为 `text/plain`。Python 的标准库 `mimetypes` 在 Windows 下直接读取该注册表项，导致服务返回的 HTTP Header 为 `Content-Type: text/plain`。HTML 规范强制要求对 ES Module 实施严格 MIME 检查（Strict MIME type checking），非 JavaScript MIME 类型直接被浏览器拒收。
- **解决方案**：
  编写专用的 `serve.py`，显式重写 `extensions_map`：
  ```python
  mimetypes.add_type('application/javascript', '.js')
  mimetypes.add_type('application/wasm', '.wasm')
  mimetypes.add_type('application/json', '.json')
  ```

### 2.3 原生 Cordova 容器 API 残留与移动端广告 SDK 崩溃
- **现象**：
  从 APK 逆向提取的代码中，`scripts/main.js` 包含 `exportType: "cordova"`。在浏览器运行时抛出：
  ```text
  TypeError: cordova.plugins.emiMaxAppOpenAd.requestIDFA is not a function
  ```
- **根因**：
  - 在 `exportType: "cordova"` 下，C3 假定运行在移动宿主环境，会等待原生 `deviceready` 事件并尝试调用 Android 原生文件系统和原生 Java 插件（如 AppLovin MAX、AppOpenAd、Google Play 结算插件）。
  - 普通浏览器缺失这些对象，或由于宿主差异导致调用 iOS/Android 专用 API 抛出未捕获异常，导致 `C3.Runtime.Init()` 崩溃挂起。
- **解决方案**：
  1. 将 `scripts/main.js` 中的 `exportType` 强制修正为 `"html5"`。
  2. 移除 `index.html` 中的原生 `<script src="cordova.js"></script>`，避免定义冲突。
  3. 在 `noad-bridge.js` 中使用 **ES6 Proxy** 深度兜底 `window.cordova`、`AppLovinMAX` 与 `emiMaxAppOpenAd`：
     ```javascript
     const safeAppLovin = new Proxy(baseAppLovin, {
       get(target, prop) {
         if (prop in target) return target[prop];
         return function() { return {}; };
       }
     });
     ```
  4. 对原生插件的 `c3runtime/instance.js` 初始化代码包裹 `try ... catch`，确保任何环境波动不影响游戏正常启动。

### 2.4 广告生命周期拦截与免广告发奖逻辑
- **现象**：
  若仅暴力删除广告调用代码，会导致玩家在点击“双倍金币”、“看广告复活”等按钮后毫无反应，游戏核心循环断裂。
- **根因**：
  Construct 3 事件表中往往依赖广告播放结束事件（如 `OnRewardedAdReceivedRewardEvent` 或 `tt.onClose({ isEnded: true })`）触发后续奖励动作。
- **解决方案**：
  在 `noad-bridge.js` 中完整模拟各大 SDK 的广告生命周期：
  - **抖音小游戏 (`tt.createRewardedVideoAd`)**：`show()` 时延迟 100ms 自动触发 `onClose({ isEnded: true, count: 1 })`。
  - **PokiSDK (`rewardedBreak`)**：直接返回 `Promise.resolve(true)`。
  - **AppLovin MAX**：触发 `OnRewardedAdReceivedRewardEvent` 与 `OnRewardedAdHiddenEvent` 自定义事件。
  - **视觉反馈**：触发发奖时，屏幕顶部浮现毛玻璃 HUD Toast：`✨【免看广告】奖励已直接发放！`，强化试玩爽感。

---

## 3. 多工程独立隔离与端口规划

在 `Noad-freelinks/` 目录下，所有项目必须以独立子目录归类存放，避免多游戏共用或覆盖：

```text
Noad-freelinks/
├── index.html                      # 试玩导航门户（聚合所有免广告项目卡片）
├── serve.py                        # 门户 HTTP 服务脚本
├── 启动所有免广告试玩.bat           # 门户一键启动器 (Port 8080)
├── digger_escape/                  # 项目 1: 逃离矿井
│   ├── index.html
│   ├── noad-bridge.js
│   ├── serve.py
│   └── 启动网页试玩.bat             # 独立启动器 (Port 8089)
└── mine_line/                      # 项目 2: 小小矿工
    ├── index.html
    ├── noad-bridge.js
    ├── serve.py
    └── 启动网页试玩.bat             # 独立启动器 (Port 8090)
```

**端口分配规范**：
- `8080`：试玩总览门户
- `8089`：项目 A (如 Digger Escape)
- `8090`：项目 B (如 Mine Line)
- `8091+`：后续新项目依次递增，互不占用，支持同时开启多款游戏对比体验。

---

## 4. 自动化导出与部署标准命令

使用自动化导出脚本一键完成提取、桥接注入与批处理生成：

```bash
node .agents/skills/apk-re-to-minigame/scripts/export-noad-freelink.js \
  --source ./reverse/mine_line_package \
  --output ./Noad-freelinks/mine_line \
  --name "Mine Line (Tiny Miners)"
```

**该脚本自动执行**：
1. 递归拷贝所有图片、音频、字体、数据配置与 WASM 模块。
2. 注入最新防跨域与安全 Proxy 的 `noad-bridge.js`。
3. 修正 `index.html` 与 `scripts/main.js`（切换 `exportType: "html5"`，剔除 native `cordova.js`）。
4. 生成独立端口的 `serve.py` 与 `启动网页试玩.bat`。
5. 自动扫描 `Noad-freelinks/` 下的所有项目，重构 `Noad-freelinks/index.html` 门户索引。
