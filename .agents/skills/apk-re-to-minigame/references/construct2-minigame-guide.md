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
