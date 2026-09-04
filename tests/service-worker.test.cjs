const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const base = 'https://example.test/floramind-pwa/';
function setup() {
  const handlers = {}, deleted = [], cached = new Map();
  let cacheName;
  const cache = { addAll: async requests => {
    for (const request of requests) {
      const relative = new URL(request.url).pathname.replace('/floramind-pwa/', '') || 'index.html';
      const file = path.join(root, relative.endsWith('/') ? relative + 'index.html' : relative);
      assert.ok(fs.existsSync(file), 'Precache file missing: ' + file);
      cached.set(request.url, new Response(fs.readFileSync(file)));
    }
  }, match: async url => cached.has(url) ? cached.get(url).clone() : undefined };
  const context = vm.createContext({ URL, Request, Response, console,
    self: { location: { href: base + 'sw.js' }, addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => {} }, skipWaiting: () => {} },
    caches: { open: async name => { cacheName = name; return cache; }, keys: async () => ['unrelated-app-cache', 'floramind:/other/:v1', 'floramind:/floramind-pwa/:old', cacheName], delete: async name => { deleted.push(name); } },
    fetch: async () => { throw new Error('offline'); }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), context);
  const lifecycle = async name => { let work; handlers[name]({ waitUntil: promise => { work = promise; } }); await work; };
  const fetchEvent = async (url, method = 'GET', mode = 'navigate') => { let response; handlers.fetch({ request: { url, method, mode }, respondWith: p => { response = p; } }); return response; };
  return { lifecycle, fetchEvent, deleted, cached };
}
test('precache covers every real asset; app/product/query links work offline', async () => {
  const s = setup(); await s.lifecycle('install');
  for (const route of ['', 'index.html', 'product/', 'product/index.html', 'web/', '?release=old', 'js/app.js', 'qr/floramind-v2.png']) {
    const response = await s.fetchEvent(base + route);
    assert.equal(response.status, 200, route);
    assert.ok((await response.arrayBuffer()).byteLength > 0, route);
  }
  assert.equal((await s.fetchEvent(base + 'missing-page')).status, 404);
});
test('activation removes only old caches under this app scope', async () => {
  const s = setup(); await s.lifecycle('install'); await s.lifecycle('activate');
  assert.deepEqual(s.deleted, ['floramind:/floramind-pwa/:old']);
});
test('API GET, control POST, cross-origin and other apps are never intercepted', async () => {
  const s = setup();
  for (const [url, method] of [[base + 'api/device/C-01/metrics', 'GET'], [base + 'api/device/C-01/control', 'POST'], ['https://api.example.test/api/diagnosis', 'POST'], ['https://example.test/other/index.html', 'GET']]) {
    assert.equal(await s.fetchEvent(url, method), undefined);
  }
});
