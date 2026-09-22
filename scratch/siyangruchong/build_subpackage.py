import os
import gzip
import brotli
import shutil

print("[1/5] Creating directories...")
minigame_dir = "reverse/siyangruchong-tt-minigame"
wasm_pkg_dir = os.path.join(minigame_dir, "wasm_pkg")
adapter_dir = os.path.join(minigame_dir, "adapter")
engine_dir = os.path.join(minigame_dir, "engine")
cdn_build_dir = "cdn_assets/Build"
cdn_sa_dir = "cdn_assets/StreamingAssets"

os.makedirs(wasm_pkg_dir, exist_ok=True)
os.makedirs(adapter_dir, exist_ok=True)
os.makedirs(engine_dir, exist_ok=True)
os.makedirs(cdn_build_dir, exist_ok=True)
os.makedirs(cdn_sa_dir, exist_ok=True)

print("[2/5] Compressing WASM with Brotli (quality=6)...")
wasm_src = "extracted/siyangruchong_package/Build/siyangruchong.wasm.unityweb"
with gzip.open(wasm_src, "rb") as f:
    wasm_raw = f.read()

wasm_br = brotli.compress(wasm_raw, quality=6)
wasm_dest = os.path.join(wasm_pkg_dir, "siyangruchong.wasm.br")
with open(wasm_dest, "wb") as f:
    f.write(wasm_br)

print(f"  WASM Raw: {len(wasm_raw)} bytes -> Brotli: {len(wasm_br)} bytes ({round(len(wasm_br)/(1024*1024), 2)} MB)")

print("[3/5] Writing wasm_pkg/game.js subpackage entry...")
with open(os.path.join(wasm_pkg_dir, "game.js"), "w", encoding="utf-8") as f:
    f.write("// wasm_pkg subpackage entry\nconsole.log('[wasm_pkg] Subpackage loaded.');\nmodule.exports = {};\n")

print("[4/5] Preparing CDN assets (data & streaming assets)...")
data_src = "extracted/siyangruchong_package/Build/siyangruchong.data.unityweb"
with gzip.open(data_src, "rb") as f:
    data_raw = f.read()

# Write uncompressed data for CDN
with open(os.path.join(cdn_build_dir, "siyangruchong.data"), "wb") as f:
    f.write(data_raw)

# Also copy gzip data
shutil.copy2(data_src, os.path.join(cdn_build_dir, "siyangruchong.data.unityweb"))

# Copy WASM to CDN as fallback
shutil.copy2(wasm_src, os.path.join(cdn_build_dir, "siyangruchong.wasm.unityweb"))
with open(os.path.join(cdn_build_dir, "siyangruchong.wasm"), "wb") as f:
    f.write(wasm_raw)

# Copy StreamingAssets to CDN
sa_src = "extracted/siyangruchong_package/StreamingAssets"
if os.path.exists(sa_src):
    sa_dest = "cdn_assets/StreamingAssets"
    if os.path.exists(sa_dest):
        shutil.rmtree(sa_dest)
    shutil.copytree(sa_src, sa_dest)

print("[5/5] Done preparing assets!")
