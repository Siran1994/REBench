# Construct 3 工程结构、逻辑解码与字体汉化指南

## 1. Construct 3 `data.json` 数据结构解析

Construct 3 打包发布后，工程核心数据序列化在 `data.json` 中。
在混淆/压缩版本中，`data["project"]` 是一个定长数组：

| 数组下标 | 对应内容 | 说明 |
|---|---|---|
| `project[0]` | 项目名称 (`name`) | 字符串，如 `"Digger escape"` |
| `project[1]` | 初始 Layout 名称 | 字符串，如 `"loader"` |
| `project[2]` | 插件与行为定义表 | `[0]` 为插件列表，`[1]` 为 Behavior 列表 |
| `project[3]` | 对象类型表 (`objectTypes`) | 包含所有精灵、Tilemap、文本等对象 |
| `project[4]` | 族定义表 (`families`) | 包含对象的分组族定义 |
| `project[5]` | 场景布局表 (`layouts`) | 包含各场景（如 `game`, `menu`）图层与实例数据 |
| `project[6]` | 事件表 (`eventSheets`) | 包含所有游戏逻辑节点与事件块 |
| `project[7]` | 音频资源清单 (`media/`) | 游戏内引用的音频文件名列表 |
| `project[29]` | 嵌入字体清单 (`fonts/`) | 游戏内引用的 `.otf` / `.ttf` 文件列表 |

---

## 2. 文本提取与中文字体裁剪 (Font Subsetting)

若要在小游戏中支持中文字体，直接引入 10MB+ 的完整 `zh.ttf` 会直接撑爆小游戏包体上限。必须执行**字模裁剪**：

### 步骤 1：全量提取游戏用字
从 `data.json`、多语言 JSON（如 `en.json`, `ru.json`）、事件表文本中提取所有可能出现的中文和符号：
```javascript
// 提取字符脚本逻辑
const seenChars = new Set();
// 遍历所有文本对象默认字符串与配置表
function collect(str) {
  for (const char of String(str)) seenChars.add(char);
}
// 生成 safe_font.txt
```

### 步骤 2：使用 Fontmin 裁剪字库
使用工具（如 `fontmin` 或在线裁剪工具）基于 `safe_font.txt` 裁剪 `zh.ttf`，裁剪后的体积通常仅需 **100KB ~ 500KB**，可安全放入包体。

---

## 3. 海外广告与第三方 SDK 改造为抖音小游戏接口

C3 海外游戏中常见插件：
- `EMI_INDO_AppLovin_Ads`（AppLovin 激励广告）
- `CV_FirebaseAnalytics`（Firebase 统计）
- Google AdMob / Unity Ads

### 适配解法：构建统一 `PlatformManager.js`
不要直接删改事件表中的广告逻辑，而是通过适配垫片拦截海外插件方法，转发到抖音官方广告组件：
```javascript
// PlatformManager.js
const PlatformManager = {
  showRewardVideo(onSuccess, onFail) {
    if (typeof tt === 'undefined' || !tt.createRewardedVideoAd) {
      if (onSuccess) onSuccess(); // 本地或开发模式默认成功
      return;
    }
    const videoAd = tt.createRewardedVideoAd({
      adUnitId: 'YOUR_AD_UNIT_ID'
    });
    videoAd.show()
      .then(() => {})
      .catch(() => videoAd.load().then(() => videoAd.show()));
    videoAd.onClose((res) => {
      if (res && res.isEnded) {
        if (onSuccess) onSuccess();
      } else {
        if (onFail) onFail();
      }
    });
  }
};
module.exports = PlatformManager;
```

---

## 4. 中文字体动态加载、别名映射与渲染避坑

在将海外 Construct 3 游戏汉化为小游戏时，若直接修改工程中每个 Text 插件的字体名称，需要逆向改写大量的布局实例和事件表，极易破坏原有排版或遗漏。最佳实践是**全局别名映射（Font Alias Mapping）与渲染拦截**：

### 1. 字体别名映射加载（`game.js`）
利用 `tt.loadFontFace`，将**中文字体文件**同时注册给中文字体名以及**原游戏的所有外文字体名**（如 `"Rounds Black"`、`"Impact"` 等）：
```javascript
if (typeof tt !== 'undefined' && tt.loadFontFace) {
  // 1. 注册标准中文字体名
  tt.loadFontFace({
    family: 'Lenovo-XiaoxinHeiGB',
    source: 'url("fonts/font.ttf")',
    success: () => console.log('[Font] Chinese font loaded'),
    fail: (e) => console.warn('[Font] Load fail:', e)
  });
  // 2. 核心大招：将原游戏使用的英文字体别名重定向到该中文字体
  tt.loadFontFace({
    family: 'Rounds Black', // 原游戏Text对象使用的字体名
    source: 'url("fonts/font.ttf")', // 直接指向中文字体文件
    success: () => console.log('[Font] Alias "Rounds Black" -> font.ttf mapped'),
    fail: (e) => console.warn('[Font] Alias fail:', e)
  });
}
```
> [!TIP]
> 这样做之后，即使工程中几百个 Text 实例依然保留原先的字体名称 `"Rounds Black"`，小游戏也会自动渲染为包含中文的 `font.ttf`，实现零成本全量应用！

### 2. Android Krypton 原生 Canvas 字体渲染拦截（`tt-c3-adapter.js`）
Android 端基于 Krypton（Skia）原生 Canvas 渲染，其存在两个致命坑点：
- **仅支持 `px` 单位**：若设置形如 `36pt`，Skia 解析失败并静默降级为 10px 默认字体，导致高分屏上文字极小。
- **不支持字体名带引号**：如 `"Rounds Black"` 会被直接忽略。

**适配层拦截方案**：
在适配层中劫持 Canvas2D 上下文的 `font` setter：
```javascript
const origFontDesc = Object.getOwnPropertyDescriptor(ctx, 'font') || 
                     Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'font');
Object.defineProperty(ctx, 'font', {
  get() { return this._fontString || '10px sans-serif'; },
  set(val) {
    let s = String(val || '');
    // 1. 将 pt 转为 px (1pt = 1.333px)
    s = s.replace(/(\d+(?:\.\d+)?)pt\b/gi, (_, pt) => Math.round(parseFloat(pt) * 4 / 3) + 'px');
    // 2. 去掉字体族名称前后的双引号和单引号
    s = s.replace(/["']/g, '');
    // 3. 自动将原字体名重定向到中文字体名
    s = s.replace(/\bRounds Black\b/gi, 'Lenovo-XiaoxinHeiGB');
    this._fontString = s;
    if (origFontDesc && origFontDesc.set) {
      origFontDesc.set.call(this, s);
    }
  },
  configurable: true,
  enumerable: true
});
```

### 3. 主包瘦身：剔除旧外文字体
原游戏中自带的无用英文字体（通常在 `fonts/` 目录下，几百 KB 到几 MB）必须从包体中彻底删除，仅保留裁剪后的 `font.ttf`，并在 `game.json` 的 `subPackages` 中将 `fonts/` 声明为独立分包。

---

## 5. 游戏全量汉化与美术字替换三大工程路径

Construct 3 游戏的文字分布在三个不同层级，必须针对性拆解汉化：

### 路径 1：`data.json` 静态文本与初始变量
- **位置**：`project[3]`（对象类型定义中的默认文本）与 `project[5]`（各 Layout 场景中摆放的 Text 实例）；
- **汉化方法**：编写 Python 脚本遍历 `data.json`，搜索英文字符串（如 `"LEVEL "`、`"BEST SCORE"`、`"TAP TO PLAY"`），将其翻译为对应的中文，并同步微调文字框的宽高（中文由于字形宽度通常需要适当调整实例尺寸）。

### 路径 2：`scripts/c3runtime.js` / `main.js` 动态拼接文本与事件动作
- **位置**：C3 事件表中通过动作 `SetText` 动态拼装的文字，例如关卡生成逻辑：
  ```javascript
  // 原代码:
  "关卡: " + e.GetVariableValue() // 原为 "LEVEL " + e.GetVariableValue()
  ```
- **汉化方法**：全文正则搜索游戏内的固定短语与拼接词，直接就地修改字符串字面量。

### 路径 3：图集美术字（Texture Atlas Words）替换方案
海外游戏常将关卡结算评价（如 `"YES!"`、`"GREAT!"`、`"AWESOME!"`、`"GAME OVER"`）作为 Sprite 精灵打包在 `images/sheet0.png` 图集中，并非 Text 文本插件。

针对此类美术字，推荐以下两种工程解法：

#### 解法 A：图集重打包（Texture Atlas Repacking）
1. 定位 `data.json` 中该 Sprite 对应的帧切片 UV 坐标（如 `[x, y, w, h]`）；
2. 制作相同尺寸的中文美术字切片（如“太棒了!”）；
3. **特别注意旋转状态**：C3 纹理打包器（Sprite Sheet Packer）常会对切片进行 90 度旋转存储以优化打包率。如果原图集中的切片是逆时针旋转 90 度的，替换的美术字切片也必须在相同方向旋转后贴入图集，否则在游戏中显示会倾倒 90 度！

#### 解法 B：运行时离屏 Canvas 动态字生成与注入（推荐）
若美术字替换不希望破坏已有大图集，可以通过代码拦截该 Sprite 的动画帧纹理：
1. 拦截该对象的 `GetTexture()` 或动画加载点；
2. 动态创建一个离屏 Canvas（如 256 × 128），使用 `font.ttf` 调用 `ctx.strokeText()` 绘制黑色描边，再调用 `ctx.fillText()` 绘制黄色或白色填充；
3. 将该离屏 Canvas 转换（或包装）为纹理送入 WebGL 渲染管线，实现清晰、矢量平滑且自带描边的中文字效。

### 文本描边 (Stroke/Outline) 踩坑防雷指南
- Construct 3 Text 插件支持 BBCode（如 `[outline=black]文字[/outline]`），但在某些压缩 runtime 版本或非标准 WebGL 着色器下，BBCode 解析可能导致文字主体与描边全部变为全黑块！
- **避坑建议**：
  1. 优先使用 C3 原生 Text 对象的 `Outline` 属性（设置 `outlineColor` 与 `outlineWidth`）；
  2. 或在图集/离屏 Canvas 绘制阶段通过 Canvas2D `strokeText` 预先栅格化好描边，稳定性最佳。

