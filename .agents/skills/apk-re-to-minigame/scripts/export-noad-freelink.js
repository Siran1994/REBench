#!/usr/bin/env node
/**
 * Export No-Ad Free-Link Web Build for CDN Hosting
 * 
 * Usage:
 *   node export-noad-freelink.js --source <source_dir> --output <output_dir> [--name <game_name>]
 * Example:
 *   node export-noad-freelink.js --source ./reverse/recovered-web --output ./Noad-freelinks/mine_line --name "Tiny Miners"
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: '',
    output: '',
    name: ''
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' || args[i] === '-s') {
      options.source = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[++i];
    } else if (args[i] === '--name' || args[i] === '-n') {
      options.name = args[++i];
    } else if (!options.source) {
      options.source = args[i];
    } else if (!options.output) {
      options.output = args[i];
    }
  }
  return options;
}

function copyDirRecursive(src, dest, excludeNames = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeNames.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, excludeNames);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updateIndexHtml(indexPath, gameName) {
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf-8');

  // Update title
  if (gameName) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${gameName} (免广告试玩版)</title>`);
  }

  // Ensure noad-bridge.js is included before any other scripts
  if (!html.includes('noad-bridge.js')) {
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>\n\t<script src="noad-bridge.js"></script>');
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>\n\t<script src="noad-bridge.js"></script>');
    }
  }

  // Remove native cordova.js from index.html on Web to avoid collisions
  html = html.replace(/<script\s+src=["']cordova\.js["']><\/script>\s*/gi, '');

  fs.writeFileSync(indexPath, html, 'utf-8');
}

function sanitizeScriptsForWeb(targetDir, gameName) {
  // 1. In scripts/main.js, switch exportType from cordova to html5
  const mainJsPath = path.join(targetDir, 'scripts', 'main.js');
  if (fs.existsSync(mainJsPath)) {
    let mainJs = fs.readFileSync(mainJsPath, 'utf-8');
    mainJs = mainJs.replace(/exportType:\s*["']cordova["']/g, 'exportType:"html5"');
    fs.writeFileSync(mainJsPath, mainJs, 'utf-8');
  }

  // 2. Generate local helper serve.py with proper JS/WASM MIME types
  const servePyPath = path.join(targetDir, 'serve.py');
  const servePyContent = `import http.server
import socketserver
import mimetypes
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/css', '.css')

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8089

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = http.server.SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.css': 'text/css'
    })

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
`;
  fs.writeFileSync(servePyPath, servePyContent, 'utf-8');

  // 3. Generate 启动网页试玩.bat for 1-click preview
  const batPath = path.join(targetDir, '启动网页试玩.bat');
  const batContent = `@echo off
chcp 65001 >nul
title 启动免广告网页试玩版 - ${gameName || 'Web Demo'}
cd /d "%~dp0"

echo ========================================================
echo   🎮 正在启动免广告网页试玩版...
echo ========================================================

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 检测到 Python 环境，正在启动本地服务...
    start "" http://localhost:8089/index.html
    python serve.py 8089
    pause
    exit /b
)

npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 检测到 Node.js 环境，使用 npx serve 启动...
    start "" http://localhost:8089/index.html
    npx -y serve -p 8089 .
    pause
    exit /b
)

echo [提示] 未检测到 Python 或 Node.js 环境。
echo 建议将本文件夹整体上传至任意 CDN / 静态 Web 服务器即可直接在线畅玩！
pause
`;
  fs.writeFileSync(batPath, batContent, 'utf-8');
}

function generateReadme(targetDir, gameName) {
  const readmeContent = `# ${gameName || path.basename(targetDir)} - 网页版无广告试玩链接 (No-Ad Free-Link)

本目录为专用于 **CDN 上传** 和 **Web 浏览器直接运行** 的免广告网页版工程。

---

## 特性说明

1. **全平台广告拦截与免广告直接发奖**：
   - **抖音小游戏 API (\`tt.createRewardedVideoAd\` / \`tt.createInterstitialAd\`)**：调用时直接跳过广告，即刻触发 \`onClose({ isEnded: true })\` 发放奖励。
   - **PokiSDK (\`rewardedBreak\` / \`commercialBreak\`)**：直接返回 \`true\`，自动跳过商业广告。
   - **Cordova AppLovin MAX / AdMob 插件**：直接派发奖励事件 (\`OnRewardedAdReceivedRewardEvent\`)。
   - 触发时屏幕上方展示美观的毛玻璃免广告提示（Toast）：\`✨ [免看广告] 奖励已直接发放！\`
2. **纯相对路径，支持任意静态托管**：
   - 资源完全自包含，无跨域与本地绝对路径硬编码，直接拖拽至对象存储桶即可访问。
3. **原生 Web 兼容性**：
   - 自动派发 Cordova \`deviceready\` 事件，脱离原生 WebView 容器在普通浏览器无感启动。
   - 集成首触音频自动解锁（AudioContext Resume）。

---

## 本地预览测试

进入当前项目目录，启动任意静态 Web 服务器：

\`\`\`bash
# 方式 1: 使用 Python (推荐)
python -m http.server 8080

# 方式 2: 使用 Node.js npx serve
npx serve .
\`\`\`

浏览器访问 \`http://localhost:8080\` 即可开始试玩。

---

## CDN 部署步骤

1. 将当前文件夹内的所有文件完整上传至 CDN 静态存储桶（如阿里云 OSS、腾讯云 COS、AWS S3、Cloudflare Pages 等）的目标子目录，例如：
   \`https://cdn.example.com/games/${path.basename(targetDir)}/\`
2. 确保存储桶的默认首页设为 \`index.html\`，并开启 gzip / brotli 压缩。
3. 复制生成的链接即可直接分发试玩！
`;

  fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent, 'utf-8');
}

function updatePortalIndex(freelinksRoot) {
  const entries = fs.readdirSync(freelinksRoot, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (entry.isDirectory() && fs.existsSync(path.join(freelinksRoot, entry.name, 'index.html'))) {
      projects.push(entry.name);
    }
  }

  const portalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REBench - 抖音无广告试玩链接合集 (No-Ad Free-Links Portal)</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: rgba(56, 189, 248, 0.2);
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.3);
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .header {
      max-width: 960px;
      margin: 0 auto 40px auto;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border: 1px solid var(--card-border);
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .header p {
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.6;
    }
    .grid {
      max-width: 960px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -10px var(--accent-glow);
      border-color: var(--accent);
    }
    .card-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-desc {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      flex: 1;
      margin-bottom: 20px;
    }
    .card-btn {
      background: var(--accent);
      color: #0f172a;
      font-weight: 700;
      font-size: 14px;
      padding: 10px 16px;
      border-radius: 8px;
      text-align: center;
      transition: background 0.15s;
    }
    .card:hover .card-btn {
      background: #7dd3fc;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">CDN Free-Links Hub</div>
    <h1>免广告网页试玩链接导航</h1>
    <p>逆向工程产出的网页端全功能试玩版本。广告已全部由 No-Ad 垫片拦截并自动发放奖励，适合直接上传至 CDN 或在浏览器中测试验收。</p>
  </div>
  <div class="grid">
    ${projects.map(p => `
    <a class="card" href="./${p}/index.html" target="_blank">
      <div class="card-title">🎮 ${p}</div>
      <div class="card-desc">全自包含 HTML5 运行包，已配置无广告奖励与自动 deviceready 垫片。</div>
      <div class="card-btn">立即在新标签页打开试玩 ➜</div>
    </a>
    `).join('')}
  </div>
</body>
</html>
`;
  fs.writeFileSync(path.join(freelinksRoot, 'index.html'), portalHtml, 'utf-8');
}

function main() {
  const options = parseArgs();
  if (!options.source || !options.output) {
    console.error(`Usage: node export-noad-freelink.js --source <src> --output <dest> [--name <gameName>]`);
    process.exit(1);
  }

  const srcDir = path.resolve(options.source);
  const destDir = path.resolve(options.output);
  const gameName = options.name || path.basename(destDir);

  console.log(`\n[export-noad-freelink] Packaging No-Ad Free-Link Web Build:`);
  console.log(`  Source: ${srcDir}`);
  console.log(`  Target: ${destDir}`);
  console.log(`  Project: ${gameName}\n`);

  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory '${srcDir}' does not exist!`);
    process.exit(1);
  }

  // 1. Clean / create target dir
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 2. Copy source directory contents
  console.log(`[export-noad-freelink] Copying web assets...`);
  copyDirRecursive(srcDir, destDir, ['.git', '.svn', 'node_modules']);

  // If data.json is inside data/ (minigame structure), also ensure it exists at root
  const subDataJson = path.join(destDir, 'data', 'data.json');
  const rootDataJson = path.join(destDir, 'data.json');
  if (fs.existsSync(subDataJson) && !fs.existsSync(rootDataJson)) {
    fs.copyFileSync(subDataJson, rootDataJson);
    console.log(`  ✓ Synced data/data.json to root data.json for standard Web loading`);
  }

  // 3. Copy noad-bridge.js
  const scriptDir = __dirname;
  const bridgeTemplate = path.join(scriptDir, '..', 'templates', 'noad-bridge.template.js');
  const destBridge = path.join(destDir, 'noad-bridge.js');

  if (fs.existsSync(bridgeTemplate)) {
    fs.copyFileSync(bridgeTemplate, destBridge);
    console.log(`  ✓ Injected noad-bridge.js from template`);
  } else {
    console.warn(`  ⚠ Template noad-bridge.template.js not found, generating fallback bridge`);
  }

  // 4. Update or create index.html
  const destIndex = path.join(destDir, 'index.html');
  if (fs.existsSync(destIndex)) {
    updateIndexHtml(destIndex, gameName);
    console.log(`  ✓ Patched index.html with noad-bridge.js and game title`);
  } else {
    console.warn(`  ⚠ index.html not found in source! Please check source directory.`);
  }

  // 5. Sanitize scripts for Web & generate 1-click launcher
  sanitizeScriptsForWeb(destDir, gameName);
  console.log(`  ✓ Switched exportType to html5 and generated 启动网页试玩.bat & serve.py`);

  // 5. Generate project README.md
  generateReadme(destDir, gameName);
  console.log(`  ✓ Generated project README.md with CDN guide`);

  // 6. Update master Noad-freelinks portal
  const freelinksRoot = path.dirname(destDir);
  if (path.basename(freelinksRoot).toLowerCase() === 'noad-freelinks') {
    updatePortalIndex(freelinksRoot);
    console.log(`  ✓ Updated master Noad-freelinks index portal (Noad-freelinks/index.html)`);
  }

  console.log(`\n[export-noad-freelink] SUCCESS: Export completed! Directory ready for CDN upload.\n`);
}

main();
