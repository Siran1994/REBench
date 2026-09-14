import http.server
import socketserver
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

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8089

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
        super().end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
