#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地高性能多线程 CDN 资源测试服务器 - 《饲养蠕虫》(siyangruchong)
为抖音小游戏提供 .data、.wasm、.bundle 与 StreamingAssets 静态文件服务
支持 CORS 跨域、WASM MIME、自动探测空闲端口与局域网 IP 回显
"""

import http.server
import os
import sys
import mimetypes
import socket
from functools import partial

# Windows 控制台 UTF-8 支持与防止鼠标误点挂起（关闭 QuickEdit 模式）
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        hStdin = kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE
        mode = ctypes.c_ulong()
        if kernel32.GetConsoleMode(hStdin, ctypes.byref(mode)):
            kernel32.SetConsoleMode(hStdin, mode.value & ~0x0040)  # 取消 ENABLE_QUICK_EDIT_MODE
    except Exception:
        pass

DEFAULT_PORT = 8088
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CDN_DIR = os.path.join(BASE_DIR, "cdn_assets")

if not os.path.exists(CDN_DIR):
    os.makedirs(CDN_DIR, exist_ok=True)

mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/wasm', '.br')
mimetypes.add_type('application/octet-stream', '.data')
mimetypes.add_type('application/octet-stream', '.bundle')
mimetypes.add_type('application/octet-stream', '.unityweb')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')

class ThreadingCDNHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def guess_type(self, path):
        if path.endswith('.wasm') or path.endswith('.wasm.unityweb') or path.endswith('.wasm.br'):
            return 'application/wasm'
        if path.endswith('.js') or path.endswith('.js.unityweb'):
            return 'application/javascript'
        if path.endswith('.data') or path.endswith('.data.unityweb') or path.endswith('.data.br') or path.endswith('.bundle'):
            return 'application/octet-stream'
        if path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def log_message(self, format, *args):
        msg = format % args
        if any(ext in msg for ext in ['.wasm', '.data', '.bundle', '404', '500', 'catalog.json']):
            sys.stdout.write(f"[{self.log_date_time_string()}] {msg}\n")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def find_available_port(start_port=8088):
    for p in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.1)
            if s.connect_ex(('127.0.0.1', p)) == 0:
                continue
            try:
                s.bind(('0.0.0.0', p))
                return p
            except OSError:
                continue
    return start_port

if __name__ == '__main__':
    port = find_available_port(DEFAULT_PORT)
    local_ip = get_local_ip()
    handler = partial(ThreadingCDNHandler, directory=CDN_DIR)
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), handler)

    print("=" * 65)
    print(" 🚀 《饲养蠕虫》(worm-capitalist) 本地 CDN 资源测试服务器已启动")
    print(f" 📂 静态托管根目录: {CDN_DIR}")
    print(f" 💻 本地访问地址  : http://127.0.0.1:{port}/")
    print(f" 📱 局域网真机地址: http://{local_ip}:{port}/")
    print("=" * 65)
    print(" 💡 提示：在 config.js 中配置 CDN_BASE_URL 即可指向本服务。")
    print(" 按 Ctrl + C 即可退出服务器\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已安全退出。")
