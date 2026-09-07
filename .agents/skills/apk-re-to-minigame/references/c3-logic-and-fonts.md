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
