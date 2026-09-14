import http.server
import webbrowser
import os
import sys
import mimetypes
import socket

DEFAULT_PORT = 8086
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 显式注册现代 Web / 游戏核心 MIME 类型
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/octet-stream', '.data')
mimetypes.add_type('application/octet-stream', '.bundle')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')
mimetypes.add_type('font/ttf', '.ttf')
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
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass

class SilentThreadingHTTPServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)

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
    server = SilentThreadingHTTPServer(("0.0.0.0", port), ThreadingHandler)
    url = f"http://localhost:{port}/index.html"
    print("=" * 60)
    print(f"本地高并发多线程游戏服务器已就绪！")
    print(f"访问地址: {url}")
    print("正在自动打开浏览器...")
    print("按 Ctrl + C 即可退出服务器")
    print("=" * 60)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已安全退出。")

