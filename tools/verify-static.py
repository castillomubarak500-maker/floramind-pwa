"""Standard-library static verification. Run from any directory: python tools/verify-static.py."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []; self.ids = []; self.scripts = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'script' and 'src' in a: self.scripts.append(a['src'])
        for key in ['src', 'href']:
            if a.get(key): self.refs.append(a[key])

total = 0
for file in [ROOT/'index.html', ROOT/'product/index.html']:
    page = Page(); page.feed(file.read_text(encoding='utf-8'))
    assert len(page.ids) == len(set(page.ids)), f'Duplicate ids in {file}'
    assets = set()
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or not url.path: continue
        target = (file.parent / unquote(url.path)).resolve()
        if target.is_dir(): target /= 'index.html'
        assert target.exists(), f'Missing {target}'
        if target.suffix in ['.js','.css','.svg','.png','.json']: assets.add(target)
    weight = file.stat().st_size + sum(p.stat().st_size for p in assets)
    print(f'{file.relative_to(ROOT)}: links/ids OK, referenced assets {weight:,} bytes')
    total += 1

for script in (ROOT/'js').glob('*.js'):
    subprocess.run(['node','--check',str(script)],check=True,capture_output=True)
    text = script.read_text(encoding='utf-8')
    assert not re.search(r'\bimport\s*\(', text), f'Dynamic import: {script}'
    assert '.at(' not in text and '?.' not in text, f'Unsupported unguarded syntax: {script}'
subprocess.run(['node','--check',str(ROOT/'sw.js')],check=True,capture_output=True)
manifest = json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
assert manifest['name'] == 'FloraMind'
assert manifest['start_url'] == '/floramind-pwa/'
assert manifest['display'] == 'standalone'
assert {i['sizes'] for i in manifest['icons']} >= {'192x192','512x512'}
print('Manifest, all JavaScript syntax, no dynamic imports: OK')
