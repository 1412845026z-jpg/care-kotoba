// REVIEW-001: 「今日の復習」 in ことばノート (ts-fsrs scheduling, local only, no scores).
// Run: node tests/run.mjs e2e   (offline harness, no AI call at all)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, seedStorage, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

// Newest first, as the app stores notes. n1 has the learner's own earlier line; n2 is a saved reference phrase.
const NOTES = [
  { id: 'n2', text: 'この理解で、合っていますか。', sceneId: 'handover-2' },
  { id: 'n1', text: '今は入りたくないのですね。', sceneId: 'bath-5', original: '入りませんか。', reason: '気持ちを受け止めてから聞く。' },
];

async function openNotes(page) {
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await page.locator('.review-card').waitFor();
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ck-review') || 'null'));

test('review: cue, answer, own rating; each phrase moves to a later day; nothing is scored', async () => {
  const page = await env.page();
  await seedStorage(page, { 'ck-notes': NOTES });
  await gotoApp(page, env.baseUrl);
  await openNotes(page);
  const card = page.locator('.review-card');
  assert.match(await card.textContent(), /2\s*つ、思い出してみましょう/);
  assert.match(await card.textContent(), /点数はつきません/);
  await card.getByRole('button', { name: /復習をはじめる/ }).click();

  // Oldest saved first: n1, cue is the learner's earlier line; the answer stays hidden until asked.
  const session = page.locator('.review-session');
  await session.waitFor();
  assert.match(await session.locator('.review-progress').textContent(), /1 \/ 2/);
  assert.match(await session.locator('.review-cue-line').textContent(), /入りませんか。/);
  assert.equal(await session.locator('.review-phrase').count(), 0);
  assert.equal(await page.locator('.notes-grid').count(), 0, 'the saved list (which shows the answers) is hidden during the session');
  await session.getByRole('button', { name: '答えを見る' }).click();
  assert.match(await session.locator('.review-phrase').textContent(), /今は入りたくないのですね。/);
  assert.match(await session.locator('.review-reason').textContent(), /気持ちを受け止めて/);
  const answers = session.getByRole('group', { name: 'どのくらい思い出せましたか' }).getByRole('button');
  assert.deepEqual((await answers.allTextContents()).map((t) => t.replace(/次は.*/, '')), ['まだ', 'もう少し', '思い出せた']);
  assert.match(await answers.nth(0).textContent(), /次は明日/, 'まだ brings it back tomorrow, not today');
  await answers.nth(2).click();

  // n2: a saved reference phrase, cued by its scene.
  assert.match(await session.locator('.review-progress').textContent(), /2 \/ 2/);
  assert.match(await session.locator('.review-question').textContent(), /指示を復唱して確認する/);
  await session.getByRole('button', { name: '答えを見る' }).click();
  await session.getByRole('button', { name: /まだ/ }).click();

  await page.locator('.review-done').waitFor();
  assert.match(await page.locator('.review-done').textContent(), /今日の復習は終わりです。次は/);
  await page.locator('.review-done').getByRole('button', { name: '閉じる' }).click();
  await page.locator('.notes-grid').waitFor();
  const s = await stored(page);
  assert.deepEqual(Object.keys(s).sort(), ['n1', 'n2']);
  const tokyo = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date(d));
  const today = tokyo(Date.now());
  for (const id of ['n1', 'n2']) assert.ok(tokyo(s[id].due) > today, `${id} is scheduled on a later day`);
  assert.ok(Date.parse(s.n1.due) >= Date.parse(s.n2.due), '思い出せた waits at least as long as まだ');
  assert.equal(JSON.stringify(s).includes('score'), false);

  // After a reload the day's review is done and the next day is named.
  await page.reload();
  await page.waitForSelector('html[data-app-ready="true"]', { state: 'attached' });
  await openNotes(page);
  assert.match(await page.locator('.review-card').textContent(), /今日の分は終わりました。次は/);
  assert.equal(await page.locator('.review-card').getByRole('button', { name: /復習をはじめる/ }).count(), 0);
  assert.deepEqual(page.errors, []);
});

test('review: unsaving a phrase drops its schedule; deleting this device\'s data clears the review', async () => {
  const page = await env.page();
  const later = new Date(Date.now() + 3 * 86400000).toISOString();
  const card = { due: later, stability: 3, difficulty: 5, elapsed_days: 0, scheduled_days: 3, learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: new Date().toISOString() };
  await seedStorage(page, { 'ck-notes': NOTES, 'ck-review': { n1: card, n2: card } });
  await gotoApp(page, env.baseUrl);
  await openNotes(page);
  assert.match(await page.locator('.review-card').textContent(), /今日の分は終わりました/);
  await page.locator('.note-card', { hasText: 'いますか。' }).getByRole('button', { name: '保存を解除' }).click();
  await page.waitForFunction(() => !('n2' in JSON.parse(localStorage.getItem('ck-review') || '{}')));
  assert.deepEqual(Object.keys(await stored(page)), ['n1']);

  await page.locator('.topbar .lang-button').click();
  await page.getByRole('button', { name: /この端末の学習データを削除/ }).click();
  await page.getByRole('button', { name: '削除する' }).click();
  await page.waitForFunction(() => { const v = JSON.parse(localStorage.getItem('ck-review') || '{}'); return Object.keys(v).length === 0; });
  assert.deepEqual(page.errors, []);
});

test('review: corrupted review data does not break the notes page (treated as not yet reviewed)', async () => {
  const page = await env.page();
  await seedStorage(page, { 'ck-notes': NOTES, 'ck-review': { n1: { due: 'yesterday?', stability: 'x' }, n2: 42, extra: [1, 2] } });
  await gotoApp(page, env.baseUrl);
  await openNotes(page);
  assert.match(await page.locator('.review-card').textContent(), /2\s*つ、思い出してみましょう/);
  assert.deepEqual(page.errors, []);
});

test('review: no review card without saved phrases', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await page.locator('.empty-state').waitFor();
  assert.equal(await page.locator('.review-card').count(), 0);
});
