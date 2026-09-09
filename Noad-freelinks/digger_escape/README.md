# Tiny Miners - 网页版无广告试玩链接 (No-Ad Free-Link)

本目录为专用于 **CDN 上传** 和 **Web 浏览器直接运行** 的免广告网页版工程。

---

## 特性说明

1. **全平台广告拦截与免广告直接发奖**：
   - **抖音小游戏 API (`tt.createRewardedVideoAd` / `tt.createInterstitialAd`)**：调用时直接跳过广告，即刻触发 `onClose({ isEnded: true })` 发放奖励。
   - **PokiSDK (`rewardedBreak` / `commercialBreak`)**：直接返回 `true`，自动跳过商业广告。
   - **Cordova AppLovin MAX / AdMob 插件**：直接派发奖励事件 (`OnRewardedAdReceivedRewardEvent`)。
   - 触发时屏幕上方展示美观的毛玻璃免广告提示（Toast）：`✨ [免看广告] 奖励已直接发放！`
2. **纯相对路径，支持任意静态托管**：
   - 资源完全自包含，无跨域与本地绝对路径硬编码，直接拖拽至对象存储桶即可访问。
3. **原生 Web 兼容性**：
   - 自动派发 Cordova `deviceready` 事件，脱离原生 WebView 容器在普通浏览器无感启动。
   - 集成首触音频自动解锁（AudioContext Resume）。

---

## 本地预览测试

进入当前项目目录，启动任意静态 Web 服务器：

```bash
# 方式 1: 使用 Python (推荐)
python -m http.server 8080

# 方式 2: 使用 Node.js npx serve
npx serve .
```

浏览器访问 `http://localhost:8080` 即可开始试玩。

---

## CDN 部署步骤

1. 将当前文件夹内的所有文件完整上传至 CDN 静态存储桶（如阿里云 OSS、腾讯云 COS、AWS S3、Cloudflare Pages 等）的目标子目录，例如：
   `https://cdn.example.com/games/mine_line/`
2. 确保存储桶的默认首页设为 `index.html`，并开启 gzip / brotli 压缩。
3. 复制生成的链接即可直接分发试玩！
