"""
修复方向检测：
1. framework.js: 修改 JS_ScreenOrientation_eventHandler 确保始终报告横屏 (width > height)
2. adapter: 使用 Object.defineProperty 覆盖 window.innerWidth/innerHeight getter
"""

fw_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\Build\0b14ddffb6d6867f4577189187985cab.framework.js'

with open(fw_path, 'r', encoding='utf-8') as f:
    fw = f.read()

# Patch JS_ScreenOrientation_eventHandler to force landscape
old_handler = 'function JS_ScreenOrientation_eventHandler(){if(JS_ScreenOrientation_callback)dynCall_viii(JS_ScreenOrientation_callback,window.innerWidth,window.innerHeight,screen.orientation?screen.orientation.angle:window.orientation)}'

new_handler = 'function JS_ScreenOrientation_eventHandler(){if(JS_ScreenOrientation_callback){var w=window.innerWidth||screen.width||1280;var h=window.innerHeight||screen.height||720;var sw=Math.max(w,h);var sh=Math.min(w,h);var angle=screen.orientation?screen.orientation.angle:(window.orientation||90);if(angle===0||angle===180){angle=90}dynCall_viii(JS_ScreenOrientation_callback,sw,sh,angle)}}'

if old_handler in fw:
    fw = fw.replace(old_handler, new_handler)
    print("[OK] Patched JS_ScreenOrientation_eventHandler to force landscape")
else:
    print("[WARN] JS_ScreenOrientation_eventHandler pattern not found")

with open(fw_path, 'w', encoding='utf-8') as f:
    f.write(fw)
print("[OK] Saved framework.js")

# ===== Patch adapter: use Object.defineProperty for innerWidth/innerHeight =====
adapter_path = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame\adapter\tt-unity-adapter.js'

with open(adapter_path, 'r', encoding='utf-8') as f:
    adapter = f.read()

# Find and replace the updateScreenDimensions function to use defineProperty
old_update = """  function updateScreenDimensions(w, h) {
    screenWidth = Math.max(w, h);
    screenHeight = Math.min(w, h);
    root.innerWidth = screenWidth;
    root.innerHeight = screenHeight;
    root.orientation = 90;
    if (typeof window !== 'undefined') {
      window.orientation = 90;
      window.innerWidth = screenWidth;
      window.innerHeight = screenHeight;
    }"""

new_update = """  function forceProperty(obj, prop, val) {
    try {
      Object.defineProperty(obj, prop, { value: val, writable: true, configurable: true });
    } catch (e) {
      try { obj[prop] = val; } catch (e2) {}
    }
  }
  function updateScreenDimensions(w, h) {
    screenWidth = Math.max(w, h);
    screenHeight = Math.min(w, h);
    forceProperty(root, 'innerWidth', screenWidth);
    forceProperty(root, 'innerHeight', screenHeight);
    forceProperty(root, 'orientation', 90);
    if (typeof window !== 'undefined') {
      forceProperty(window, 'orientation', 90);
      forceProperty(window, 'innerWidth', screenWidth);
      forceProperty(window, 'innerHeight', screenHeight);
    }"""

if old_update in adapter:
    adapter = adapter.replace(old_update, new_update)
    print("[OK] Patched updateScreenDimensions with Object.defineProperty")
else:
    print("[WARN] updateScreenDimensions pattern not found")

# Also patch the initial assignment of innerWidth/innerHeight (before updateScreenDimensions is defined)
# Find initial assignments
old_init = """  root.innerWidth = screenWidth;
  root.innerHeight = screenHeight;"""

# Check if it exists
if old_init in adapter:
    # Find where it is and check context
    idx = adapter.find(old_init)
    context = adapter[max(0,idx-100):idx+200]
    print(f"Found initial assignment. Checking if forceProperty is available...")
    # The forceProperty function is defined inside updateScreenDimensions now
    # We need to move it before the initial assignment or duplicate it
    # Let's add an inline version for the initial assignments
    new_init = """  try { Object.defineProperty(root, 'innerWidth', { value: screenWidth, writable: true, configurable: true }); } catch(e) { root.innerWidth = screenWidth; }
  try { Object.defineProperty(root, 'innerHeight', { value: screenHeight, writable: true, configurable: true }); } catch(e) { root.innerHeight = screenHeight; }"""
    adapter = adapter.replace(old_init, new_init, 1)
    print("[OK] Patched initial innerWidth/innerHeight with defineProperty")

with open(adapter_path, 'w', encoding='utf-8') as f:
    f.write(adapter)
print("[OK] Saved tt-unity-adapter.js")

# Validate
import subprocess
for f in [fw_path, adapter_path]:
    result = subprocess.run(['node', '-c', f], capture_output=True, text=True)
    name = f.split('\\')[-1][:30]
    print(f"[{'OK' if result.returncode == 0 else 'ERROR'}] Syntax check: {name}")

# Sync
import shutil, os
src_dir = r'd:\Desktop\REBench\reverse\perfect-landing-tt-minigame'
dst_dir = r'C:\Users\CY\AppData\Roaming\@byted\vela\public\39d25f777ddd34fdc8e44da354dc32a85f406a57\app-dist'
for rel in ['adapter/tt-unity-adapter.js', 'Build/0b14ddffb6d6867f4577189187985cab.framework.js']:
    s = os.path.join(src_dir, rel)
    d = os.path.join(dst_dir, rel)
    if os.path.exists(s) and os.path.exists(os.path.dirname(d)):
        shutil.copy2(s, d)
        print(f'[SYNC] {rel} -> app-dist')
