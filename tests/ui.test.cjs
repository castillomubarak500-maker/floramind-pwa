/* Optional DOM regression test. JSDOM is a test tool, never a website dependency.
 * FLORA_TEST_JSDOM may point to an external installation. Canvas is stubbed;
 * these assertions do not claim browser layout or actual Canvas rendering coverage. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require(process.env.FLORA_TEST_JSDOM || 'jsdom');
const root = path.join(__dirname, '..');
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function app(saved = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://example.test/floramind-pwa/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: text => ({ width: text.length * 7 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  Object.entries(saved).forEach(([key,value]) => w.localStorage.setItem(key,value));
  const context = dom.getInternalVMContext();
  const scripts = ['icons','config','storage','mock-data','api-service','core','charts','renderers','ui','router','actions','app'];
  scripts.forEach(name => vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'), context));
  await tick();
  return { dom, w, document: w.document, eval: code => vm.runInContext(code,context), click: async selector => { const el=w.document.querySelector(selector); assert.ok(el,selector); el.click(); await tick(); } };
}

test('all five original screens render, hash navigation and one-click care work', async () => {
  const a = await app();
  try {
    assert.equal(a.document.querySelectorAll('.metric-card').length, 6);
    assert.equal(a.document.querySelector('#growthScore').textContent, '98'); // original heuristic
    for (const screen of ['archive','control','diagnosis','community','dashboard']) {
      await a.click('.bottom-nav [data-nav="'+screen+'"]');
      assert.equal(a.document.querySelectorAll('.screen:not([hidden])').length, 1);
      assert.equal(a.document.querySelector('.screen:not([hidden])').dataset.screen,screen);
      assert.equal(a.w.location.hash,'#/'+screen);
    }
    await a.click('.bottom-nav [data-nav="control"]');
    await a.click('[data-toggle="oxygen"]');
    assert.equal(a.document.querySelector('[data-toggle="oxygen"]').getAttribute('aria-checked'),'false');
    await a.click('[data-action="quickCare"]');
    assert.equal(a.document.querySelector('[data-toggle="oxygen"]').getAttribute('aria-checked'),'true');
    a.w.location.hash='#/unknown'; await tick();
    assert.equal(a.eval('state.screen'),'dashboard');
  } finally { a.dom.window.close(); }
});
test('diagnosis -> archive, growth notes, posts, likes and comments survive reload; text is escaped', async () => {
  const a = await app();
  let saved;
  try {
    await a.click('.bottom-nav [data-nav="diagnosis"]');
    await a.click('[data-action="runDiagnosis"]');
    assert.match(a.document.querySelector('#diagnosisResult').textContent,/根区低氧风险/);
    await a.click('[data-action="saveDiagnosis"]');
    assert.equal(a.document.querySelectorAll('.timeline-item').length,5);
    await a.click('.bottom-nav [data-nav="archive"]');
    await a.click('[data-action="addRecord"]');
    a.document.querySelector('#recordInput').value='今天看到了新根';
    await a.click('[data-action="saveRecord"]');
    assert.equal(a.document.querySelectorAll('.timeline-item').length,6);
    await a.click('.bottom-nav [data-nav="community"]');
    a.document.querySelector('#postInput').value='<img src=x onerror=alert(1)> 生长观察';
    await a.click('[data-action="publishPost"]');
    assert.equal(a.document.querySelectorAll('#feed img').length,0);
    assert.match(a.document.querySelector('#feed').textContent,/<img/);
    await a.click('[data-like="0"]');
    await a.click('[data-comment="0"]');
    a.document.querySelector('#commentInput').value='已记录';
    await a.click('[data-action="saveComment"]');
    assert.equal(a.eval('state.feed[0].comments'),1);
    assert.equal(a.eval('state.feed[0].likes'),1);
    saved=Object.fromEntries(Object.keys(a.w.localStorage).map(key=>[key,a.w.localStorage.getItem(key)]));
  } finally { a.dom.window.close(); }
  const b=await app(saved);
  try {
    assert.equal(b.document.querySelectorAll('.timeline-item').length,6);
    assert.equal(b.eval('state.feed[0].replies[0]'),'已记录');
    assert.equal(b.eval('state.feed[0].liked'),true);
  } finally { b.dom.window.close(); }
});
test('salt-risk action records a retest rather than incorrectly starting oxygen', async () => {
  const a=await app();
  try {
    await a.click('[data-toggle="oxygen"]');
    await a.click('[data-symptom="EC 快速上升"]');
    await a.click('[data-action="runDiagnosis"]');
    await a.click('[data-action="applyDiagnosis"]');
    assert.equal(a.eval('state.controls.oxygen'),false);
    assert.equal(a.eval('state.timeline[0].title'),'诊断复测计划');
  } finally { a.dom.window.close(); }
});
