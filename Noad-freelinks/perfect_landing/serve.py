import http.server
import webbrowser
import os
import sys
import mimetypes
import socket

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_PORT = 8088
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 显式注册与修复 Windows 注册表 MIME 类型
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/wasm', '.unityweb')
mimetypes.add_type('application/octet-stream', '.data')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('audio/ogg', '.ogg')
mimetypes.add_type('audio/mpeg', '.mp3')
mimetypes.add_type('image/webp', '.webp')

class ThreadingHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.wasm.unityweb') or path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.js.unityweb') or path.endswith('.loader.js') or path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.data.unityweb') or path.endswith('.data'):
            return 'application/octet-stream'
        return super().guess_type(path)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass

def find_available_port(port):
    for p in range(port, port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', p))
                return p
            except OSError:
                continue
    return port

if __name__ == '__main__':
    port = find_available_port(DEFAULT_PORT)
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), ThreadingHandler)
    url = f"http://localhost:{port}/index.html"
    print("=" * 60)
    print("✈️ Perfect Landing: Plane Pilot - 本地免广告试玩服务已就绪！")
    print(f"🔗 访问地址: {url}")
    print("💡 按 Ctrl + C 即可安全退出服务")
    print("=" * 60)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已安全退出。")
