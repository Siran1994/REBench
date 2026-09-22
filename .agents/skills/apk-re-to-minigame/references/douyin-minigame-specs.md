# 抖音小游戏规范、分包限制与编译器兼容手册

## 1. 包体大小与架构规范

| 指标项 | 官方规范限制 | 推荐安全红线 | 优化手段 |
|---|---|---|---|
| **主包大小 (Main Package)** | **<= 4.0 MB** (超额直接拒绝上传) | **<= 3.0 MB** | 图集转移至分包、音频全外置、清理无用 JS 插件 |
| **单个分包大小** | <= 20.0 MB | <= 15.0 MB | 按模块拆分（如 images/, media/, data/） |
| **整体工程总大小** | <= 30.0 MB (含所有分包) | <= 25.0 MB | 音频高压缩比编码（如 64kbps m4a/mp3） |

### 分包配置两大平台级红线陷阱

1. **字段名必须为严格大写驼峰 `subPackages`**：
   抖音小游戏官方规范中，分包声明字段必须为严格驼峰命名 **`subPackages`**（大写的 `P`）。若误写为全小写 `subpackages`，抖音开发者工具打包编译器无法识别分包配置，会将所有文件当作“无分包的主包”全量打包，导致计算体积暴增（如 9.7MB+）并拒绝上传！建议在 `game.json` 中配置大写驼峰 `subPackages` 并可同时兼备 `subpackages` 做兼容。

2. **Windows 环境下 `root` 字段严禁带尾斜杠**：
   若在 `game.json` 的 `subPackages` 中将 root 声明为 `"wasm_pkg/"`（带尾斜杠），在 Windows 操作系统中反斜杠路径匹配会失效，IDE 会误将分包（如 8.65MB 的 WASM）全部计入主包，导致报错“主包大小为 9.x MB 超过 4MB”。
   **铁律**：`root` 字段统一去掉尾部斜杠，声明为标准的 `"wasm_pkg"` 或 `"images"`！

### 分包根目录核心铁律：必须存在 `game.js`
抖音开发者工具编译器要求：每个在 `game.json` 的 `subPackages` 中声明的分包目录，其**根路径下必须包含 `game.js`**：
```text
game.json ["subPackages"][0]["root"] 'images/' should have game.js
```
**解法**：在每个分包目录下创建空的出口文件：
```javascript
// images/game.js
module.exports = {};
```

---

## 2. 预加载时序架构

在 `game.js` 启动主流程前，使用 `tt.loadSubpackage` 异步加载所有分包：
```javascript
Promise.all([
  loadSubpackage('images'),
  loadSubpackage('media'),
  loadSubpackage('data')
]).then(() => {
  // 分包就绪，触发 deviceready 启动 C3 Runtime
  triggerDeviceReady();
});
```

---

## 3. 常见编译错误与语法冲突修复

### 1. SWC 编译器保留字报错 (`Expression expected`)
- **错误信息**：
  ```text
  Module parse failed: JavaScript parsing error: Expression expected
  _inherits(switch, _self_ISpriteInstance);
  function switch() { ... }
  ```
- **原因**：Construct 3 导出的第三方插件或混淆代码中使用了 JS 保留字（如 `switch`）作为类名或函数名，抖音开发者工具内建的 `swc-loader` 无法通过。
- **解法**：在脚本（如 `objRefTable.js`）中将 `switch` 替换为合法标识符（如 `_switch` 或 `SwitchObject`）。

### 2. 私有类属性报错 (`Unexpected character '#'`)
- **错误信息**：
  ```text
  SyntaxError: scripts/modernjscheck.js: Unexpected character '#' (1:54)
  new class{#p="pass";getProp(){return this.#p}}
  ```
- **原因**：`modernjscheck.js` 试图用 `#` 私有字段探测环境现代 JS 支持，在部分转译器或低版本内核中抛错。
- **解法**：直接绕过该探测，注入标志：
  ```javascript
  window["C3_ModernJSSupport_OK"] = true;
  window["C3_IsSupported"] = true;
  ```

### 3. Unicode 正则表达式报错
- **错误信息**：
  ```text
  SyntaxError: Invalid regular expression: /\p{P}(?<=[\u3000-\u303F\uFF00-\uFFEF])/: Invalid property name
  ```
- **原因**：Krypton JS 引擎不完整支持 `\p{P}` 等 Unicode 字符属性。
- **解法**：在 `c3runtime.js` 中将该正则表达式包裹在 `try...catch` 中或退化为常规标点范围匹配。
