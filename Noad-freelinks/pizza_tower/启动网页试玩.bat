@echo off
chcp 65001 >nul
title 启动免广告网页试玩版 - Pizza Tower
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
