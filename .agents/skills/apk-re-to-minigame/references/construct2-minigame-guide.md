# Construct 2 (C2) 移植抖音小游戏实战与深度避坑指南

本文档全面沉淀了将 **Scirra Construct 2 (C2)** 导出的 HTML5 游戏工程完整移植适配为**抖音小游戏（ByteDance MiniGame）**的技术架构、关键断点与核心避坑守则。

---

## 一、Construct 2 与 Construct 3 的核心架构差异

| 维度 | Construct 3 (C3) | Construct 2 (C2) |
|---|---|---|
| **运行时文件** | `c3runtime.js` | `c2runtime.js` |
| **工程数据格式** | `data.json`（纯 JSON 结构） | `data.js`（JavaScript 数据赋值脚本） |
| **DOM 依赖度** | 较低（现代 Worker 架构，与 DOM 弱耦合） | **极高**（深度绑定 `jQuery 2.1.1`，强依赖真实 DOM 树） |
| **骨骼动画支持** | 原生或 WebAssembly 插件 | 常外挂 `spine_webgl.js`（Spine 2.x/3.x 独立库） |
| **主画布依赖** | `#c3canvas` 或动态指定 | 严格依赖 `#c2canvas` 且父级必须存在 `#c2canvasdiv` |
| **数据加载方式** | `fetch('data.json')` | `new XMLHttpRequest()` 异步读取 `data.js` |

---

## 二、Construct 2 移植小游戏四大攻坚要点

### 1. `jQuery 2.1.1` 与 DOM 树完美兼容垫片

#### 现象
小游戏环境报 `TypeError: Cannot read property 'defaultView' of undefined`，或 Sizzle 选择器引擎在 `contains`、`compareDocumentPosition` 处抛出异常导致游戏白屏中断。

#### 根因剖析
C2 运行时初始化时通过 jQuery 探测宿主环境：
1. 访问 `document.nodeType === 9`。
2. 访问 `document.defaultView` 获取 `window`。
3. 依赖 `document.createComment` 与 `document.createDocumentFragment`。
4. 调用 `element.cloneNode(true)` 复制节点。
5. 使用 `element.contains(node)` 与 `element.compareDocumentPosition(node)` 进行节点包含性检测。

#### 解决方案
在 `adapter/tt-c2-adapter.js` 中补全精细化 DOM 原型链：
```javascript
// MiniDocument 补全
mockDocument.nodeType = 9;
mockDocument.defaultView = root;
mockDocument.createComment = function () {
  return { nodeType: 8, nodeName: '#comment' };
};
mockDocument.createDocumentFragment = function () {
  return {
    nodeType: 11,
    nodeName: '#document-fragment',
    childNodes: [],
    appendChild: function (c) { this.childNodes.push(c); return c; }
  };
};

// MiniElement 补全
MiniElement.prototype.nodeType = 1;
MiniElement.prototype.cloneNode = function (deep) {
  var clone = new MiniElement(this.tagName);
  clone.id = this.id;
  clone.className = this.className;
  return clone;
};
MiniElement.prototype.contains = function (other) {
  if (!other) return false;
  if (other === this) return true;
  var p = other.parentNode;
  while (p) {
    if (p === this) return true;
    p = p.parentNode;
  }
  return false;
};
MiniElement.prototype.compareDocumentPosition = function (other) {
  if (this === other) return 0;
  if (this.contains(other)) return 20; // DOCUMENT_POSITION_CONTAINED_BY | DOCUMENT_POSITION_FOLLOWING
  return 0;
};
```

---

### 2. 画布包裹容器结构（`#c2canvasdiv` 树）

#### 现象
C2 运行时报错 `Cannot read property 'style' of null` 或无法正确计算画布缩放居中位置。

#### 根因剖析
C2 在 `c2runtime.js` 中明确假定画布结构为：
```html
<div id="c2canvasdiv">
  <canvas id="c2canvas" width="..." height="..."></canvas>
</div>
```
运行时会频繁读取并设置 `document.getElementById("c2canvasdiv").style`。

#### 解决方案
适配层初始化时自动构造这层容器并建立父子关系：
```javascript
const canvas = root.__mainCanvas || tt.createCanvas();
canvas.id = 'c2canvas';

const canvasDiv = mockDocument.createElement('div');
canvasDiv.id = 'c2canvasdiv';
canvasDiv.appendChild(canvas);
canvas.parentNode = canvasDiv;

if (mockDocument.body) {
  mockDocument.body.appendChild(canvasDiv);
  canvasDiv.parentNode = mockDocument.body;
}
```

---

### 3. 数据与多语言 XHR 零延迟拦截

#### 现象
C2 启动时白屏等待，或真机报 `XMLHttpRequest` 请求本地文件失败。

#### 根因剖析
C2 通过 `new XMLHttpRequest()` 发起 `GET data.js` 请求，解析其内容并 `eval` 或通过函数装载数据。如果在网络层走小游戏文件读取容易引发异步等待或路径异常。

#### 解决方案
在主入口 `game.js` 中提前将 `data.js` 与 `localisation.json` 读取入内存，并在适配层 `XMLHttpRequest` 垫片中做同名拦截：
```javascript
// adapter/tt-c2-adapter.js 中拦截
const originalSend = MockXHR.prototype.send;
MockXHR.prototype.send = function (data) {
  var url = this._url || '';
  if (url.indexOf('data.js') !== -1 && root.__c2DataJsContent) {
    this.status = 200;
    this.responseText = root.__c2DataJsContent;
    this.readyState = 4;
    if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
    if (typeof this.onload === 'function') this.onload();
    return;
  }
  if (url.indexOf('localisation.json') !== -1 && root.__c2LocalisationJsonContent) {
    this.status = 200;
    this.responseText = root.__c2LocalisationJsonContent;
    this.readyState = 4;
    if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
    if (typeof this.onload === 'function') this.onload();
    return;
  }
  originalSend.call(this, data);
};
```

---

### 4. Spine WebGL 骨骼动画引擎绑定

#### 现象
使用 Spine 插件的角色模型在场景中不显示，或控制台报错 `spine is not defined`。

#### 根因剖析
`spine_webgl.js` 编译时默认挂载在浏览器的 `window.spine`。在小游戏 CommonJS 模块环境中，未自动挂载至 `globalThis`。

#### 解决方案
在 `scripts/spine_webgl.js` 底部显式增加全局双端导出：
```javascript
if (typeof window !== 'undefined') window.spine = spine;
if (typeof globalThis !== 'undefined') globalThis.spine = spine;
if (typeof module !== 'undefined' && module.exports) module.exports = spine;
```

---

### 4.1 Spine 角色透明、消失或动画不播放：运行时取证闭环

#### 先判断“看到的是什么”

角色位置上出现一个很淡的静态人影，不等于 Spine 被错误地绘制成半透明。C2 项目常在骨骼角色下方放置低透明度占位精灵；当 Spine 资产没有加载时，占位精灵仍可见，于是表象像 Alpha 错误。必须先证明骨骼资产已加载并完成过绘制，再检查混合模式。

| 运行时证据 | 优先结论 |
|---|---|
| `loaded=false`、`textures=[]`、`completedDraws=0` | 资产链路失败；不要先改 Shader、Alpha 或动画时钟 |
| `pending/toLoad=-1` | 同一张图片的完成回调被触发两次 |
| `pending=0`，但 `errors` 含 `ownerDocument ... only a getter` | DOM 适配层写入了原生只读属性，图集解析在发现纹理前已中断 |
| `shaderReady=true`、`drawAttempts>0`、`completedDraws=0` | Shader 就绪不代表角色可画；继续检查 skeleton/atlas/texture 加载 |
| `loaded=true`、纹理有尺寸、`completedDraws` 增长，但画面颜色异常 | 此时才检查 PMA、blendFunc、tint 与 opacity |
| `loaded=true` 且持续绘制，但 `trackTime` 不增长 | 才进入 tick、timescale、动画状态机排查 |

#### 必须记录的诊断字段

在真实抖音模拟器和真机中，对每个 Spine 实例输出：骨骼名、`loaded`、AssetManager 的 `pending/toLoad` 与 `errors`、纹理键/路径/宽高、纹理与渲染器是否同一 WebGL context、`visible`、`opacity`、`shaderReady`、`drawAttempts`、`completedDraws`、动画名、`trackTime` 和最后一次渲染异常。构建日志必须带递增版本号，避免把旧包日志当成新修复结果。

本次故障的真实因果链是：

```text
document.createElement('img')
  -> 适配器写入原生 getter-only ownerDocument/nodeType
  -> 严格模式抛错，TextureAtlas 首轮纹理发现中断
  -> textures=[]，skeleton loaded=false
  -> Spine 从未完成绘制，底层低透明占位精灵露出
  -> 表面看似“角色透明 + 动画不播放”
```

#### Image/DOM 适配器的硬约束

1. **每个 `src` 只能结算一次**：使用 `settled + generation` 状态；重新赋值 `src` 时重置 `complete/loaded/error/settled`。迟到回调必须校验 generation。
2. **原生事件只接一条通道**：若已通过原生 `onload/onerror` setter 注册，就不要再用原生 `addEventListener` 注册相同内部回调。否则 Spine `AssetManager.toLoad` 可能从 `1` 连减到 `-1`，而 `isLoadingComplete()` 只接受 `=== 0`。
3. **禁止超时伪成功**：不能在若干秒后主动调用 load 回调。未解码、宽高为 0 的图片若被当作成功，会把坏纹理送入 WebGL 并掩盖真正错误。超时只允许记录诊断或触发显式失败/重试。
4. **失败重试必须是新一代请求**：fallback 改写 `src` 时必须先重置结算状态；旧请求的迟到事件不得结算新请求。
5. **原生对象属性默认不可写**：`ownerDocument`、`nodeType`、`tagName` 等只在缺失时补充，并使用 `try/catch` 隔离；不得无条件覆盖宿主值。

```javascript
try {
  if (!img.ownerDocument) img.ownerDocument = root.document || null;
} catch (e) {}
try {
  if (typeof img.nodeType === 'undefined') img.nodeType = 1;
} catch (e) {}
```

#### 验证顺序与完成门槛

1. 先取得失败设备的运行时诊断，沿最早的资产错误定位，禁止仅凭截图猜测。
2. 为图片包装器做契约测试，至少覆盖：宿主同时触发 property handler 与 event listener、只有自身 `onload` 属性、超时未解码、error 后换 `src` 重试、复用 Image、getter-only `ownerDocument/nodeType`。
3. 测试必须走真实的 `document.createElement('img')`、真实 Spine AssetManager 和至少一份真实 atlas；只测孤立 WebGL 绘制会漏掉 DOM 工厂错误。
4. 用真实 WebGL 做像素与动画验证：非透明像素数大于 0、间隔帧 checksum 不同、`trackTime` 增长、`gl.getError() === 0`。
5. 最后在抖音模拟器和真机复验。只有日志同时满足 `loaded=true`、纹理存在且尺寸非 0、`completedDraws` 持续增长、`trackTime` 增长、atlas errors 为空，才可以宣布修复。

#### 常见误判

- `UNPACK_PREMULTIPLY_ALPHA_WEBGL` 主要影响 RGB 边缘与混合结果，不能解释 `loaded=false`、`textures=[]` 或 atlas 解析异常。
- 把动画 `update()` 从 draw 移到 tick，不能让未加载的 skeleton 开始播放。
- 静态审查、mock Shader 或独立 WebGL demo 通过，只能证明局部代码可运行，不能证明小游戏的 Image/DOM/atlas 全链路正确。

---

### 5. 音频系统适配与 HTML5 Audio 模式锁定（关键避坑）

#### 现象
游戏运行时完全没有声音，或控制台大量报 `media/*.ogg` 404 错误，或背景音乐与音效无任何响应但无明显报错。

#### 根因剖析
Construct 2 音频引擎（`cr.plugins_.Audio`）在抖音小游戏环境中有三个隐蔽且致命的死穴：
1. **WebAudio 诱骗陷阱**：C2 初始化时优先检测 `window.AudioContext`。适配层若暴露了 dummy `SafeAudioContext`，C2 会判定进入 `api = API_WEBAUDIO` 模式。在该模式下，C2 会使用 XHR 获取音频 ArrayBuffer 并调用 `ctx.decodeAudioData`。由于小游戏 WebAudio 无法解码 AAC 编码的 `.m4a` 且 dummy AudioContext 无法发声，导致音效彻底静默。
2. **ES6 继承中的自身属性方法遮蔽（Method Shadowing）**：`MiniAudio extends MiniElement`。若基类 `MiniElement` 构造函数在 `this` 上直接绑定了空桩 `this.play = function() { ... }`、`this.canPlayType = function() { ... }`，这些自身属性会**强行遮蔽** `MiniAudio.prototype.play()` 等封装了 `tt.createInnerAudioContext()` 的真实原生桥接方法，导致音频调用完全空跑。
3. **`canPlayType` 误报导致 .ogg 404**：基类 `canPlayType` 误对 `ogg/vorbis` 返回 `'maybe'`，导致 C2 判定宿主支持 OGG 并计算出 `useOgg = true`，从而发起全部指向 `media/*.ogg` 的网络请求。而在 4MB 主包瘦身阶段，通常已将 `.ogg` 全部删除（仅保留 `.m4a`），造成全量 404。

#### 解决方案（三位一体闭环）
1. **锁定 `c2runtime.js` 模式**：
   定位到 `cr.plugins_.Audio.prototype.onCreate`（约 18450~18510 行），在检测逻辑开头插入小游戏环境判断，强制锁定 `API_HTML5` 并关闭 `useOgg`：
   ```javascript
   // 小游戏环境强制锁定 HTML5 Audio 模式，由 MiniAudio 接管 tt.createInnerAudioContext
   if (typeof tt !== "undefined") {
     this.api = API_HTML5;
     this.useOgg = false;
     return;
   }
   ```
2. **适配层原型方法保护与自动纠偏**：
   - 在 `templates/tt-c2-adapter.template.js` 的 `MiniElement` 构造函数中增加防护：
     ```javascript
     if (this.tagName !== 'AUDIO') {
       // 仅非 AUDIO 元素绑定 dummy 媒体属性，避免遮蔽 MiniAudio 原型方法
       this.play = ...;
       this.canPlayType = ...;
     }
     ```
   - 在 `MiniAudio` 原型上的 `set src(val)` 中，自动将历史遗留的 `.ogg` 后缀纠正为 `.m4a`：
     ```javascript
     clean = clean.replace(/\.ogg$/i, '.m4a');
     ```
   - 保证 `canPlayType` 对 `m4a/mp3/aac/wav` 返回 `'maybe'`，对 `ogg/webm` 严格返回 `''`。
3. **主入口全局手势音频激活**：
   在 `game.js` 中监听首次触摸手势，解除移动端静音策略：
   ```javascript
   const unlockAudio = () => {
     try {
       const ctx = tt.createInnerAudioContext();
       ctx.src = 'media/silence.m4a'; // 或工程中已有短音效
       ctx.play();
       ctx.stop();
       ctx.destroy();
     } catch (e) {}
     tt.offTouchStart(unlockAudio);
   };
   tt.onTouchStart(unlockAudio);
   ```

---

## 三、Construct 2 主包 4MB 瘦身实战技巧

1. **剔除双份音频冗余**：
   - C2 原始工程常常同时导出 `.ogg` 与 `.m4a`（例如披萨塔项目中存有 24 首 `.ogg` 与 24 首 `.m4a`）。
   - 抖音小游戏原生对 `.m4a`（AAC 编码）支持极其稳定且解码开销极低。
   - **操作**：直接删除所有 `.ogg` 文件，主包与分包瞬间瘦身 2MB 以上！
2. **三级分包布局**：
   - `images/`：存放所有精灵与图集纹理（配合 `embed-images.js` 补齐 `game.js`）。
   - `media/`：存放所有的 `.m4a` 背景音乐与音效。
   - `data/`：存放 `data.js` 与 `localisation.json`。
   - 主包仅保留引擎代码（`c2runtime.js`、`jquery-2.1.1.min.js`、`spine_webgl.js`）、适配器与主启动文件。
