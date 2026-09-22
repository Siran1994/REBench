import os
import sys
import shutil
import UnityPy
from UnityPy.files import ObjectReader

sys.stdout.reconfigure(encoding='utf-8')

# 突破 Unity 2021 TypeTree 24字节校验限制
orig_read_typetree = ObjectReader.read_typetree
ObjectReader.read_typetree = lambda self, nodes=None, wrap=False, check_read=False: orig_read_typetree(
    self, nodes=nodes, wrap=wrap, check_read=False
)

output_base = os.path.abspath('siyangruchong_art_assets')
dirs = {
    'sprites': os.path.join(output_base, 'Sprites'),
    'textures': os.path.join(output_base, 'Textures'),
    'fonts': os.path.join(output_base, 'Fonts'),
    'audio': os.path.join(output_base, 'Audio'),
    'template': os.path.join(output_base, 'WebTemplate')
}

for d in dirs.values():
    os.makedirs(d, exist_ok=True)

def sanitize_name(name, default_prefix, path_id):
    if not name or not str(name).strip():
        return f'{default_prefix}_{path_id}'
    clean = str(name).strip()
    for ch in '<>:"/\\|?*\x00\r\n\t':
        clean = clean.replace(ch, '_')
    clean = clean.strip('. ')
    if not clean:
        clean = f'{default_prefix}_{path_id}'
    return clean

used_filenames = {k: set() for k in dirs.keys()}

def get_unique_filepath(category, base_name, ext, path_id):
    folder = dirs[category]
    candidate = f'{base_name}.{ext}'
    if candidate.lower() in used_filenames[category]:
        candidate = f'{base_name}_{path_id}.{ext}'
    used_filenames[category].add(candidate.lower())
    return os.path.join(folder, candidate), candidate

bundle_path = 'extracted/siyangruchong_package/unpacked_unityweb/data.unity3d'
print(f'=== 正在加载 Unity 核心数据包: {bundle_path} ===')
env = UnityPy.load(bundle_path)

manifest = {
    'sprites': [],
    'textures': [],
    'fonts': [],
    'audio': [],
    'template': []
}

print('\n[1/4] 开始提取独立精灵 (Sprites - 包含蠕虫、食物道具、技能、UI控件)...')
sprite_success = 0
for obj in env.objects:
    if obj.type.name == 'Sprite':
        try:
            data = obj.read()
            img = data.image
            raw_name = getattr(data, 'm_Name', getattr(data, 'name', ''))
            safe_name = sanitize_name(raw_name, 'Sprite', obj.path_id)
            out_path, filename = get_unique_filepath('sprites', safe_name, 'png', obj.path_id)
            img.save(out_path)
            sprite_success += 1
            manifest['sprites'].append({
                'name': raw_name,
                'file': filename,
                'width': img.width,
                'height': img.height,
                'path_id': obj.path_id
            })
            if sprite_success % 50 == 0:
                print(f'  已提取 {sprite_success} 个精灵...')
        except Exception as e:
            print(f'  [警告] 精灵 {obj.path_id} 提取跳过: {e}')

print(f'✓ 成功提取 {sprite_success} 个精灵资产至 {dirs["sprites"]}')

print('\n[2/4] 开始提取原始完整贴图 (Texture2D - 包含大图集、背景、贴图材质)...')
tex_success = 0
tex_skipped = 0
for obj in env.objects:
    if obj.type.name == 'Texture2D':
        try:
            data = obj.read()
            raw_name = getattr(data, 'm_Name', getattr(data, 'name', ''))
            try:
                img = data.image
            except Exception:
                tex_skipped += 1
                continue
            if not img or img.width == 0 or img.height == 0:
                tex_skipped += 1
                continue
            safe_name = sanitize_name(raw_name, 'Texture', obj.path_id)
            out_path, filename = get_unique_filepath('textures', safe_name, 'png', obj.path_id)
            img.save(out_path)
            tex_success += 1
            manifest['textures'].append({
                'name': raw_name,
                'file': filename,
                'width': img.width,
                'height': img.height,
                'path_id': obj.path_id
            })
            if tex_success % 50 == 0:
                print(f'  已提取 {tex_success} 张贴图...')
        except Exception as e:
            tex_skipped += 1

print(f'✓ 成功提取 {tex_success} 张贴图资产至 {dirs["textures"]} (跳过 {tex_skipped} 个空动态缓冲)')

print('\n[3/4] 开始提取字体资产 (Fonts)...')
font_success = 0
for obj in env.objects:
    if obj.type.name == 'Font':
        try:
            data = obj.read()
            raw_name = getattr(data, 'm_Name', getattr(data, 'name', ''))
            safe_name = sanitize_name(raw_name, 'Font', obj.path_id)
            font_data = getattr(data, 'm_FontData', None)
            if font_data and len(font_data) > 0:
                out_path, filename = get_unique_filepath('fonts', safe_name, 'ttf', obj.path_id)
                with open(out_path, 'wb') as f:
                    f.write(bytes(font_data))
                font_success += 1
                manifest['fonts'].append({
                    'name': raw_name,
                    'file': filename,
                    'bytes': len(font_data),
                    'path_id': obj.path_id
                })
        except Exception as e:
            print(f'  [警告] 字体 {obj.path_id} 提取跳过: {e}')

print(f'✓ 成功提取 {font_success} 款字体文件至 {dirs["fonts"]}')

print('\n[4/4] 开始提取音效与多媒体艺术资产 (AudioClip - WAV 格式)...')
audio_success = 0
for obj in env.objects:
    if obj.type.name == 'AudioClip':
        try:
            data = obj.read()
            raw_name = getattr(data, 'm_Name', getattr(data, 'name', ''))
            safe_name = sanitize_name(raw_name, 'Audio', obj.path_id)
            samples = getattr(data, 'samples', None)
            if samples:
                for s_name, s_bytes in samples.items():
                    ext = 'wav'
                    if s_name.endswith('.mp3'): ext = 'mp3'
                    elif s_name.endswith('.ogg'): ext = 'ogg'
                    out_path, filename = get_unique_filepath('audio', safe_name, ext, obj.path_id)
                    with open(out_path, 'wb') as f:
                        f.write(s_bytes)
                    audio_success += 1
                    manifest['audio'].append({
                        'name': raw_name,
                        'file': filename,
                        'bytes': len(s_bytes),
                        'path_id': obj.path_id
                    })
                    break
        except Exception as e:
            print(f'  [警告] 音频 {obj.path_id} 提取跳过: {e}')

print(f'✓ 成功提取 {audio_success} 条音频资产至 {dirs["audio"]}')

# 5. 复制 TemplateData 网页与启动界面美术资源
tpl_dir = 'extracted/siyangruchong_package/TemplateData'
if os.path.exists(tpl_dir):
    for f in os.listdir(tpl_dir):
        if f.endswith(('.png', '.ico', '.jpg')):
            src = os.path.join(tpl_dir, f)
            dst = os.path.join(dirs['template'], f)
            shutil.copy2(src, dst)
            manifest['template'].append({'name': f, 'file': f, 'bytes': os.path.getsize(dst)})

# 复制小游戏图标
icon_src = 'reverse/siyangruchong-tt-minigame/icon.png'
if os.path.exists(icon_src):
    dst = os.path.join(dirs['template'], 'game_icon.png')
    shutil.copy2(icon_src, dst)
    manifest['template'].append({'name': 'game_icon.png', 'file': 'game_icon.png', 'bytes': os.path.getsize(dst)})

# 6. 生成资产说明清单与索引
readme_path = os.path.join(output_base, 'README.md')
with open(readme_path, 'w', encoding='utf-8') as f:
    f.write(f"""# 《饲养蠕虫》(worm-capitalist) 全量美术与多媒体资源归档

本项目所有提取出的美术与多媒体资源已完整整理至本文件夹中：

## 目录结构
- `Sprites/`: **{sprite_success}** 个独立游戏精灵（PNG 格式，包含各个阶段的蠕虫外观、面包屑/豌豆/饼干/汉堡等全部食物、主动技能图标、金币、商店控件等）。
- `Textures/`: **{tex_success}** 张原始贴图（PNG 格式，包含全分辨率图集 Atlas、木桌台面背景、各种光照遮罩与环境特效纹理）。
- `Fonts/`: **{font_success}** 款字体（TTF 格式，包含游戏中使用的像素字体 PerfectDOSVGA437 与黑体等）。
- `Audio/`: **{audio_success}** 条完整音频（WAV 格式，包含背景音乐 BGM、蠕虫进食咀嚼音效、金币获取、技能音效等）。
- `WebTemplate/`: **{len(manifest['template'])}** 个网页与启动图标资产（包含游戏官方高清 Icon、载入条等）。

## 资源统计
| 资产类型 | 文件数量 | 存放子目录 | 说明 |
|---|---|---|---|
| **独立精灵 (Sprite)** | {sprite_success} | `Sprites/` | 游戏核心角色、道具与UI切片（透明PNG） |
| **全量贴图 (Texture2D)** | {tex_success} | `Textures/` | 完整纹理与图集（高保真PNG） |
| **字库文件 (Font)** | {font_success} | `Fonts/` | TrueType矢量字库（.ttf） |
| **音效音频 (AudioClip)** | {audio_success} | `Audio/` | 原版高品质音频（.wav） |
| **模板与图标 (Icon/UI)** | {len(manifest['template'])} | `WebTemplate/` | 官方图标与加载条素材 |
""")

print(f'\n🎉 全部美术资源提取完成！已生成清单索引: {readme_path}')
