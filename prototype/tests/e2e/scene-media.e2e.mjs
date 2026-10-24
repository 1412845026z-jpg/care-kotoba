// SCENE-AV-APP-001: scene picture above the exchange and recorded lines, with the device voice as a labelled
// fallback. The media index and files are served by page.route (fixtures), not by the app: no real media yet.
// Run: node tests/run.mjs e2e   (offline harness, no AI call)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

// 0.05 s of silence (WAV) and a 1x1 PNG.
function wav() {
  const n = 1102, b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(22050, 24); b.writeUInt32LE(22050, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); b.fill(128, 44);
  return b;
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const INDEX = {
  version: 1, status: 'draft_not_listened', credits: ['音声：テスト用の合成音'],
  scenes: { 'SSW-S02': {
    image: { src: '/media/ssw/SSW-S02/scene.png', width: 1536, height: 1024, alt_ja: '居室のドアの前で声をかける職員と、ベッドの利用者', credit: '生成画像（架空の人物）' },
    // turn 1 has no recording (device voice); turn 3 points at a missing file (falls back to the device voice).
    lines: [{ turn: 0, src: '/media/ssw/SSW-S02/t0.wav' }, { turn: 2, src: '/media/ssw/SSW-S02/t2.wav' }, { turn: 3, src: '/media/ssw/SSW-S02/missing.wav' }, { turn: 1, src: 'https://example.com/t1.mp3' }],
    alternatives: [{ text: 'はい、失礼します。', src: '/media/ssw/SSW-S02/alt.wav' }],
  } },
};

async function prepare(page, index = INDEX) {
  const outside = [];
  await page.route('**/media/ssw/**', (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p === '/media/ssw/index.json') return index ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(index) }) : r.fulfill({ status: 404, body: '' });
    if (p.endsWith('.png')) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    if (p.endsWith('missing.wav')) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ status: 200, contentType: 'audio/wav', body: wav() });
  });
  page.on('request', (q) => { if (/example\.com/.test(q.url())) outside.push(q.url()); });
  // Record what plays instead of producing sound: recordings via HTMLMediaElement.play, device voice via speechSynthesis.
  await page.addInitScript(() => {
    window.__played = []; window.__cancels = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const src = this.getAttribute('src') || '';
      if (src.includes('missing')) return play.call(this); // let the real 404 raise the error event
      window.__played.push('rec:' + new URL(src, location.href).pathname);
      setTimeout(() => this.dispatchEvent(new Event('ended')), 60);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { window.__played.push('pause'); };
    window.speechSynthesis.speak = (u) => { window.__played.push('tts:' + u.text); setTimeout(() => u.onend && u.onend(new Event('end')), 60); };
    window.speechSynthesis.cancel = () => { window.__cancels++; };
  });
  return outside;
}
async function openS02(page) {
  await gotoApp(page, env.baseUrl);
  await page.locator('.mobile-nav button', { hasText: '基礎' }).click();
  await page.locator('.basic-topic', { hasText: '挨拶・入退室' }).click();
  await page.locator('.basic-scene-row', { hasText: '入ってもいいですか' }).click();
  const modal = page.getByRole('dialog', { name: '入ってもいいですか' });
  await modal.waitFor();
  return modal;
}
const played = (page) => page.evaluate(() => window.__played.filter((x) => x !== 'pause'));

test('picture above the exchange with its description; recorded lines are labelled as not yet listened to', async () => {
  const page = await env.page();
  const outside = await prepare(page);
  const modal = await openS02(page);
  const img = modal.locator('.basic-figure img');
  await img.waitFor();
  assert.equal(await img.getAttribute('alt'), '居室のドアの前で声をかける職員と、ベッドの利用者');
  assert.equal(await img.getAttribute('loading'), 'lazy');
  assert.equal(await img.getAttribute('width'), '1536');
  assert.match(await modal.locator('.basic-figure figcaption').textContent(), /架空の人物/);
  // The picture comes before the dialogue.
  assert.ok(await page.evaluate(() => { const f = document.querySelector('.basic-figure'), d = document.querySelector('.basic-dialogue'); return !!(f.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  assert.match(await modal.locator('.basic-audio-bar small').textContent(), /録音（試聴確認前）/);
  const listen = modal.locator('.basic-line .basic-listen');
  assert.equal(await listen.nth(0).getAttribute('aria-label'), '録音を聞く');
  assert.equal(await listen.nth(1).getAttribute('aria-label'), 'ゆっくり聞く', 'the outside URL was dropped: device voice');
  assert.deepEqual(outside, [], 'nothing requested from another site');
  assert.deepEqual(page.errors, []);
});

test('listen to the whole exchange: stops before the learner\'s line, then plays all of it once the answer is shown', async () => {
  const page = await env.page();
  await prepare(page);
  const modal = await openS02(page);
  await modal.locator('.basic-figure img').waitFor();
  await modal.getByRole('button', { name: 'あなたの番まで聞く' }).click();
  await page.waitForFunction(() => !document.querySelector('.basic-audio-bar [aria-pressed="true"]'));
  const first = await played(page);
  assert.deepEqual(first, ['rec:/media/ssw/SSW-S02/t0.wav', 'tts:はい、どうぞ。'], 'turn 2 (the reference answer) is not played');
  await modal.getByRole('button', { name: '答えを見る' }).click();
  await page.evaluate(() => { window.__played = []; });
  await modal.getByRole('button', { name: '会話を通して聞く' }).click();
  await page.waitForFunction(() => !document.querySelector('.basic-audio-bar [aria-pressed="true"]'), null, { timeout: 10000 });
  const all = await played(page);
  assert.equal(all[0], 'rec:/media/ssw/SSW-S02/t0.wav');
  assert.ok(all.includes('rec:/media/ssw/SSW-S02/t2.wav'), 'the answer is heard after it is shown');
  assert.ok(all.some((x) => x.startsWith('tts:') && /どうぞ|こちら/.test(x)), 'the missing file falls back to the device voice');
  // An alternative answer has its own recording.
  await page.evaluate(() => { window.__played = []; });
  await modal.getByRole('button', { name: '「はい、失礼します。」を聞く' }).click();
  await page.waitForFunction(() => window.__played.includes('rec:/media/ssw/SSW-S02/alt.wav'));
  assert.deepEqual(page.errors, []);
});

test('stop, and closing the scene, stop the sound', async () => {
  const page = await env.page();
  await prepare(page);
  await page.addInitScript(() => { window.speechSynthesis.speak = (u) => { window.__played.push('tts:' + u.text); /* never ends */ }; });
  const modal = await openS02(page);
  await modal.locator('.basic-figure img').waitFor();
  await modal.getByRole('button', { name: 'あなたの番まで聞く' }).click();
  const stop = modal.getByRole('button', { name: '止める' });
  await stop.waitFor();
  await page.waitForFunction(() => window.__played.some((x) => x.startsWith('tts:')));
  const before = await page.evaluate(() => window.__cancels);
  await stop.click();
  assert.ok(await page.evaluate((b) => window.__cancels > b, before), 'device voice cancelled');
  await modal.getByRole('button', { name: 'あなたの番まで聞く' }).waitFor();
  await modal.locator('.basic-line .basic-listen').first().click();
  const c2 = await page.evaluate(() => window.__cancels);
  await page.keyboard.press('Escape');
  await page.locator('.basic-modal').waitFor({ state: 'detached' });
  assert.ok(await page.evaluate((b) => window.__cancels > b, c2), 'closing the scene stops playback');
  assert.ok((await page.evaluate(() => window.__played)).includes('pause'), 'the recording is paused');
  assert.deepEqual(page.errors, []);
});

test('without a media index the scene works as before: no picture, device voice, labelled', async () => {
  const page = await env.page();
  await prepare(page, null);
  const modal = await openS02(page);
  await page.waitForTimeout(300);
  assert.equal(await modal.locator('.basic-figure').count(), 0);
  assert.match(await modal.locator('.basic-audio-bar small').textContent(), /端末の日本語の音声/);
  await modal.locator('.basic-line .basic-listen').first().click();
  await page.waitForFunction(() => window.__played.some((x) => x.startsWith('tts:')));
  await modal.getByRole('button', { name: '答えを見る' }).click();
  await modal.locator('.basic-answer').waitFor();
  assert.deepEqual(page.errors, []);
});

test('media credits from the index are listed on the licence page', async () => {
  const page = await env.page();
  await prepare(page);
  await gotoApp(page, env.baseUrl);
  await page.locator('.footer-about').click();
  await page.locator('.about-credits li').first().waitFor();
  assert.match(await page.locator('.about-credits').textContent(), /テスト用の合成音/);
  assert.deepEqual(page.errors, []);
});
