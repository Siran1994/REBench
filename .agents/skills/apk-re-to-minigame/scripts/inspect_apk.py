#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
APK Engine Inspector & Construct 3 Audit Tool
Detects game engine (Unity, Construct 3, Cocos, Godot, Lime/Haxe, etc.)
Enforces gatekeeping:
  - Unity -> Terminate workflow immediately
  - Construct 3 -> Output audit & proceed to MiniGame adaptation
  - Others -> Pause and report to user
"""

import sys
import os
import json
import zipfile
import argparse
import re
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


def collect_file_list(source_path):
    """
    Returns a dict mapping archive/source paths to lists of relative file paths.
    Handles .apk, .xapk, .apks, .zip, and unpacked directories.
    """
    file_map = {}
    source = Path(source_path)

    if not source.exists():
        raise FileNotFoundError(f"Source path not found: {source_path}")

    if source.is_dir():
        file_list = []
        for root, _, files in os.walk(source):
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), source).replace('\\', '/')
                file_list.append(rel)
        file_map['[directory]'] = file_list
        return file_map

    # It's an archive file
    with zipfile.ZipFile(source, 'r') as z:
        top_names = z.namelist()
        nested_apks = [n for n in top_names if n.endswith('.apk')]

        if nested_apks:
            # XAPK / APKS package containing multiple APKs
            for apk_name in nested_apks:
                try:
                    with z.open(apk_name) as f:
                        with zipfile.ZipFile(f) as sub_z:
                            file_map[apk_name] = [n.replace('\\', '/') for n in sub_z.namelist()]
                except Exception as e:
                    file_map[apk_name] = []
            # Also include non-apk files at top level (e.g. manifest.json, icon.png)
            file_map['[manifest]'] = [n.replace('\\', '/') for n in top_names if not n.endswith('.apk')]
        else:
            # Standard single APK or ZIP
            file_map['[main]'] = [n.replace('\\', '/') for n in top_names]

    return file_map


def identify_engine(file_map):
    """
    Analyzes file list to identify engine.
    Returns:
      engine_type: 'unity' | 'construct3' | 'cocos' | 'godot' | 'lime' | 'unreal' | 'unknown'
      confidence: float (0.0 - 1.0)
      details: dict with matches and explanations
      action: 'TERMINATE' | 'PROCEED' | 'PAUSE'
    """
    all_files = []
    for origin, files in file_map.items():
        all_files.extend(files)

    files_lower = [f.lower() for f in all_files]

    details = {
        'unity_evidence': [],
        'c3_evidence': [],
        'other_evidence': [],
        'wrapper': None
    }

    # 1. Unity Check (HIGH PRIORITY GATEKEEPER)
    unity_patterns = [
        r'assets/bin/data/',
        r'lib/.*/libunity\.so',
        r'lib/.*/libil2cpp\.so',
        r'assets/bin/data/managed/',
        r'unityplayeractivity'
    ]
    for p in unity_patterns:
        matched = [f for f in files_lower if re.search(p, f)]
        if matched:
            details['unity_evidence'].extend(matched[:5])

    if details['unity_evidence']:
        return {
            'engine': 'Unity',
            'status': 'TERMINATE',
            'action_message': '【终止流程】检测到该 APK 为 Unity 引擎开发，按照流程规范立即终止逆向移植流程！请勿盲目反编译移植。',
            'details': details
        }

    # 2. Construct 3 Check
    c3_patterns = [
        r'scripts/c3runtime\.js',
        r'scripts/c3main\.js',
        r'assets/www/scripts/c3runtime\.js',
        r'assets/www/scripts/c3main\.js',
        r'assets/www/data\.json',
        r'data\.json',
        r'c3repo/',
        r'images/.*-sheet\d+\.(webp|png)',
        r'scripts/main\.js'
    ]
    for p in c3_patterns:
        matched = [f for f in files_lower if re.search(p, f)]
        if matched:
            details['c3_evidence'].extend(matched[:5])

    has_c3runtime = any('c3runtime.js' in f for f in files_lower)
    has_c3main = any('c3main.js' in f for f in files_lower)
    has_data_json = any(f.endswith('data.json') for f in files_lower)

    # Detect wrapper
    if any('cordova.js' in f for f in files_lower):
        details['wrapper'] = 'Cordova'
    elif any('capacitor' in f for f in files_lower):
        details['wrapper'] = 'Capacitor'
    else:
        details['wrapper'] = 'Web/HTML5'

    if has_c3runtime or (has_c3main and has_data_json):
        return {
            'engine': 'Construct 3',
            'status': 'PROCEED',
            'wrapper': details['wrapper'],
            'action_message': f'【通过门禁】检测到该 APK 为 Construct 3 ({details["wrapper"]}) 引擎开发，允许继续执行完整抖音小游戏移植流程！',
            'details': details
        }

    # 3. Other engines
    if any('liblime.so' in f or 'libapplicationmain.so' in f for f in files_lower):
        return {
            'engine': 'Haxe/Lime/OpenFL',
            'status': 'PAUSE',
            'action_message': '【暂停流程】检测到该 APK 为 Haxe/Lime/OpenFL 引擎开发（非 Construct 3），暂停自动化移植并提示用户评估。',
            'details': details
        }
    if any('libcocos' in f or 'src/cocos-js' in f for f in files_lower):
        return {
            'engine': 'Cocos',
            'status': 'PAUSE',
            'action_message': '【暂停流程】检测到该 APK 为 Cocos 引擎开发（非 Construct 3），暂停自动化移植并提示用户评估。',
            'details': details
        }
    if any('libgodot' in f for f in files_lower):
        return {
            'engine': 'Godot',
            'status': 'PAUSE',
            'action_message': '【暂停流程】检测到该 APK 为 Godot 引擎开发（非 Construct 3），暂停自动化移植并提示用户评估。',
            'details': details
        }
    if any('libue4.so' in f or 'libunreal' in f for f in files_lower):
        return {
            'engine': 'Unreal Engine',
            'status': 'TERMINATE',
            'action_message': '【终止流程】检测到该 APK 为 Unreal 引擎开发，无法通过 Web 方式移植，终止流程。',
            'details': details
        }

    return {
        'engine': 'Unknown / Native Android',
        'status': 'PAUSE',
        'action_message': '【暂停流程】未检测到 Construct 3 特征，暂停自动化流程并向用户汇报。',
        'details': details
    }


def extract_c3_web_assets(source_path, target_dir):
    """
    Extracts Construct 3 web bundle (typically inside assets/www/ or root) to target_dir.
    """
    target = Path(target_dir)
    target.mkdir(parents=True, exist_ok=True)
    source = Path(source_path)

    extracted_count = 0

    if source.is_dir():
        # Look for assets/www or root
        www_dir = source / 'assets' / 'www'
        web_root = www_dir if www_dir.exists() else source
        for root, _, files in os.walk(web_root):
            for f in files:
                src_file = Path(root) / f
                rel = src_file.relative_to(web_root)
                dest_file = target / rel
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                dest_file.write_bytes(src_file.read_bytes())
                extracted_count += 1
        return extracted_count

    with zipfile.ZipFile(source, 'r') as z:
        top_names = z.namelist()
        nested_apks = [n for n in top_names if n.endswith('.apk')]

        if nested_apks:
            # Look inside base/main apk
            for apk_name in nested_apks:
                with z.open(apk_name) as f:
                    with zipfile.ZipFile(f) as sub_z:
                        sub_names = sub_z.namelist()
                        www_files = [n for n in sub_names if n.startswith('assets/www/')]
                        if www_files:
                            for name in www_files:
                                rel = name[len('assets/www/'):]
                                if not rel or rel.endswith('/'):
                                    continue
                                dest_file = target / rel
                                dest_file.parent.mkdir(parents=True, exist_ok=True)
                                with sub_z.open(name) as src_f:
                                    dest_file.write_bytes(src_f.read())
                                extracted_count += 1
                            break
        else:
            # Direct APK
            www_files = [n for n in top_names if n.startswith('assets/www/')]
            prefix = 'assets/www/' if www_files else ''
            target_files = www_files if www_files else [n for n in top_names if not n.startswith('lib/') and not n.startswith('META-INF/')]

            for name in target_files:
                rel = name[len(prefix):] if prefix else name
                if not rel or rel.endswith('/'):
                    continue
                dest_file = target / rel
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                with z.open(name) as src_f:
                    dest_file.write_bytes(src_f.read())
                extracted_count += 1

    return extracted_count


def audit_c3_project(web_dir):
    """
    Parses data.json and web files in web_dir to generate comprehensive audit.
    Supports both Construct 3 array-based and dict-based project schemas.
    """
    web_path = Path(web_dir)
    data_json_path = web_path / 'data.json'

    audit = {
        'engine': 'Construct 3',
        'app_name': None,
        'app_version': None,
        'object_types_count': 0,
        'families_count': 0,
        'layouts_count': 0,
        'layouts': [],
        'event_sheets_count': 0,
        'event_sheet_stats': [],
        'total_logic_nodes': 0,
        'tilemap_objects_count': 0,
        'tilemap_objects': [],
        'audio_files_count': 0,
        'fonts_count': 0,
        'fonts': [],
        'plugins_detected': [],
        'features_detected': {
            'c3runtime': (web_path / 'scripts' / 'c3runtime.js').exists(),
            'c3main': (web_path / 'scripts' / 'c3main.js').exists() or (web_path / 'scripts' / 'c3main.minigame.js').exists(),
            'cordova': (web_path / 'cordova.js').exists(),
            'tilemap_used': False
        }
    }

    # Count audio files in media/
    media_dir = web_path / 'media'
    if media_dir.exists():
        audit['audio_files_count'] = len([f for f in media_dir.glob('*') if f.is_file()])

    if not data_json_path.exists():
        return audit

    try:
        data = json.loads(data_json_path.read_text(encoding='utf-8', errors='ignore'))
        project = data.get('project', data)

        if isinstance(project, list):
            # Array-based Construct 3 schema
            audit['app_name'] = project[0] if len(project) > 0 else None
            
            # Plugin registry in project[2]
            plugin_registry = {}
            if len(project) > 2 and isinstance(project[2], list) and len(project[2]) > 0:
                for p in project[2][0]:
                    if isinstance(p, list) and len(p) >= 21:
                        # plugin index or id -> plugin name
                        plugin_name = p[20] if len(p) > 20 else str(p[-2])
                        plugin_registry[len(plugin_registry)] = plugin_name

            # Object types in project[3]
            obj_types = project[3] if len(project) > 3 and isinstance(project[3], list) else []
            audit['object_types_count'] = len(obj_types)

            tilemaps = []
            plugins_seen = set()
            for idx, obj in enumerate(obj_types):
                if isinstance(obj, list) and len(obj) >= 2:
                    name = obj[0]
                    p_idx = obj[1]
                    p_name = plugin_registry.get(p_idx, '')
                    if p_name:
                        plugins_seen.add(p_name)
                    if p_name.lower() in ('tilemap', 'tiledbg'):
                        tilemaps.append({
                            'index': idx,
                            'name': name,
                            'plugin': p_name
                        })
            audit['tilemap_objects_count'] = len(tilemaps)
            audit['tilemap_objects'] = tilemaps
            audit['features_detected']['tilemap_used'] = len(tilemaps) > 0
            audit['plugins_detected'] = sorted(list(plugins_seen))

            # Families in project[4]
            families = project[4] if len(project) > 4 and isinstance(project[4], list) else []
            audit['families_count'] = len(families)

            # Layouts in project[5]
            layouts = project[5] if len(project) > 5 and isinstance(project[5], list) else []
            audit['layouts_count'] = len(layouts)
            audit['layouts'] = [l[0] for l in layouts if isinstance(l, list) and len(l) > 0]

            # Event sheets in project[6]
            event_sheets = project[6] if len(project) > 6 and isinstance(project[6], list) else []
            audit['event_sheets_count'] = len(event_sheets)

            total_nodes = 0
            sheet_stats = []
            for sheet in event_sheets:
                if isinstance(sheet, list) and len(sheet) >= 2:
                    s_name = sheet[0]
                    events = sheet[1] if isinstance(sheet[1], list) else []
                    top_level = len(events)
                    sheet_stats.append({
                        'name': s_name,
                        'top_level': top_level
                    })
                    total_nodes += top_level
            audit['total_logic_nodes'] = total_nodes
            audit['event_sheet_stats'] = sheet_stats

            # Audio in project[7]
            if len(project) > 7 and isinstance(project[7], list) and not audit['audio_files_count']:
                audit['audio_files_count'] = len(project[7])

            # Fonts in project[29]
            if len(project) > 29 and isinstance(project[29], list):
                audit['fonts_count'] = len(project[29])
                audit['fonts'] = [f[0] for f in project[29] if isinstance(f, list) and len(f) > 0]

        elif isinstance(project, dict):
            # Dict-based Construct 3 schema
            audit['app_name'] = project.get('name')
            audit['app_version'] = project.get('version')

            obj_types = project.get('objectTypes', [])
            audit['object_types_count'] = len(obj_types)

            tilemaps = []
            plugins_seen = set()
            for idx, obj in enumerate(obj_types):
                plugin_id = obj.get('plugin-id') or obj.get('pluginId') or obj.get('id', '')
                if plugin_id:
                    plugins_seen.add(plugin_id)
                if plugin_id.lower() in ('tilemap', 'tiledbg'):
                    tilemaps.append({
                        'index': idx,
                        'name': obj.get('name', f'Object_{idx}'),
                        'plugin': plugin_id
                    })

            audit['tilemap_objects_count'] = len(tilemaps)
            audit['tilemap_objects'] = tilemaps
            audit['features_detected']['tilemap_used'] = len(tilemaps) > 0
            audit['plugins_detected'] = sorted(list(plugins_seen))

            families = project.get('families', [])
            audit['families_count'] = len(families)

            layouts = project.get('layouts', [])
            audit['layouts_count'] = len(layouts)
            audit['layouts'] = [l.get('name', f'Layout_{i}') for i, l in enumerate(layouts)]

            event_sheets = project.get('eventSheets', [])
            audit['event_sheets_count'] = len(event_sheets)

            total_nodes = 0
            sheet_stats = []
            for sheet in event_sheets:
                name = sheet.get('name', 'unnamed')
                events = sheet.get('events', [])
                top_level = len(events)
                total_nodes += top_level
                sheet_stats.append({
                    'name': name,
                    'top_level': top_level
                })

            audit['total_logic_nodes'] = total_nodes
            audit['event_sheet_stats'] = sheet_stats

    except Exception as e:
        audit['parse_error'] = str(e)

    return audit


def main():
    parser = argparse.ArgumentParser(description="Inspect APK/XAPK for Engine Detection & C3 Audit")
    parser.add_argument("source", help="Path to APK, XAPK, APKS, ZIP, or extracted folder")
    parser.add_argument("--output", "-o", help="Path to write JSON audit report")
    parser.add_argument("--extract-web", "-e", help="Target folder to extract Construct 3 web assets")
    parser.add_argument("--strict-gatekeeper", action="store_true", default=True, help="Exit with code 1 if Unity or non-C3 engine")

    args = parser.parse_args()

    print(f"[inspect_apk] Scanning source: {args.source}...")
    file_map = collect_file_list(args.source)

    total_files = sum(len(f) for f in file_map.values())
    print(f"[inspect_apk] Discovered {total_files} files across {len(file_map)} archives/packages.")

    engine_res = identify_engine(file_map)
    print("\n" + "=" * 60)
    print(f"ENGINE DETECTED : {engine_res['engine']}")
    print(f"GATEKEEPER STATUS: {engine_res['status']}")
    print(f"MESSAGE         : {engine_res['action_message']}")
    print("=" * 60 + "\n")

    report = {
        'source': os.path.abspath(args.source),
        'engine_result': engine_res
    }

    if engine_res['engine'] == 'Unity':
        print("[inspect_apk] CRITICAL: Unity engine detected. Aborting workflow per instructions.")
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        sys.exit(2)  # Return code 2 indicates Unity abort

    if engine_res['engine'] != 'Construct 3':
        print(f"[inspect_apk] WARNING: Non-Construct-3 engine ({engine_res['engine']}) detected. Pausing.")
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        sys.exit(3)  # Return code 3 indicates other non-C3 engine

    # Construct 3 path: Proceed to extraction and audit
    print("[inspect_apk] Proceeding with Construct 3 extraction and project audit...")
    audit_target_dir = args.extract_web

    if audit_target_dir:
        print(f"[inspect_apk] Extracting web assets to: {audit_target_dir}...")
        count = extract_c3_web_assets(args.source, audit_target_dir)
        print(f"[inspect_apk] Successfully extracted {count} web asset files.")
        audit = audit_c3_project(audit_target_dir)
    else:
        # If source is already a directory
        if os.path.isdir(args.source):
            audit = audit_c3_project(args.source)
        else:
            # Temporary extraction for auditing
            import tempfile
            with tempfile.TemporaryDirectory() as tmp_dir:
                extract_c3_web_assets(args.source, tmp_dir)
                audit = audit_c3_project(tmp_dir)

    report['audit'] = audit

    print("\n--- Construct 3 Audit Summary ---")
    print(f"App Name          : {audit.get('app_name')}")
    print(f"App Version       : {audit.get('app_version')}")
    print(f"Object Types Count: {audit.get('object_types_count')}")
    print(f"Layouts Count     : {audit.get('layouts_count')} ({', '.join(audit.get('layouts', []))})")
    print(f"Event Sheets Count: {audit.get('event_sheets_count')} (Total logic nodes: {audit.get('total_logic_nodes')})")
    print(f"Tilemaps Count    : {audit.get('tilemap_objects_count')}")
    print(f"Audio Files Count : {audit.get('audio_files_count')}")
    print(f"Plugins Detected  : {', '.join(audit.get('plugins_detected', []))}")
    print("---------------------------------\n")

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"[inspect_apk] Full audit written to: {args.output}")

    sys.exit(0)


if __name__ == '__main__':
    main()
