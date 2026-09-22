# ImpactJS (HTML5 2D Canvas / MarketJS) 抖音小游戏移植与深度避坑指南

## 1. 概述与底层引擎架构识别

**ImpactJS** 是经典的 HTML5 2D 独立游戏引擎（基于 2D Canvas 渲染），在海外商业 HTML5 游戏（特别是 **MarketJS** 定制发行管线与 **Poki / CrazyGames** 等平台）中被极广泛应用。

### 1.1 核心架构特征
- **模块与打包机制**：采用 `ig.module('...').requires('...').defines(function() { ... })` 模块定义树，商业发版时经由 ImpactJS 烘焙器压缩为 `ig.baked = true` 的单个打包文件 `game.js`。
- **大图集打包装配 (`plugins.packer`)**：
  引擎通过 `window['packerplugin']` 挂载纹理清单与 JSON 帧信息（如 `texture-0.png`、`texture-1.png`），内部实体通过 `ig.AnimationSheet` 和切片坐标（`frame: {x, y, w, h}`）提取子贴图进行画布绘制。
- **音频系统**：
  集成 **Howler.js** 或 WebAudio / HTML5 Audio 双轨，由 MarketJS 的 `ig.SoundHandler` 统一调度 `bgmPlayer`（背景音乐）、`miningPlayer`/`ambientPlayer`（环境循环音）与 `sfxPlayer`（音效实例）。
- **商业化 SDK**：
  通常挂载 `PokiSDK` 或 `MarketJSGameCenter`，广告调用高度统一为 `PokiSDK.commercialBreak()`（插屏广告）与 `PokiSDK.rewardedBreak()`（激励视频）。

---

## 2. 移植十大核心痛点与工业级解决方案

### 2.1 痛点 1：白屏或卡在加载界面不动 (Loading Progress 无法达到 100%)
- **现象**：
  启动小游戏后，进度条卡在 0% 或某个百分比不再前进，或直接卡在 Loading 画面无法进入主场景。
- **根因 A：外部品牌图缺失导致 `ig.Loader._unloaded` 永不归零**
  `game.js` 内部静态预载了 `branding/logo.png` 与 `branding/splash1.png`。如果移植时仅拷贝了 `media/` 目录而遗漏了根目录下的 `branding/`，Image 加载失败事件被引擎忽略，`ig.loader._unloaded` 计数永远大于 0，阻塞后续 `ig.system.setDelegate(MyGame)`。
  - **解法**：完整搬运 `branding/` 资源目录并确认 `logo.png`、`splash1.png` 存在。
- **根因 B：`FontFaceObserver` 在无 DOM 环境下轮询超时挂起**
  原版工程通过 `FontFaceObserver` 监听字体就绪。但在小游戏环境下无真实 DOM 元素尺寸变化，`FontFaceObserver` 内部每隔 50ms 轮询 `span` 元素的宽度，导致 3000ms 假死。
  - **解法**：在适配层或启动前重写 `FontFaceObserver.prototype.load`，直接返回立即解决的 `Promise.resolve()`。

---

### 2.2 痛点 2：按钮点击报错 `TypeError: Illegal invocation`
- **现象**：
  进入游戏主菜单后，点击“开始游戏”或“设置”齿轮按钮时控制台爆发红字：
  ```text
  TypeError: Illegal invocation at HTMLCanvasElement.<anonymous> (game.bundle.js:1234)
  ```
- **根因**：
  ImpactJS 在 Web 端将触控事件转换为点击时，包含一段桌面 iframe 焦点恢复代码：`window['focus']()`。在字节跳动小游戏环境（特别是 iOS Helium 与 Android Krypton 宿主），`window.focus` 是原生宿主绑定的只读方法或未绑定上下文的桩方法，以裸函数方式调用直接抛出 V8 原生异常 `Illegal invocation`，直接打断事件冒泡。
- **解法**：
  在打包的 `game.bundle.js` 中全局检索 `window['focus']()` 或 `window.focus()`，将其整体替换为安全无副作用的 `(void 0)`：
  ```javascript
  // 原缺陷代码:
  window['focus']();
  // 替换为:
  (void 0);
  ```

---

### 2.3 痛点 3：真机崩溃 `Maximum call stack size exceeded` 与主循环冻结
- **现象**：
  在手机扫码运行后，控制台在 `Plug in Storage Manager` 阶段突然抛出：
  ```text
  [TMG] RangeError: at setTimeout callback Maximum call stack size exceeded.
  ```
  随后游戏点击毫无反应，整个逻辑冻结。
- **根因 (Howler `_loadQueue` 递归出队时序缺陷)**：
  在游戏初始化 `start()` 时，`ig.soundHandler` 调用了 `bgmPlayer.play()` 和 `muteBGM()`。Howler 内部将未就绪的任务推入 `this._queue`。在 Howler 原版 `_loadQueue(event)` 实现中：
  ```javascript
  // 缺陷源码：在无参分支（!event）时，未先 shift 出队就直接执行了 action()
  _0x4ec02a['event'] === _0x201bd4 && (this['_queue']['shift'](), this['_loadQueue']()),
  _0x201bd4 || _0x4ec02a['action']();
  ```
  如果 `action()` 内部再次触发了音频操作，队头任务依然留在 `_queue[0]`，在同一个同步微任务栈中发生无限递归调用，迅速撑爆 V8 递归栈深（10000+ 帧）而崩溃。
- **解法**：
  将队头任务出队与执行严格解耦，**必须在执行 `action()` 之前先行调用 `this['_queue']['shift']()` 出队**：
  ```javascript
  '_loadQueue': function(_0x201bd4) {
      if (0x0 < this['_queue']['length']) {
          var _0x4ec02a = this['_queue'][0x0];
          if (_0x4ec02a['event'] === _0x201bd4) {
              this['_queue']['shift']();
              this['_loadQueue']();
          } else if (!_0x201bd4) {
              this['_queue']['shift'](); // 必须先从队列移除！
              _0x4ec02a['action']();    // 再执行具体任务
          }
      }
      return this;
  }
  ```

---

### 2.4 痛点 4：Krypton 引擎 WebAudio `setValueAtTime is not a function` 连锁崩溃
- **现象**：
  开启小游戏 iOS/Android 高性能模式（Krypton）时，vConsole 报错：
  ```text
  [TMG] TypeError: _0x3acc96['masterGain']['gain']['setValueAtTime'] is not a function.
  [TMG] TypeError: at setTimeout callback undefined is not an object (evaluating 'ig['soundHandler']['bgmPlayer']['soundList']['background']')
  ```
- **根因**：
  字节跳动 Krypton 引擎注入的桩对象 `AudioContext.createGain()` 返回的 GainNode 缺失标准 W3C AudioParam 方法 `setValueAtTime`。Howler 初始化执行 `masterGain.gain.setValueAtTime` 抛出未捕获异常，导致 `ig.SoundHandler` 构造函数中断退出，`bgmPlayer` 沦为 `null`。随后游戏定时器访问 `bgmPlayer.soundList['background']` 触发连锁空指针崩溃。
- **解法**：
  1. **适配层注入 AudioParam 降级 Polyfill**：
     为 `AudioParam` 补齐 `setValueAtTime`、`linearRampToValueAtTime`，内部直接回退为属性赋值 `this.value = val`。
  2. **SoundHandler 注入双重兜底对象**：
     在 `ig.SoundHandler.init` 尾部校验 `bgmPlayer` 与 `miningPlayer`，若为空则自动挂载具备 `play/stop/volume/mute` 空操作的 Dummy 对象，杜绝 `undefined` 引用。
  3. **移动端统一锁定 InnerAudioContext**：
     在 `game.bundle.js` 中将 Howler 的 `usingWebAudio` 强制置为 `false`，全量音效直接走轻量原生的 `tt.createInnerAudioContext()` 硬件解码。

---

### 2.5 痛点 5：启动后画面冻结 `Game Paused` (主循环被意外挂起)
- **现象**：
  进入游戏后画面定格，点击无反应，vConsole 输出 `Game Paused`。
- **根因**：
  `ig.VisibilityHandler` 内部依赖 `document.visibilityState !== 'visible'` 与 `document.hidden`。若适配层未提供该属性或默认为 `hidden`，ImpactJS 会判定游戏处于后台，立即执行 `ig.system.stopRunLoop()`，停止 `requestAnimationFrame` 驱动，游戏主逻辑完全静止。
- **解法**：
  1. 适配层显式提供前台属性：
     ```javascript
     document.visibilityState = 'visible';
     document.hidden = false;
     document.hasFocus = function() { return true; };
     ```
  2. 桥接 `tt.onShow` 与 `tt.onHide`：
     ```javascript
     tt.onShow(function() {
         document.visibilityState = 'visible';
         document.hidden = false;
         if (ig.game && typeof ig.game.resumeGame === 'function') {
             ig.game.resumeGame();
         }
     });
     tt.onHide(function() {
         document.visibilityState = 'hidden';
         document.hidden = true;
     });
     ```
  3. 在 `game.bundle.js` 的 `pauseGame` 函数入口注入守卫：若 `!document.hidden` 则直接忽略挂起。

---

### 2.6 痛点 6：字体校验报错 `Only lowercased alphanumeric and dash are allowed for font file name!`
- **现象**：
  修改字体注入中文字体回退后，控制台抛出红字：
  ```text
  Only lowercased alphanumeric and dash are allowed for font file name!. Please check the font path
  ```
  导致 `ig.FontLoader` 判定字体非法并中断后续加载。
- **根因**：
  ImpactJS 内部封装有强正则校验方法：
  ```javascript
  _isValidName: function(name) { return -1 == name.search(/^[a-z0-9-\/]+$/) ? false : true; }
  ```
  如果在静态代码中将字体名从 `'luckiest-guy'` 粗暴替换为 `'luckiest-guy, sans-serif'`，包含了逗号与空格，直接触发校验失败。
- **解法 (动态 Canvas 拦截法)**：
  保持静态配置中的字体名称与路径为合法的纯净字符串 `'luckiest-guy'`；将中文字体 fallback 逻辑转移至适配层的 Canvas 2D 上下文：
  ```javascript
  // 拦截 Canvas 上下文 font setter，动态注入高品质中文字系
  var origFontDescriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  if (origFontDescriptor && origFontDescriptor.set) {
      var origSet = origFontDescriptor.set;
      Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
          get: origFontDescriptor.get,
          set: function(val) {
              if (typeof val === 'string' && val.indexOf('luckiest-guy') !== -1 && val.indexOf('sans-serif') === -1) {
                  val = val + ', "Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif';
              }
              return origSet.call(this, val);
          }
      });
  }
  ```
  **优势**：英文/数字保持原版卡通粗体艺术字，中文字符平滑回退至系统清晰黑体，且 100% 绕开引擎静态正则校验！

---

### 2.7 痛点 7：ImpactJS 全量中文化与大图集 (`plugins.packer`) 精确写回
- **文本本地化**：
  ImpactJS 游戏通常在 `game.bundle.js` 头部或独立模块集中定义 `_STRINGS` 字典。直接提取该字典进行规范汉化，注意保护 `{0}`、`{1}` 等变量占位符与转义符。
- **图集贴图重绘 (核心壁垒)**：
  对于“开始按钮 (PLAY)”与“游戏主标题”等直接烘焙在纹理切片中的英文素材，不能仅修改独立 PNG，**必须写回打包大图集 `texture-0.png`**：
  1. 查验 `window['packerplugin']['json']['texture-0']` 中目标素材的 UV 帧坐标（例如 `buttons-play.png` 在 `x: 1184, y: 1944, w: 144, h: 85`；`title.png` 在 `x: 1480, y: 1845, w: 241, h: 188`）；
  2. 使用 Python PIL 重绘与原版风格一致的高清中文贴图（添加 3D 投影与深色外描边）；
  3. 精确粘贴覆写回 `media/graphics/packed/texture-0.png` 对应的 `(x, y)` 区域；
  4. 引擎运行时直接切片即可展示原汁原味的艺术级汉化界面。

---

### 2.8 痛点 8：灵动岛与刘海屏 30px 安全区下移适配
- **现象**：
  在 iPhone 14/15/16 等灵动岛或刘海屏机型上，顶部金币栏、收益数值和设置按钮被黑色药丸胶囊严重遮挡。
- **解法**：
  在 `EntityGameplayUI` 核心类中：
  1. **锚点基准下移 30px**：
     将 `ig.responsive.toAnchor(0, 0, 'top-center')` 调整为 `ig.responsive.toAnchor(0, 30, 'top-center')`。
  2. **一体化沉浸式背景填充**：
     在顶部安全区 `(0, 0, width, 30)` 自动调用 `ctx.fillStyle = '#5393ce'; ctx.fillRect(0, 0, width, y);`，与游戏原生天蓝底色融为一体，不露黑底。
  3. **关联实体与飞行金币坐标同步偏移**：
     - 金币标签、图标、金额文字整体 `y + 30px`；
     - 设置齿轮按钮 `settingBtn` 与滚动按钮 `y + 30px`；
     - 采矿吸纳动效目标点 `getTargetMoney()` 垂直坐标从 `50px` 调整为 `80px`，确保金币准确飞入新的图标正中。

---

### 2.9 痛点 9：移动端 `createWrappedAudio` 真实状态代理
- **现象**：
  若在适配层直接给原生 C++ `InnerAudioContext` 赋值 `audio.readyState = 4`，由于真机底层原生对象不可写或属性丢弃，Howler 会判定音频始终处于未加载就绪状态。
- **解法**：
  必须在适配层使用 **纯 JS 包装对象**（Wrapper Object）代理原生 `InnerAudioContext`：
  ```javascript
  function createWrappedAudio() {
      var inner = tt.createInnerAudioContext();
      var wrapper = {
          readyState: 4, // 强制声明已具备足够数据
          duration: 0,
          currentTime: 0,
          volume: 1,
          loop: false,
          paused: true,
          play: function() { inner.play(); wrapper.paused = false; },
          pause: function() { inner.pause(); wrapper.paused = true; },
          stop: function() { inner.stop(); wrapper.paused = true; }
      };
      // 双向同步原生事件与状态
      inner.onCanplay(function() { wrapper.readyState = 4; dispatchEvent('canplay'); });
      inner.onEnded(function() { wrapper.paused = true; dispatchEvent('ended'); });
      return wrapper;
  }
  ```

---

### 2.10 痛点 10：全域免广告试玩版 (No-Ad Free-Link) 快速复用
- 抖音小游戏调试调优完成后，若商务/发行需要 Web 链接直接预览，可一键输出至 `Noad-freelinks/<game_name>/`。
- 注入 [`noad-bridge.js`](templates/noad-bridge.template.js)，提供：
  1. `file://` 双击防黑屏安全警示；
  2. PokiSDK `rewardedBreak` / `commercialBreak` 拦截并直接 `resolve(true)`；
  3. 屏幕顶部弹出绿色毛玻璃 HUD Toast：`✨【免看广告】激励视频奖励已即刻发放！`；
  4. 首触（Touch/Click）自动唤醒 `AudioContext.resume()`；
  5. 产出 `serve.py` 与 `启动网页试玩.bat`，支持本地与 CDN 零配置秒开。

---

## 3. 标准工程目录与入口组装

### 3.1 抖音小游戏目录树规范
```text
reverse/your_game-tt-minigame/
├── game.js                   # 小游戏唯一启动入口
├── game.json                 # 横竖屏与小游戏配置
├── project.config.json       # 抖音开发者工具工程配置
├── SDKManager.js             # 平台商业化管理器
├── poki-sdk.js               # PokiSDK 转接桥
├── game.bundle.js            # 汉化并加固后的游戏核心代码
├── adapter/
│   └── tt-adapter.js         # ImpactJS 专用适配器 (Canvas/DOM/Audio/Events)
├── branding/                 # 品牌预载素材 (logo.png, splash1.png)
└── media/
    ├── graphics/packed/      # 大图集 (texture-0.png, texture-1.png)
    ├── audio/                # 全格式已转为 .mp3 的音频文件
    └── fonts/                # luckiest-guy.ttf
```

### 3.2 `game.js` 标准启动流水线
```javascript
/**
 * ImpactJS MiniGame Entry Point
 */
console.log('[Game] 抖音小游戏启动中...');

// 1. 初始化平台与运行环境适配层 (必须第一优先加载)
require('./adapter/tt-adapter.js');

// 2. 初始化平台商业化广告管理器
require('./SDKManager.js');

// 3. 初始化 PokiSDK 桥接层
require('./poki-sdk.js');

// 4. 启动游戏逻辑
require('./game.bundle.js');

console.log('[Game] 游戏核心模块加载完成');
```

---

## 4. 4.0 MB 主包瘦身红线速查表

| 资产类别 | 原始状态 | 瘦身方案 | 收益 |
|---|---|---|---|
| **音频音效** | 双份 `.ogg` + `.mp3` | **彻底删除全部 `.ogg` 文件**，代码全局替换扩展名指向 `.mp3` | 节约 675 KB+ |
| **字库字体** | `.svg`, `.eot`, `.woff`, `.woff2`, `.ttf` | **仅保留单份 `.ttf`**，删除其余 4 种 Web 格式 | 节约 600 KB+ |
| **DOM 广告** | 冗余的 PC/Web 原生 DOM Banner 容器 | 在 `index.html` 与代码中清除无用 DOM，广告全走 `SDKManager` | 结构极简 |
| **最终主包** | ~4.5 MB（超标无法上传） | 瘦身后维持在 **2.4 MB ~ 3.1 MB** | **完美符合 $\le 4.0\text{ MB}$ 红线** |
