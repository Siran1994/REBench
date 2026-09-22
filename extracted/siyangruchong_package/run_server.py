import http.server
import webbrowser
import os
import sys
import mimetypes
import socket
from functools import partial

DEFAULT_PORT = 8080
PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))

mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/octet-stream', '.data')
mimetypes.add_type('application/octet-stream', '.bundle')
mimetypes.add_type('application/octet-stream', '.unityweb')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')

class ThreadingHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def guess_type(self, path):
        if path.endswith('.wasm.unityweb') or path.endswith('.wasm.br') or path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.js.unityweb') or path.endswith('.js.br') or path.endswith('.loader.js') or path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.data.unityweb') or path.endswith('.data.br') or path.endswith('.data') or path.endswith('.bundle') or path.endswith('.pck'):
            return 'application/octet-stream'
        if path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)

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

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def log_message(self, format, *args):
        msg = format % args
        if any(ext in msg for ext in ['.wasm', '.data', '.bundle', '.unityweb', 'index.html', '404', '500']):
            sys.stdout.write(f"[{self.log_date_time_string()}] {msg}\n")

def find_available_port(start_port=8080):
    for p in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.1)
            if s.connect_ex(('127.0.0.1', p)) == 0:
                continue
            try:
                s.bind(('127.0.0.1', p))
                return p
            except OSError:
                continue
    return start_port

if __name__ == '__main__':
    port = find_available_port(DEFAULT_PORT)
    handler = partial(ThreadingHandler, directory=PACKAGE_DIR)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    url = f"http://127.0.0.1:{port}/index.html"
    print("=" * 60)
    print("饲养蠕虫 (worm-capitalist) 本地多线程测试服务器已就绪！")
    print(f"访问地址: {url}")
    print("按 Ctrl + C 即可退出服务器")
    print("=" * 60)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已安全退出。")
