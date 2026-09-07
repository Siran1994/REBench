# 抖音小游戏双端运行时（Krypton 与 Helium）避坑实战指南

抖音小游戏在 Android 和 iOS 上采用两套完全不同的底层 C++ 渲染引擎：
- **Android 端**：基于 **Krypton** 引擎（结合 Skity 渲染加速）
- **iOS 端**：基于 **Helium** 引擎

二者在 JS 运行环境、浏览器 DOM/BOM 模拟、API 完整性上存在显著差异。以下为已验证的真实踩坑记录与标准解法。

---

## 1. 安卓真机扫码黑屏问题

### 现象
扫码调试时无报错或日志中断，但手机屏幕完全黑屏，无法进入主场景。

### 根因 1：缺失 `window.visualViewport`
- **原因**：Krypton 在初始化屏幕或布局大小时会读取 `window.visualViewport.width`。若未垫片或缺少事件派发能力，后续 C3 渲染管线会中断或视口宽高为 0。
- **解法**：在适配层 `adapter/tt-c3-adapter.js` 全局注入完备的 `visualViewport`：
```javascript
if (typeof window.visualViewport === 'undefined') {
  const listeners = {};
  window.visualViewport = {
    width: info.windowWidth || info.screenWidth,
    height: info.windowHeight || info.screenHeight,
    scale: 1,
    pageLeft: 0,
    pageTop: 0,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    removeEventListener(type, cb) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(f => f !== cb);
    },
    dispatchEvent(evt) {
      const cbs = listeners[evt.type];
      if (cbs) cbs.forEach(f => { try { f(evt); } catch (e) {} });
      return true;
    }
  };
}
```

### 根因 2：硬编码 iPhone UserAgent
- **原因**：历史适配器常直接硬编码 `Mozilla/5.0 (iPhone; CPU iPhone OS...)`，导致 Android Krypton 误走 iOS 原生视口修正分支，坐标和尺寸全部错位。
- **解法**：根据 `tt.getSystemInfoSync().platform` 动态拼接 UA：
```javascript
const platform = (info.platform || '').toLowerCase();
const isAndroid = platform.includes('android');
const baseUa = isAndroid
  ? `Mozilla/5.0 (Linux; Android 10; Mobile; rv:88.0) Gecko/88.0 Firefox/88.0`
  : `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15`;
```

---

## 2. 核心全局垫片缺失

### `atob is not defined`
- **现象**：`ReferenceError: atob is not defined at scripts/c3runtime.js`
- **原因**：Krypton 不包含浏览器内置的 base64 编解码方法 `atob` / `btoa`。
- **解法**：在 `game.js` 与适配层开头挂载纯 JS Base64 解码器，并同步挂载到 `globalThis`、`window`、`self`：
```javascript
const _b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function _polyAtob(input) {
  if (typeof tt !== 'undefined' && tt.base64ToArrayBuffer) {
    try {
      const ab = tt.base64ToArrayBuffer(String(input));
      const u8 = new Uint8Array(ab);
      let s = '', chunk = 8192;
      for (let i = 0; i < u8.length; i += chunk) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
      }
      return s;
    } catch (e) {}
  }
  let str = String(input).replace(/[=]+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & (bs >> (-2 * bc & 6))) : 0) {
    buffer = _b64chars.indexOf(buffer);
  }
  return output;
}
globalThis.atob = window.atob = self.atob = _polyAtob;
```

### `Blob is not defined` / `URL.createObjectURL` 报错
- **现象**：Construct 3 解析二进制模型或图集时报 `Failed to construct 'URL'` 或 `Blob is not defined`。
- **解法**：实现轻量 `MiniBlob` 类（支持 `slice()`, `arrayBuffer()`, `text()`, `stream()`），并在 `URL.createObjectURL` 中将 MiniBlob 直接转换为 Base64 Data-URI。

---

## 3. iOS 重启游戏变竖屏问题

### 现象
在苹果手机端点击右上角“…”菜单选择“重新进入小游戏”后，原横屏游戏画面变成了竖屏显示，布局被压扁。

### 根因
iOS 抖音小游戏宿主在重启实例时，默认以手机当前物理持握姿态初始化窗口，如果未显式锁定方向，视口宽高可能颠倒。

### 解法
1. `game.json` 显式声明：
   ```json
   { "deviceOrientation": "landscape" }
   ```
2. 在 `game.js` 和适配器中监听 `tt.onShow`，强行重设方向：
   ```javascript
   if (tt.setDeviceOrientation) {
     tt.setDeviceOrientation({ value: 'landscape' });
   }
   tt.onShow(() => {
     if (tt.setDeviceOrientation) {
       tt.setDeviceOrientation({ value: 'landscape' });
     }
   });
   ```

---

## 4. 位图字体 0/00 与特殊货币符号错位

### 现象
游戏中卖出矿石或打开建造面板时，原本应显示 `煤矿 x100` 或 `$700`，结果显示为 `00x100` 或单独一个 `0`。

### 根因
- Construct 3 的 `Spritefont2`（位图字体）依赖字符串映射表（如 `"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ..."`）。
- 海外游戏中常将 `£`、`$`、`¢` 作为金币/能量图标直接画在位图字体图集中。
- 若汉化时直接覆盖了字体映射表或图集索引发生了偏移，原货币符号就会落在 `'0'` 或 `' '` 的格子里，导致显示成 `0` 或 `00`。

### 解法
- 检查 `data.json` 中 `Spritefont2` 对象的 `character-set` 字符串。
- 保证原有特殊符号（`£/¥/$/€`）在字符集中的索引位置与美术切图完全一致。
