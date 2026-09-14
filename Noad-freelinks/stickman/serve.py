import http.server
import mimetypes
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('font/ttf', '.ttf')
mimetypes.add_type('audio/webm', '.webm')
mimetypes.add_type('image/webp', '.webp')

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8092

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = http.server.SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.css': 'text/css',
        '.ttf': 'font/ttf',
        '.webm': 'audio/webm',
        '.webp': 'image/webp'
    })

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ThreadingServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)

if __name__ == '__main__':
    httpd = ThreadingServer(("", PORT), Handler)
    print(f"Stickman No-Ad Free-Link running at http://localhost:{PORT}/index.html")
    httpd.serve_forever()
