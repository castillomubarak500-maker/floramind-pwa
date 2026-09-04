const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
function create(options = {}) {
  const saved = options.saved || new Map();
  const context = vm.createContext({
    console, setTimeout, clearTimeout, AbortController, FormData,
    FLORA_CONFIG: Object.assign({ mode: 'mock' }, options.config),
    fetch: options.fetch || (() => { throw new Error('Unexpected network'); }),
    localStorage: {
      getItem: key => { if (options.denied) throw new Error('Denied'); return saved.get(key) || null; },
      setItem: (key, value) => { if (options.denied) throw new Error('Denied'); saved.set(key, value); }
    }
  });
  context.window = context;
  ['config', 'storage', 'mock-data', 'api-service'].forEach(name => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context));
  return context;
}
const plain = value => JSON.parse(JSON.stringify(value));
test('original demo metrics, ranges and three diagnosis branches are preserved', async () => {
  const c = create();
  const initial = await c.FloraAPI.bootstrap();
  assert.deepEqual(plain(initial.metrics), { ph: 5.92, ec: 1.42, do: 6.8, waterTemp: 22.3, level: 78, humidity: 64, light: 226 });
  assert.equal(initial.timeline.length, 4);
  assert.equal(initial.feed.length, 2);
  for (let i = 0; i < 100; i++) {
    const data = await c.FloraAPI.getMetrics();
    assert.ok(data.metrics.ph >= 5.65 && data.metrics.ph <= 6.12);
    assert.equal(data.history.ph.length, 8);
  }
  for (const [symptoms, title] of [[['根尖发褐'], '根区低氧风险'], [['EC 快速上升'], '盐分累积风险'], [[], '轻微养护偏离']]) {
    assert.equal((await c.FloraAPI.diagnosis(symptoms, initial.metrics)).title, title);
  }
});
test('controls, notes and community persist; snapshots cannot mutate adapter state', async () => {
  const saved = new Map();
  const c = create({ saved });
  await c.FloraAPI.bootstrap();
  await c.FloraAPI.control({ oxygen: false, white: 37 });
  c.FloraAPI.saveArchive([{ title: '记录', desc: '<img onerror=alert(1)>', date: '9/4' }]);
  c.FloraAPI.saveFeed([{ author: '我', role: '观察', text: '<script>x</script>', likes: 0, comments: 0, time: '现在' }]);
  const next = await create({ saved }).FloraAPI.bootstrap();
  assert.equal(next.controls.oxygen, false);
  assert.equal(next.controls.white, 37);
  assert.equal(next.timeline[0].title, '记录');
  next.metrics.ph = 0;
  assert.notEqual((await c.FloraAPI.getMetrics(false)).metrics.ph, 0);
});
test('storage denied keeps a functional session and reports lack of persistence', async () => {
  const c = create({ denied: true });
  await c.FloraAPI.bootstrap();
  assert.equal(c.FloraAPI.saveArchive([]), false);
  assert.equal((await c.FloraAPI.control({ pump: false })).pump, false);
});
test('device namespaces isolate persisted data', async () => {
  const c = create();
  await c.FloraAPI.bootstrap();
  c.FloraAPI.saveArchive([{ title: 'only C-01', desc: 'x', date: '9/4' }]);
  const other = await c.FloraAPI.bind('C-02');
  assert.equal(other.timeline.length, 4);
  assert.equal((await c.FloraAPI.bind('C-01')).timeline[0].title, 'only C-01');
});
test('REST endpoints, acknowledgement and no fallback on failure', async () => {
  const calls = [];
  const controls = { pump: true, oxygen: true, light: true, safety: true };
  const c = create({ config: { mode: 'live', apiBaseUrl: 'https://device.example' }, fetch: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/metrics')) return { ok: true, json: async () => ({ metrics: { ph: 5.9, ec: 1.4, do: 6.8, waterTemp: 22, level: 78 }, controls, updatedAt: new Date().toISOString() }) };
    return { ok: true, json: async () => ({ applied: false, controls }) };
  } });
  const snapshot = await c.FloraAPI.bootstrap();
  assert.equal(snapshot.feed.length, 0);
  assert.equal(snapshot.metrics.humidity, null);
  await assert.rejects(c.FloraAPI.control({ pump: false }), /未确认/);
  assert.ok(calls[0].url.endsWith('/api/device/C-01/metrics'));
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.body, '{"pump":false}');
  const bad = create({ config: { mode: 'live', apiBaseUrl: 'https://device.example' }, fetch: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(bad.FloraAPI.bootstrap(), /503/);
});
test('invalid control input and stale metrics are rejected', async () => {
  const c = create();
  await assert.rejects(c.FloraAPI.control({ white: 101 }), /范围/);
  await assert.rejects(c.FloraAPI.control({ pump: 'true' }), /布尔/);
  const stale = create({ config: { mode: 'live', apiBaseUrl: 'https://device.example' }, fetch: async () => ({ ok: true, json: async () => ({ metrics: { ph: 5.9, ec: 1.4, do: 6.8, waterTemp: 22, level: 78 }, controls: { pump: true, oxygen: true, light: true, safety: true }, updatedAt: '2020-01-01' }) }) });
  await assert.rejects(stale.FloraAPI.bootstrap(), /过期/);
});
test('timeout is finite, including browsers without AbortController', async () => {
  const c = create({ config: { mode: 'live', apiBaseUrl: 'https://device.example', requestTimeout: 10 }, fetch: () => new Promise(() => {}) });
  c.AbortController = undefined;
  await assert.rejects(c.FloraAPI.bootstrap(), /超时/);
});
