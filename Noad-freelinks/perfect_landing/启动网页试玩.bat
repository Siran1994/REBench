@echo off
chcp 65001 >nul
title 启动 Perfect Landing 免广告试玩服务
cd /d "%~dp0"
echo ========================================================
echo   正在启动 Perfect Landing 免广告试玩本地服务器...
echo ========================================================
python serve.py
pause
