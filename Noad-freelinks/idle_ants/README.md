# Idle Ants (放置蚂蚁 / 蚂蚁军团) - 网页版无广告试玩链接 (No-Ad Free-Link)

本目录为专用于 **CDN 上传** 和 **Web 浏览器直接运行** 的免广告网页版工程。

---

## 特性说明

1. **全链路广告拦截与秒发奖励**：
   - **PokiSDK (`rewardedBreak` / `commercialBreak`)**：已注入全链路免广告拦截垫片（`noad-bridge.js`），离线收益翻倍、通关奖励乘倍、特殊蚂蚁（极速蚁、机甲蚁、黄金蚁）解锁加速、金币钱袋等点位点击直接秒发奖励！
   - **商业广告跳过**：世界切换及阶段插屏广告自动跳过，保障流畅游玩体验。
   - 触发时屏幕上方展示毛玻璃免广告提示（HUD Toast）：`✨ [免看广告] 奖励已直接发放！`
2. **支持全中文语言界面 (zh)**：
   - 内置完整简体中文本地化字典（升级界面、特殊蚂蚁技能、离线收益、世界关卡等）。
3. **纯相对路径，支持任意静态托管**：
   - 资源完全自包含，无跨域与本地绝对路径硬编码，直接上传至任意对象存储桶或 CDN 即可访问。
4. **原生 Web 兼容性与音效解锁**：
   - 集成首触音频自动解锁（Web Audio Touch Unlocker）。
   - 规避外部 CDN 依赖，纯离线可用。

---

## 本地预览测试

进入当前项目目录，启动静态 Web 服务器：

```bash
# 方式 1: 直接双击运行
双击运行当前目录下的「启动网页试玩.bat」

# 方式 2: 使用 Python 命令行
python serve.py 8091
```

浏览器访问 `http://localhost:8091/index.html` 即可开始试玩。

---

## CDN 部署步骤

1. 将当前文件夹内的所有文件完整上传至 CDN 静态存储桶（如阿里云 OSS、腾讯云 COS、AWS S3、Cloudflare Pages 等）的目标子目录，例如：
   `https://cdn.example.com/games/idle_ants/`
2. 确保存储桶的默认首页设为 `index.html`，且对 `.wasm` 配置 `application/wasm`、对 `.js` 配置 `application/javascript`。
3. 复制生成的链接即可直接分发免广告试玩！
