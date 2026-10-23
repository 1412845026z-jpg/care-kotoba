// Browser + API tests for the learner app (offline harness, mock OpenAI).
// Run: node tests/run.mjs e2e      (see tests/README.md)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, seedStorage, openScene, api, PHONE } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

async function transcript(page) {
  return page.$$eval('.chat-message', (els) => els.filter((e) => e.dataset.status !== 'pending').map((e) => ({ role: e.classList.contains('user') ? 'user' : 'assistant', text: e.querySelector('p')?.textContent?.trim() || '' })));
}

test('home renders at 390px without horizontal overflow or page errors', async () => {
  const page = await env.page();
  await page.goto(env.baseUrl);
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
  assert.deepEqual(page.errors, []);
});

test('scripted demo can be completed and is labelled as not AI-evaluated', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, 'お顔を拭く前のひとこと');
  await page.getByText('まずはデモで操作を体験').click();
  const box = page.getByLabel('日本語で返答を入力');
  for (const line of ['おはようございます。', '温かいタオルで、お顔を拭いてもよろしいですか。', '熱くありませんか。']) {
    await box.fill(line);
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => document.querySelectorAll('.chat-message.assistant').length >= n, (await page.locator('.chat-message.assistant').count()) + 1);
  }
  await page.getByText('終了して振り返る').click();
  await page.getByText('ひとつ、会話を体験しました。').waitFor();
  // The note is shown in the learner's support language (default zh).
  assert.match(await page.locator('.feedback-summary p').first().textContent(), /AI評価は行っていません|没有进行真实 AI 评价|without an AI evaluation/);
  assert.deepEqual(page.errors, []);
});

test('text practice uses the mock AI and shows feedback', async () => {
  env.mock.state.scenario.quoteMode = 'exact';
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.getByLabel('日本語で返答を入力').fill('今日は、入りたくないお気持ちなのですね。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  assert.match(await page.locator('.feedback-summary h2').textContent(), /模拟/);
  assert.deepEqual(page.errors, []);
});

test('feedback never shows a quote the learner did not say', async () => {
  env.mock.state.scenario.quoteMode = 'mixed'; // mock returns one real and one fabricated quote
  try {
    const page = await env.page();
    await openScene(page, env.baseUrl, '入浴を断られたとき');
    await page.getByRole('button', { name: '文字で練習' }).click();
    await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
    await page.getByText('終了して振り返る').click();
    await page.locator('.feedback-summary h2').waitFor();
    const originals = await page.$$eval('.correction-card .original', (els) => els.map((e) => e.textContent.trim()));
    assert.ok(originals.includes('今日は入りたくないのですね。'), `real quote missing: ${JSON.stringify(originals)}`);
    assert.ok(!originals.includes('早くお風呂に入ってください。'), `fabricated quote shown: ${JSON.stringify(originals)}`);
  } finally {
    env.mock.state.scenario.quoteMode = 'exact';
  }
});

test('corrupted or outdated localStorage does not break the app', async () => {
  const page = await env.page();
  await seedStorage(page, {
    'ck-history': JSON.stringify({ not: 'an array' }),
    'ck-notes': JSON.stringify([{ id: '1', text: '古い表現', sceneId: 'removed-scene' }, null, 42]),
    'ck-prefs': JSON.stringify({ locale: 'xx', goal: 'abc' }),
  });
  await page.goto(env.baseUrl);
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await page.locator('.mobile-nav button', { hasText: '学習記録' }).click();
  await page.locator('h1', { hasText: 'できたことを、少しずつ。' }).waitFor();
  assert.deepEqual(page.errors, []);

  const page2 = await env.page();
  await seedStorage(page2, { 'ck-history': JSON.stringify([{ id: 'x', sceneId: 'removed-scene', date: new Date().toISOString(), minutes: 3, score: 50, demo: false }]) });
  await page2.goto(env.baseUrl);
  await page2.locator('.mobile-nav button', { hasText: '学習記録' }).click();
  await page2.locator('h1', { hasText: 'できたことを、少しずつ。' }).waitFor();
  assert.deepEqual(page2.errors, []);
});

test('staff-to-staff scenes are not role-played as the resident', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '食事の様子を同僚に伝える');
  const partner = (await page.locator('.context-person b').textContent()).trim();
  assert.notEqual(partner, '利用者の佐藤さん');

  env.mock.state.requests.length = 0;
  const res = await api(env.baseUrl, '/api/chat', { body: { scenarioId: 'meal-6', variant: 'gentle', locale: 'zh', level: 'gentle', messages: [{ role: 'assistant', text: '田中さん、昼食の様子を教えてください。' }, { role: 'user', text: '佐藤さんは主食を半分召し上がりました。' }] } });
  assert.equal(res.status, 200);
  const sent = env.mock.state.requests.find((r) => r.path === '/v1/responses')?.body?.instructions || '';
  assert.ok(!sent.includes('施設利用者の佐藤さん（架空）'), 'meal-6 instructions still cast the AI as the resident');
});

test('health endpoint answers and reports configuration without secrets', async () => {
  const res = await api(env.baseUrl, '/api/health', { method: 'GET' });
  assert.equal(res.status, 200);
  assert.equal(res.data.configured, true);
  assert.ok(!JSON.stringify(res.data).includes('test-dummy-key-not-real'), 'health leaks the API key');
});

test('responsive layout: desktop width also renders without errors', async () => {
  const page = await env.page({ viewport: { width: 1280, height: 860 }, locale: 'ja-JP' });
  await page.goto(env.baseUrl);
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  assert.deepEqual(page.errors, []);
});

export { transcript, PHONE };
