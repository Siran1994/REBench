# -*- coding: utf-8 -*-
"""
Perfect Landing (完美着陆) 全量自动化汉化流水线
执行流程：
 1. 自动生成 14 张核心 UI 中文高清贴图
 2. 注入中文字库 (font.ttf) 覆盖 Baloo-Regular FontData
 3. 注入 14 张重绘贴图至 UnityFS Texture2D
 4. 全量汉化场景内所有 104 个 UnityEngine.UI.Text 与 TextMeshProUGUI 组件
 5. 汉化 IL2CPP global-metadata.dat 核心运行时字符串
 6. 重新打包 UnityFS 与 UnityWebData 资产包并同步至抖音小游戏与 CDN 试玩工程
"""

import os
import sys
import struct
import gzip
from PIL import Image
import UnityPy

# 设置控制台输出编码
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ROOT_DIR = r'D:\Desktop\REBench'
UNPACKED_DIR = os.path.join(ROOT_DIR, r'extracted\perfect_landing_plane_pilot_package\unpacked_unityweb')
BUNDLE_PATH = os.path.join(UNPACKED_DIR, 'data.unity3d')
METADATA_PATH = os.path.join(UNPACKED_DIR, r'Il2CppData\Metadata\global-metadata.dat')
FONT_PATH = os.path.join(ROOT_DIR, r'font\font.ttf')
CN_TEX_DIR = os.path.join(ROOT_DIR, r'scratch\perfect_landing\cn_textures')

MINIGAME_BIN = os.path.join(ROOT_DIR, r'reverse\perfect-landing-tt-minigame\data\a22d7abc1ee3cd7b71a65e48bb3d9b2e.bin')
NOAD_DATA = os.path.join(ROOT_DIR, r'Noad-freelinks\perfect_landing\Build\a22d7abc1ee3cd7b71a65e48bb3d9b2e.data.unityweb')
INDEX_HTML = os.path.join(ROOT_DIR, r'Noad-freelinks\perfect_landing\index.html')

# 1. 文本翻译对照字典
TRANSLATION_MAP = {
    # 场景引导与通用
    'Tap To Enter': '点击进入',
    'Loading...': '加载中...',
    'Press anywhere and hold to move': '按住屏幕任意位置拖动',
    'PULL THE PLANE': '拉动飞机',
    'HOLD': '按住',
    'Tap To Fly': '点击起飞',
    'CONTINUE': '继续',
    'COLLECT': '领取',
    'CLAIM': '领取',
    'Next': '下一关',
    'Watch Ad': '看广告',
    'AD': '广告',
    'Ad Break. . . ': '广告中. . . ',
    'No Ads Available': '暂无可用广告',
    'FREE': '免费',
    'Earned': '获得',
    'Lose It': '放弃',
    'LOSE IT': '放弃',
    'NEW RECORD': '新纪录',
    'CHEST\nRECEIVED': '获得宝箱',
    '500000 Coins': '500000 金币',
    '0 M': '0 米',
    '000\nKM/H': '000\n公里/小时',
    'Settings': '设置',
    'Vibration': '震动',
    
    # 养成中枢与发射台
    'Launcher': '发射台',
    'Plane': '战机',
    'Income': '收益',
    'UPGRADE': '升级',
    'UNLOCK': '解锁',
    'COMING SOON': '敬请期待',
    
    # 物理参数面板
    'Horizontal F': '水平推力',
    'Vertical F': '垂直推力',
    'Max Force': '最大推力',
    'Drag': '空气阻力',
    'Y Th Hold': '高度阈值',
    'Plane Rot': '机身旋转',
    'Show/Hide': '显示/隐藏',
    'SELECTED': '已选择',
    'Selected': '已选择'
}

# 贴图名称与汉化图片文件映射
TEXTURE_MAP = {
    'logo': 'logo.png',
    'Heading': 'Heading.png',
    'Tap to play': 'Taptoplay.png',
    'Drag-to-move': 'Drag-to-move.png',
    'Choose Plane': 'ChoosePlane.png',
    'free coins tag 50K': 'freecoinstag50K.png',
    'planes button_': 'planesbutton_.png',
    'complete banner_': 'completebanner_.png',
    'collect x2 button': 'collectx2button.png',
    'claim on RAD button': 'claimonRADbutton.png',
    'select 1': 'select1.png',
    'back button': 'backbutton.png',
    'privacy policy button': 'privacypolicybutton.png',
    'remove ads button': 'removeadsbutton.png'
}

def step1_render_textures():
    print('\n[步骤 1/5] 绘制与生成 15 张高清汉化 UI 贴图...')
    import render_translated_textures
    render_translated_textures.render_all()
    print('  ✓ 所有 UI 贴图生成完毕！')

def step2_patch_unity3d():
    print('\n[步骤 2/5] 注入字库、贴图与汉化场景 UI 组件 (data.unity3d)...')
    with open(FONT_PATH, 'rb') as f:
        font_bytes = f.read()

    env = UnityPy.load(BUNDLE_PATH)
    
    # A. 替换字库
    font_replaced = False
    for obj in env.objects:
        if obj.type.name == 'Font' and obj.path_id == 12:
            d = obj.read()
            d.m_FontData = font_bytes
            d.save()
            font_replaced = True
            print(f'  ✓ 注入中文字体: Baloo-Regular ➔ 小新黑体 ({len(font_bytes)} 字节)')
            break
    if not font_replaced:
        print('  ⚠ 未找到 path_id=12 Font 资产！')

    # B. 替换贴图
    tex_count = 0
    for obj in env.objects:
        if obj.type.name == 'Texture2D':
            d = obj.read()
            name = getattr(d, 'm_Name', '')
            if name == 'selected':
                if d.m_Width == 320 and d.m_Height == 60:
                    img_path = os.path.join(CN_TEX_DIR, 'selected.png')
                    if os.path.exists(img_path):
                        with Image.open(img_path) as new_img:
                            d.image = new_img.convert('RGBA')
                            d.save()
                        tex_count += 1
                        print(f'  ✓ 替换贴图 [selected (320x60)]: selected.png (file={obj.assets_file.name}, pid={obj.path_id})')
            elif name in TEXTURE_MAP:
                img_path = os.path.join(CN_TEX_DIR, TEXTURE_MAP[name])
                if os.path.exists(img_path):
                    with Image.open(img_path) as new_img:
                        d.image = new_img.convert('RGBA')
                        d.save()
                    tex_count += 1
                    print(f'  ✓ 替换贴图 [{name}]: {TEXTURE_MAP[name]} (file={obj.assets_file.name}, pid={obj.path_id})')
    print(f'  ✓ 共成功替换 {tex_count} 处 Texture2D 贴图')

    # C. 汉化场景 UI 文本组件
    text_count = 0
    for obj in env.objects:
        if obj.type.name == 'MonoBehaviour':
            raw = bytearray(obj.get_raw_data())
            if len(raw) < 28:
                continue
            file_id, script_pid = struct.unpack('<Iq', raw[16:28])
            
            # UnityEngine.UI.Text
            if script_pid == 294 and len(raw) >= 148:
                old_len = struct.unpack('<I', raw[144:148])[0]
                if 148 + old_len <= len(raw):
                    old_text = raw[148:148+old_len].decode('utf-8', errors='ignore')
                    if old_text in TRANSLATION_MAP:
                        new_text = TRANSLATION_MAP[old_text]
                        new_bytes = new_text.encode('utf-8')
                        new_len = len(new_bytes)
                        old_pad = (old_len + 3) & ~3
                        new_pad = (new_len + 3) & ~3
                        new_raw = raw[:144] + struct.pack('<I', new_len) + new_bytes + b'\x00' * (new_pad - new_len) + raw[144+4+old_pad:]
                        obj.set_raw_data(bytes(new_raw))
                        text_count += 1
                        print(f'  ✓ UI.Text [{obj.assets_file.name}:{obj.path_id}]: {repr(old_text)} ➔ {repr(new_text)}')

            # TextMeshProUGUI
            elif script_pid == 717 and len(raw) >= 92:
                old_len = struct.unpack('<I', raw[88:92])[0]
                if 92 + old_len <= len(raw):
                    old_text = raw[92:92+old_len].decode('utf-8', errors='ignore')
                    if old_text in TRANSLATION_MAP:
                        new_text = TRANSLATION_MAP[old_text]
                        new_bytes = new_text.encode('utf-8')
                        new_len = len(new_bytes)
                        old_pad = (old_len + 3) & ~3
                        new_pad = (new_len + 3) & ~3
                        new_raw = raw[:88] + struct.pack('<I', new_len) + new_bytes + b'\x00' * (new_pad - new_len) + raw[88+4+old_pad:]
                        obj.set_raw_data(bytes(new_raw))
                        text_count += 1
                        print(f'  ✓ TMP_Text [{obj.assets_file.name}:{obj.path_id}]: {repr(old_text)} ➔ {repr(new_text)}')

    print(f'  ✓ 共成功汉化 {text_count} 个 UI 文本组件')

    # D. 保存并以 LZ4 压缩打包 data.unity3d
    print('  正在打包保存 data.unity3d (LZ4 压缩)...')
    saved_bundle = env.file.save(packer='lz4')
    with open(BUNDLE_PATH, 'wb') as f:
        f.write(saved_bundle)
    print(f'  ✓ data.unity3d 保存成功，压缩体积: {len(saved_bundle)} 字节')

def step3_patch_metadata():
    print('\n[步骤 3/5] 汉化 IL2CPP 核心元数据 (global-metadata.dat)...')
    with open(METADATA_PATH, 'rb') as f:
        raw_meta = bytearray(f.read())

    hdr = list(struct.unpack('<64I', raw_meta[:256]))
    sl_count = hdr[3] // 8
    sl_entries = [list(struct.unpack('<II', raw_meta[hdr[2] + i*8 : hdr[2] + (i+1)*8])) for i in range(sl_count)]

    # 需要本地化的元数据字符串
    replacements = {
        1217: '领取你的奖励！',
        2316: '下一奖励',
        242: '! 收益翻倍至 ',
        4707: '公里',
        2146: '第 {0} 关',
        2145: '第 ',
    }

    append_bytes = bytearray()
    for idx, new_text in replacements.items():
        b = new_text.encode('utf-8')
        new_idx = hdr[5] + len(append_bytes)
        append_bytes.extend(b)
        sl_entries[idx] = [len(b), new_idx]
        print(f'  ✓ 元数据字符串 [{idx}]: ➔ {new_text}')

    delta = len(append_bytes)
    split_pos = hdr[4] + hdr[5]
    new_meta = raw_meta[:split_pos] + append_bytes + raw_meta[split_pos:]

    # 更新 Header 偏移
    hdr[5] += delta
    for i in range(6, 60, 2):
        if hdr[i] > 0 and hdr[i] >= split_pos:
            hdr[i] += delta

    new_meta[:256] = struct.pack('<64I', *hdr)
    for i, (l, d_idx) in enumerate(sl_entries):
        new_meta[hdr[2] + i*8 : hdr[2] + (i+1)*8] = struct.pack('<II', l, d_idx)

    with open(METADATA_PATH, 'wb') as f:
        f.write(new_meta)
    print(f'  ✓ global-metadata.dat 写入成功，体积: {len(new_meta)} 字节')

def step4_repack_unitywebdata():
    print('\n[步骤 4/5] 封装 UnityWebData 资产包并同步部署...')
    file_list = [
        'data.unity3d',
        'resources.resource',
        'RuntimeInitializeOnLoads.json',
        'ScriptingAssemblies.json',
        'sharedassets0.resource',
        'boot.config',
        'Il2CppData/Metadata/global-metadata.dat',
        'Resources/unity_default_resources'
    ]

    header_len = 20
    entries_meta = []
    for p in file_list:
        p_bytes = p.encode('utf-8')
        header_len += 12 + len(p_bytes)

    current_offset = header_len
    file_data = []
    for p in file_list:
        full_p = os.path.join(UNPACKED_DIR, p.replace('/', os.sep))
        with open(full_p, 'rb') as f:
            data = f.read()
        entries_meta.append((current_offset, len(data), p.encode('utf-8')))
        current_offset += len(data)
        file_data.append(data)

    packed_bytes = bytearray()
    packed_bytes.extend(b'UnityWebData1.0\x00')
    packed_bytes.extend(struct.pack('<I', header_len))
    for off, length, p_bytes in entries_meta:
        packed_bytes.extend(struct.pack('<III', off, length, len(p_bytes)))
        packed_bytes.extend(p_bytes)
    for data in file_data:
        packed_bytes.extend(data)

    # 写入抖音小游戏工程 (GZIP 压缩以符合抖音 20MB 分包与 30MB 总包红线)
    os.makedirs(os.path.dirname(MINIGAME_BIN), exist_ok=True)
    with gzip.open(MINIGAME_BIN, 'wb', compresslevel=9) as f:
        f.write(packed_bytes)
    print(f'  ✓ 抖音小游戏资产分包更新 (GZIP压缩): {MINIGAME_BIN} ({os.path.getsize(MINIGAME_BIN)} 字节)')

    # 写入 CDN 试玩版工程
    os.makedirs(os.path.dirname(NOAD_DATA), exist_ok=True)
    with open(NOAD_DATA, 'wb') as f:
        f.write(packed_bytes)
    print(f'  ✓ CDN 试玩工程资产包更新: {NOAD_DATA} ({len(packed_bytes)} 字节)')

def step5_update_web_config():
    print('\n[步骤 5/5] 更新网页与平台展示标题...')
    if os.path.exists(INDEX_HTML):
        with open(INDEX_HTML, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace(
            '<title>Perfect Landing: Plane Pilot - 免广告试玩版 (No-Ad Free-Link)</title>',
            '<title>完美着陆：飞机驾驶员 (Perfect Landing) - 免广告试玩版</title>'
        )
        content = content.replace(
            '<div class="game-logo">✈️ Perfect Landing: Plane Pilot</div>',
            '<div class="game-logo">✈️ 完美着陆 (Perfect Landing)</div>'
        )
        with open(INDEX_HTML, 'w', encoding='utf-8') as f:
            f.write(content)
        print('  ✓ 已更新 Noad-freelinks/perfect_landing/index.html 标题与 Logo 文案')

def main():
    print('=====================================================')
    print('   Perfect Landing (完美着陆) 全量自动化汉化流水线   ')
    print('=====================================================')
    step1_render_textures()
    step2_patch_unity3d()
    step3_patch_metadata()
    step4_repack_unitywebdata()
    step5_update_web_config()
    print('\n=====================================================')
    print('   🎉 PERFECT LANDING 全量汉化及工程打包全部完成！   ')
    print('=====================================================')

if __name__ == '__main__':
    main()
