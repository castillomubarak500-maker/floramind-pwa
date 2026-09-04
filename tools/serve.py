"""Serve the repository under its real Pages prefix, with no build step."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

ROOT = Path(__file__).resolve().parents[1]
BASE = '/floramind-pwa/'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def send_head(self):
        route = urlsplit(self.path).path
        if route in ['/', '/floramind-pwa']:
            self.send_response(302); self.send_header('Location', BASE); self.end_headers(); return None
        if not route.startswith(BASE):
            self.send_error(404); return None
        return super().send_head()
    def translate_path(self, path):
        if path.startswith(BASE): path = '/' + path[len(BASE):]
        return super().translate_path(path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8787)
    args = parser.parse_args()
    print(f'FloraMind: http://127.0.0.1:{args.port}{BASE}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
