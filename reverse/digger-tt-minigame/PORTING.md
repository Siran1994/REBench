# Construct 3 转抖音小游戏移植说明 (Digger Escape)

## 1. 工程概述
- **原游戏名称**：Digger Escape (1.1.9)
- **底层引擎**：Construct 3
- **封装形式**：Cordova (Android)
- **适配目标**：抖音小游戏（ByteDance MiniGame，Native 模式，横屏 landscape）

## 2. 核心架构与适配层
- **适配器路径**：`adapter/tt-c3-adapter.js`
  - 提供 `window`, `document`, `navigator` 轻量环境垫片
  - 接入 `tt.createCanvas()` 主画面渲染与全屏尺寸同步
  - 映射 `tt.onTouchStart / Move / End / Cancel` 到 Touch 与 Pointer 事件
  - 提供 `MessageChannel` 与 `JobSchedulerDOM` / Worker 主线程模拟
  - 提供 `AudioContext` 垫片防止缺少 Web Audio API 时抛错
  - 提供本地存储 `localStorage` 到 `tt.getStorageSync/setStorageSync` 映射
  - 提供 `fetch` 本地文件系统读取垫片（读取 `data.json` 等配置）
- **启动入口**：`game.js`
  - 安装适配层，配置 C3 环境支持标志
  - 加载 `scripts/main.js`，自动派发 `deviceready` 生命周期事件
- **小游戏配置**：
  - `game.json`：配置横屏 `"deviceOrientation": "landscape"` 及 `images/`、`media/` 资源分包
  - `project.config.json`：抖音开发者工具工程配置文件

## 3. 已应用的已知兼容性修复
1. **保留字语法冲突修复**：
   - 在 `scripts/objRefTable.js` 中将 `switch: class extends ...` 命名为 `switch: class SwitchObject extends ...`，避免 SWC 转译器将保留字 `switch` 解析为函数声明报错。
2. **分包入口规范**：
   - 抖音小游戏规范要求每个分包根目录必须包含 `game.js` 入口文件，已在 `images/game.js` 和 `media/game.js` 中补齐。
3. **Navigator 只读属性容错**：
   - 适配层中对 `navigator.userAgent` 使用安全写入与 try-catch 保护，避免在 Helium 原生环境下触发只读属性写入异常。

## 4. 导入与运行方式
1. 打开**抖音开发者工具**（ByteDance DevTools）。
2. 点击 **导入项目**。
3. 项目目录选择本目录：`d:\Desktop\REBench\reverse\digger-tt-minigame`。
4. AppID 可以填测试 AppID 或开发者自己的小游戏 AppID（默认为 `tta1c7d77a3fa41b5807`）。
5. 编译运行即可在模拟器中看到启动画面并进行真机调试。
