// SSW-BASIC-APP-001: the basic course (特定技能の基礎, 96 scripted scenes) in the app. No AI call at all.
// Run: node tests/run.mjs e2e   (offline harness)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

async function openBasic(page) {
  await page.locator('.mobile-nav button', { hasText: '基礎' }).click();
  await page.locator('.basic-topic').first().waitFor();
}
/** Records app requests so the test can prove nothing goes to the AI or speech routes. */
function watchApi(page) {
  const hits = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (/^\/api\/(chat|feedback|speech|realtime|drill)/.test(u.pathname)) hits.push(u.pathname); });
  return hits;
}

test('basic course: 24 topics, scene practice hides the answer until asked, device voice only, no AI request', async () => {
  const page = await env.page();
  await page.addInitScript(() => { window.__spoken = []; window.speechSynthesis.speak = (u) => { window.__spoken.push({ text: u.text, lang: u.lang }); }; });
  const api = watchApi(page);
  const before = env.mock.state.requests.length;
  await gotoApp(page, env.baseUrl);
  await page.locator('.basic-entry').getByRole('button', { name: /基礎を練習する/ }).click();
  await page.locator('.basic-topic').first().waitFor();
  assert.equal(await page.locator('.basic-topic').count(), 24);
  assert.match(await page.locator('.basic-facts').textContent(), /24 テーマ · 96 場面/);
  await page.locator('.basic-topic', { hasText: '挨拶・入退室' }).click();
  assert.equal(await page.locator('.basic-scene-row').count(), 4);
  await page.locator('.basic-scene-row', { hasText: '入ってもいいですか' }).click();
  const modal = page.getByRole('dialog', { name: '入ってもいいですか' });
  await modal.waitFor();
  // Lines before the learner's turn are shown with furigana; the reference answer is not.
  assert.equal(await modal.locator('.basic-line').count(), 2);
  assert.equal(await modal.locator('.basic-line rt').count() > 0, true, 'furigana shown');
  assert.equal(await modal.locator('.basic-answer').count(), 0);
  await modal.locator('.basic-line').first().getByRole('button', { name: 'ゆっくり聞く' }).click();
  await modal.getByRole('button', { name: '答えを見る' }).click();
  await modal.locator('.basic-answer').waitFor();
  assert.match(await modal.locator('.basic-answer .basic-line p').textContent(), /失礼/);
  assert.ok(await modal.locator('.basic-alts li').count() >= 1, 'alternative answers listed');
  assert.match(await modal.locator('.basic-check').textContent(), /\S/, 'Chinese point shown (support language zh)');
  const spoken = await page.evaluate(() => window.__spoken);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, 'ja-JP');
  assert.deepEqual(api, [], 'no AI or speech route was called');
  assert.equal(env.mock.state.requests.length, before, 'nothing reached the AI mock');
  assert.deepEqual(page.errors, []);
});

test('basic course: practised scenes and saved lines are kept; notes link back to the scene; data deletion clears progress', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  await openBasic(page);
  await page.locator('.basic-topic', { hasText: '挨拶・入退室' }).click();
  await page.locator('.basic-scene-row', { hasText: '入ってもいいですか' }).click();
  const modal = page.locator('.basic-modal');
  await modal.getByRole('button', { name: '答えを見る' }).click();
  await modal.getByRole('button', { name: /ノートに保存/ }).click();
  await modal.getByRole('button', { name: /練習済みにする/ }).click();
  await modal.locator('.basic-done-note').waitFor();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('ck-basic') || '{}'));
  assert.deepEqual(Object.keys(progress), ['SSW-S02']);
  // Next scene in order.
  await modal.getByRole('button', { name: /次の場面/ }).click();
  await page.getByRole('dialog', { name: /^(?!入ってもいいですか)/ }).locator('.basic-turn').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.basic-modal').waitFor({ state: 'detached' });
  assert.match(await page.locator('.basic-topic-detail').textContent(), /入ってもいいですか/);
  await page.locator('.basic-back').click();
  assert.match(await page.locator('.basic-topic', { hasText: '挨拶・入退室' }).textContent(), /1\/4/);

  // The saved line appears in ことばノート with its basic scene, and links back to it.
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  const card = page.locator('.note-card').first();
  await card.waitFor();
  await page.waitForFunction(() => /基礎 · 入ってもいいですか/.test(document.querySelector('.note-card .note-top')?.textContent || ''));
  await card.getByRole('button', { name: /基礎で練習/ }).click();
  await page.getByRole('dialog', { name: '入ってもいいですか' }).waitFor();
  await page.keyboard.press('Escape');

  // Home shows the count; deleting this device's data clears it.
  await page.locator('.mobile-nav button', { hasText: 'ホーム' }).click();
  assert.match(await page.locator('.basic-entry').textContent(), /練習済み 1 場面/);
  await page.locator('.topbar .lang-button').click();
  await page.getByRole('button', { name: 'この端末の学習データを削除' }).click();
  await page.getByRole('button', { name: '削除する' }).click();
  await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('ck-basic') || '{}')).length === 0);
  assert.deepEqual(page.errors, []);
});

test('basic course: corrupted progress data does not break the page', async () => {
  const page = await env.page();
  await page.addInitScript(() => localStorage.setItem('ck-basic', JSON.stringify({ 'SSW-S01': 'not a date', 'bath-5': '2026-10-24', x: [1] })));
  await gotoApp(page, env.baseUrl);
  await openBasic(page);
  assert.match(await page.locator('.basic-facts').textContent(), /練習済み 0/);
  assert.deepEqual(page.errors, []);
});
