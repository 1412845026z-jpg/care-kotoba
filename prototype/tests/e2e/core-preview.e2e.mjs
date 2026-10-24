// CORE-PREVIEW-001: optional 「コア練習（草稿）」 entry for the 12 core scenario drafts (mock OpenAI, no cost).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setup, seedStorage, gotoApp, openCoreScene, EXTERNAL, PHONE } from './helpers.mjs';

const repo = join(process.cwd(), '..');
const drafts = readdirSync(join(repo, 'content', 'scenarios')).filter((f) => /^CK-.+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(repo, 'content', 'scenarios', f), 'utf8')));
const PREFS_ON = { 'ck-prefs': { locale: 'zh', level: 'gentle', goal: 5, plan: 'personal', furigana: true, corePreview: true } };

let env;
before(async () => { env = await setup(); await env.requireAiAccess(); });
after(async () => { await env?.close(); });

async function scenesTab(page) {
  const mobile = page.locator('.mobile-nav button', { hasText: 'シーン' });
  if (await mobile.isVisible()) await mobile.click();
  else await page.locator('.sidebar nav button', { hasText: 'シーンを探す' }).click();
  await page.getByLabel('シーンを検索').waitFor();
}

test('hidden by default: no core entry, the library still shows the regular 48 scenes', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  assert.equal(await page.locator('.core-entry').count(), 0);
  await scenesTab(page);
  assert.equal(await page.locator('.core-pill').count(), 0);
  assert.equal(await page.locator('.scene-grid .scene-card').count(), 48);
  assert.deepEqual(page.errors, []);
});

test('turning the preview on in settings adds the entry; "all" stays 48 and the drafts are labelled as drafts', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  await page.getByLabel('学習設定').click();
  await page.getByLabel('コア練習（草稿）').selectOption('on');
  await page.getByRole('button', { name: 'この設定で続ける' }).click();
  await page.locator('.core-entry').waitFor();
  assert.match(await page.locator('.core-entry').textContent(), /12 シーン · 審稿前の草稿/);
  await page.locator('.core-entry button', { hasText: '開く' }).click();
  await page.locator('.core-notice').waitFor();
  assert.equal(await page.locator('.scene-grid .scene-card').count(), 12);
  assert.match(await page.locator('.core-notice').textContent(), /審稿前/);
  assert.equal(await page.locator('.scene-grid .scene-art-sticker', { hasText: '草稿' }).count(), 12);
  await page.locator('.category-pills button', { hasText: 'すべて' }).click();
  assert.equal(await page.locator('.scene-grid .scene-card').count(), 48, 'the drafts are not mixed into "all"');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
  // The choice is remembered on this device.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ck-prefs')));
  assert.equal(stored.corePreview, true);
  assert.deepEqual(page.errors, []);
});

test('?core=1 turns the preview on (link for reviewers)', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl + '/?core=1');
  await page.locator('.core-entry').waitFor();
  await scenesTab(page);
  assert.match(await page.locator('.core-pill').textContent(), /コア練習（草稿）\s*12/);
  assert.deepEqual(page.errors, []);
});

test('a core draft: no variant choice, opening line, hidden facts stay on the server, practice does not count toward the 48', async () => {
  const page = await env.page();
  await openCoreScene(page, env.baseUrl, '「いつもどおり」の準備を具体化する');
  const modal = page.locator('.scene-modal');
  assert.equal(await modal.locator('.variant-grid').count(), 0, 'the four variants do not apply to the drafts');
  assert.match(await modal.locator('.core-modal-note').textContent(), /草稿 v0\.\d+\.\d+ · 聞き返して確かめる/);
  assert.equal((await modal.locator('.context-person b').textContent()).trim(), '先輩スタッフ');
  assert.ok(await modal.locator('.context-card ruby').count() > 0, 'the draft context has furigana');

  env.mock.state.requests.length = 0;
  env.mock.state.scenario.quoteMode = 'exact';
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.locator('.chat-message.assistant', { hasText: 'いつもどおり' }).waitFor(); // (furigana is on: kanji carry readings in the text)
  await page.getByLabel('日本語で返答を入力').fill('木村さんの、何の準備でしょうか。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  const chat = env.mock.state.requests.find((r) => r.path === '/v1/responses' && r.body?.text?.format?.name === 'care_conversation');
  assert.ok(chat?.body?.instructions?.includes('10時の家族面会で使う写真アルバム'), 'the server gives the partner the hidden fact');
  assert.ok(chat.body.instructions.includes('Reveal a hidden fact only when'));

  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  const fb = env.mock.state.requests.find((r) => r.path === '/v1/responses' && r.body?.text?.format?.name === 'care_feedback');
  assert.ok(fb?.body?.instructions?.includes('never expect the learner to know or guess it'));
  // The session is in the history (reload = fresh read from this device), but not in the 48-scene count.
  await gotoApp(page, env.baseUrl);
  await page.locator('.mobile-nav button', { hasText: '学習記録' }).click();
  await page.locator('.history-list button', { hasText: '「いつもどおり」の準備を具体化する' }).waitFor();
  const practised = await page.locator('.stat-card', { hasText: '練習したシーン' }).textContent();
  assert.match(practised, /練習したシーン\s*0\s*\/ 48/, `the draft must not count toward the 48: ${practised}`);
  assert.deepEqual(page.errors, []);
});

test('the browser bundle carries no hidden facts (harness bundle)', async (t) => {
  if (EXTERNAL) return t.skip('checks the offline harness bundle; a dev server serves modules separately');
  const res = await fetch(env.baseUrl + '/__harness/app.js');
  assert.equal(res.status, 200);
  const js = (await res.text()).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  assert.ok(js.includes('木村さんの準備、いつもどおりお願い。'), 'control: public draft text is in the bundle (so the search below is meaningful)');
  for (const d of drafts) {
    for (const h of d.hidden_information) assert.ok(!js.includes(h.fact_ja), `${h.id} is in the browser bundle`);
    for (const b of d.conversation_branches) assert.ok(!js.includes(b.trigger_zh), `${b.id} trigger is in the browser bundle`);
  }
});

test('desktop layout: the core pill and notice render without errors', async () => {
  const page = await env.page({ ...PHONE, viewport: { width: 1280, height: 860 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await seedStorage(page, PREFS_ON);
  await gotoApp(page, env.baseUrl);
  await scenesTab(page);
  await page.locator('.core-pill').click();
  await page.locator('.core-notice').waitFor();
  assert.equal(await page.locator('.scene-grid .scene-card').count(), 12);
  assert.deepEqual(page.errors, []);
});
