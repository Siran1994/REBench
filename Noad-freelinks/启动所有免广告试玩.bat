@echo off
chcp 65001 >nul
title 免广告试玩项目总览门户
cd /d "%~dp0"

echo ========================================================
echo   🎮 正在启动免广告试玩项目总览门户...
echo ========================================================

:: 检查 Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 检测到 Python 环境，正在启动本地门户服务...
    start "" http://localhost:8080/index.html
    python serve.py 8080
    pause
    exit /b
)

:: 检查 Node.js / npx
npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 检测到 Node.js 环境，使用 npx serve 启动...
    start "" http://localhost:8080/index.html
    npx -y serve -p 8080 .
    pause
    exit /b
)

echo [提示] 未检测到 Python 或 Node.js 环境。
echo 建议将本文件夹整体上传至任意 CDN / 静态 Web 服务器即可直接在线畅玩！
pause
