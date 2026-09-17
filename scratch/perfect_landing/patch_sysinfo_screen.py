"""
修复 SystemInfo 屏幕尺寸：
loader.js 中 Module.SystemInfo 直接读取 screen.width/screen.height，
在小游戏环境中这些值可能是竖屏方向的。

修复方案：
1. 在 loader 中修改 SystemInfo 初始化，确保 width > height（横屏）
2. 在 framework 中修改 _JS_SystemInfo_GetScreenSize，强制返回横屏尺寸
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ========== Patch loader.js ==========
loader_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\813700ccfaf64a0a3c57e3aa3166490b.loader.js'
with open(loader_path, 'r', encoding='utf-8') as f:
    loader = f.read()

# Fix SystemInfo width/height to ensure landscape
old_sys = 'width:screen.width,height:screen.height'
new_sys = 'width:Math.max(screen.width,screen.height),height:Math.min(screen.width,screen.height)'

if old_sys in loader:
    loader = loader.replace(old_sys, new_sys)
    print("[OK] Patched loader SystemInfo to force landscape screen dimensions")
else:
    print("[WARN] loader SystemInfo pattern not found")

with open(loader_path, 'w', encoding='utf-8') as f:
    f.write(loader)
print("[OK] Saved loader.js")

# ========== Patch framework.js ==========
fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'
with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Fix _JS_SystemInfo_GetScreenSize to force landscape
old_screen = 'function _JS_SystemInfo_GetScreenSize(outWidth,outHeight){HEAPF64[outWidth>>3]=Module.SystemInfo.width;HEAPF64[outHeight>>3]=Module.SystemInfo.height}'
new_screen = 'function _JS_SystemInfo_GetScreenSize(outWidth,outHeight){var sw=Math.max(Module.SystemInfo.width,Module.SystemInfo.height);var sh=Math.min(Module.SystemInfo.width,Module.SystemInfo.height);HEAPF64[outWidth>>3]=sw;HEAPF64[outHeight>>3]=sh}'

if old_screen in fw:
    fw = fw.replace(old_screen, new_screen)
    print("[OK] Patched _JS_SystemInfo_GetScreenSize to force landscape")
else:
    print("[WARN] _JS_SystemInfo_GetScreenSize pattern not found")

# Also fix _JS_SystemInfo_GetCurrentCanvasWidth/Height if they exist
for key in ['_JS_SystemInfo_GetCurrentCanvasWidth', '_JS_SystemInfo_GetCurrentCanvasHeight',
            '_JS_SystemInfo_GetCanvasClientSize']:
    idx = fw.find(key)
    if idx != -1:
        snippet = fw[idx:idx+300]
        snippet = snippet.encode('ascii', 'replace').decode('ascii')
        print(f'\nFound {key}:')
        print(snippet)

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# Validate
import subprocess
for f in [loader_path, fw_path]:
    result = subprocess.run(['node', '-c', f], capture_output=True, text=True)
    name = f.split('\\')[-1][:30]
    print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax: {name}")

# Sync all
import shutil, os
src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'
for rel in ['Build/813700ccfaf64a0a3c57e3aa3166490b.loader.js',
            'Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
