// Browser + API tests for the learner app (offline harness or BASE_URL dev server, mock OpenAI).
// Run: node tests/run.mjs e2e      (see tests/README.md)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, seedStorage, openScene, gotoApp, api, PHONE } from './helpers.mjs';

let env;
before(async () => { env = await setup({ env: { CK_AI_FURIGANA: '1' } }); await env.requireAiAccess(); });
after(async () => { await env?.close(); });

async function transcript(page) {
  return page.$$eval('.chat-message', (els) => els.filter((e) => e.dataset.status !== 'pending').map((e) => { const p = e.querySelector('p')?.cloneNode(true); p?.querySelectorAll('rt,rp').forEach((x) => x.remove()); return { role: e.classList.contains('user') ? 'user' : 'assistant', text: p?.textContent?.trim() || '' }; }));
}

test('home renders at 390px without horizontal overflow or page errors', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
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

test('feedback made from text never shows a pronunciation judgement', async () => {
  env.mock.state.scenario.pronunciation = true;
  try {
    const page = await env.page();
    await openScene(page, env.baseUrl, '入浴を断られたとき');
    await page.getByRole('button', { name: '文字で練習' }).click();
    await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
    await page.getByText('終了して振り返る').click();
    await page.locator('.feedback-summary h2').waitFor();
    const shown = await page.locator('.feedback-main').innerText();
    assert.ok(!/発音もとても|发音很清楚|発音が不明瞭/.test(shown), 'a pronunciation judgement reached the learner');
    assert.match(shown, /発音についてのコメントは、文字からは判断できないため表示していません/);
    assert.match(shown, /丁寧な言葉づかい/, 'the rest of the feedback is still shown');
    assert.equal(await page.locator('.correction-card').count(), 1, 'only the text-based correction remains');
    assert.deepEqual(page.errors, []);
  } finally {
    env.mock.state.scenario.pronunciation = false;
  }
});

test('local re-practice: one moment is replayed with the conversation up to it as context', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 1);
  await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await page.getByText('終了して振り返る').click();
  await page.locator('.correction-card').first().waitFor();
  await page.getByRole('button', { name: /この場面だけもう一度/ }).first().click();
  const drill = page.locator('.line-drill');
  await drill.waitFor();
  assert.match(await drill.locator('.line-drill-before').innerText(), /今日は入りたくないのですね。/);
  env.mock.state.requests.length = 0;
  await drill.getByLabel('もう一度、日本語で答える').fill('今日は入りたくないお気持ちなのですね。');
  await drill.getByRole('button', { name: '答える' }).click();
  await drill.locator('.line-drill-result').waitFor();
  const req = env.mock.state.requests.find((r) => r.path === '/v1/responses' && r.body?.text?.format?.name === 'care_conversation');
  assert.ok(req, 'the drill did not ask the AI partner');
  const input = req.body.input.map((m) => m.role + ':' + m.content);
  assert.equal(input.length, 2, JSON.stringify(input));
  assert.equal(input[1], 'user:今日は入りたくないお気持ちなのですね。');
  assert.ok(input[0].startsWith('assistant:'), 'context is the partner line before the corrected one');
  assert.ok(!input.some((x) => x === 'user:今日は入りたくないのですね。'), 'the old line is not sent again');
  assert.match(await drill.locator('.line-drill-result').innerText(), /の返事/);
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
  await gotoApp(page, env.baseUrl);
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await page.locator('.mobile-nav button', { hasText: '学習記録' }).click();
  await page.locator('h1', { hasText: 'できたことを、少しずつ。' }).waitFor();
  assert.deepEqual(page.errors, []);

  const page2 = await env.page();
  await seedStorage(page2, { 'ck-history': JSON.stringify([{ id: 'x', sceneId: 'removed-scene', date: new Date().toISOString(), minutes: 3, score: 50, demo: false }]) });
  await gotoApp(page2, env.baseUrl);
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
  const res = await api(env.baseUrl, '/api/chat', { headers: await env.authHeaders(), body: { scenarioId: 'meal-6', variant: 'gentle', locale: 'zh', level: 'gentle', messages: [{ role: 'assistant', text: '田中さん、昼食の様子を教えてください。' }, { role: 'user', text: '佐藤さんは主食を半分召し上がりました。' }] } });
  assert.equal(res.status, 200);
  const sent = env.mock.state.requests.find((r) => r.path === '/v1/responses')?.body?.instructions || '';
  assert.ok(!sent.includes('施設利用者の佐藤さん（架空）'), 'meal-6 instructions still cast the AI as the resident');
});

test('health endpoint answers and reports configuration without secrets', async () => {
  const res = await api(env.baseUrl, '/api/health', { method: 'GET' });
  assert.equal(res.status, 200);
  assert.equal(res.data.configured, true);
  const text = JSON.stringify(res.data);
  assert.ok(!text.includes('test-dummy-key-not-real') && !/sk-[A-Za-z0-9_-]{10,}|Bearer /.test(text), 'health leaks key material');
});

test('furigana is shown on fixed texts and can be switched off in settings', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '口腔ケア前の説明');
  const rt = await page.$$eval('.scene-modal-title h2 rt', (els) => els.map((e) => e.textContent));
  assert.ok(rt.includes('こうくう'), `expected the care-field reading こうくう, got ${JSON.stringify(rt)}`);
  assert.ok((await page.locator('.context-card ruby').count()) > 0, 'context has no furigana');
  await page.getByRole('button', { name: '閉じる' }).first().click();
  await page.getByRole('button', { name: '学習設定' }).click();
  await page.getByLabel('ふりがな').selectOption('off');
  await page.getByRole('button', { name: /この設定で続ける/ }).click();
  await openScene(page, env.baseUrl, '口腔ケア前の説明');
  assert.equal(await page.locator('.scene-modal ruby').count(), 0, 'furigana still shown after switching it off');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ck-prefs')).furigana), false);
  assert.deepEqual(page.errors, []);
});

test('notes whose text is an Object.prototype name render as plain text (furigana on and off)', async () => {
  for (const furigana of [true, false]) {
    const page = await env.page();
    const names = ['constructor', 'toString', '__proto__', 'hasOwnProperty'];
    await seedStorage(page, {
      'ck-notes': JSON.stringify(names.map((text, i) => ({ id: 'n' + i, text, sceneId: 'bath-5' }))),
      'ck-prefs': JSON.stringify({ locale: 'zh', level: 'gentle', goal: 5, plan: 'personal', furigana }),
    });
    await gotoApp(page, env.baseUrl);
    await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
    await page.locator('h1', { hasText: 'ことばノート' }).waitFor();
    const shown = await page.$$eval('.note-card h3', (els) => els.map((e) => e.textContent));
    assert.deepEqual(shown, names, `furigana=${furigana}`);
    assert.equal(await page.locator('.note-card ruby').count(), 0);
    assert.equal(await page.getByText(/couldn.t load|エラーが発生/).count(), 0, 'error boundary shown');
    assert.deepEqual(page.errors, []);
  }
});

test('a crash in one screen shows a recoverable message instead of blanking the app', async () => {
  const page = await env.page();
  await page.addInitScript(() => { window.__CK_CRASH_TEST__ = 'notes'; });
  await gotoApp(page, env.baseUrl);
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  const box = page.locator('.screen-error[data-screen="notes"]');
  await box.waitFor();
  assert.match(await box.innerText(), /この画面を表示できませんでした/);
  assert.equal(await page.locator('.mobile-nav').count(), 1, 'navigation is still there');
  await page.locator('.mobile-nav button', { hasText: 'シーン' }).click();
  await page.locator('h1', { hasText: 'その場面を、練習しよう。' }).waitFor();
  assert.equal(await page.locator('.screen-error').count(), 0, 'another tab renders normally');
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await box.waitFor();
  await page.evaluate(() => { window.__CK_CRASH_TEST__ = ''; });
  await box.getByRole('button', { name: 'ホームに戻る' }).click();
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  assert.deepEqual(page.errors.filter((e) => !/crash test: notes|screen-error/.test(e)), []);
});

test('a crash inside practice can be closed without losing the app', async () => {
  const page = await env.page();
  await page.addInitScript(() => { window.__CK_CRASH_TEST__ = 'practice'; });
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: /まずはデモで操作を体験/ }).click();
  const box = page.locator('.screen-error.overlay[data-screen="practice"]');
  await box.waitFor();
  await page.evaluate(() => { window.__CK_CRASH_TEST__ = ''; });
  await box.getByRole('button', { name: '練習を閉じる' }).click();
  await page.locator('.screen-error').waitFor({ state: 'detached' });
  await page.locator('.mobile-nav button', { hasText: 'ノート' }).click();
  await page.locator('h1', { hasText: 'ことばノート' }).waitFor();
  assert.deepEqual(page.errors.filter((e) => !/crash test: practice|screen-error/.test(e)), []);
});

test('voice check: microphone, speaker, server and WebRTC are checked without any AI call', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  env.mock.state.requests.length = 0;
  await page.getByRole('button', { name: '学習設定' }).click();
  await page.getByRole('button', { name: /音声テスト（マイク・スピーカー）/ }).click();
  await page.getByRole('button', { name: 'テストを始める' }).click();
  await page.getByRole('button', { name: 'マイクを確認する' }).click();
  await page.getByRole('button', { name: 'テスト音を鳴らす' }).click({ timeout: 15000 });
  await page.getByRole('button', { name: '聞こえた' }).click();
  const list = page.locator('.voice-check-list li');
  assert.deepEqual(await list.evaluateAll((els) => els.map((e) => e.querySelector('b').textContent)), ['ブラウザの対応', 'サーバー', '音声の通信準備', 'マイク', 'スピーカー']);
  const status = Object.fromEntries(await list.evaluateAll((els) => els.map((e) => [e.querySelector('b').textContent, e.dataset.status])));
  assert.equal(status['サーバー'], 'ok');
  assert.equal(status['スピーカー'], 'ok');
  assert.ok(['ok', 'warn'].includes(status['マイク']), `mic ${status['マイク']}`); // Chromium's fake device plays a beep
  assert.ok(['ok', 'fail'].includes(status['音声の通信準備'])); // 'fail' only where the machine has no usable interface
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '結果を保存（JSON）' }).click()]);
  assert.match(download.suggestedFilename(), /^care-kotoba-voice-check-\d+\.json$/);
  assert.equal(env.mock.state.requests.filter((r) => /realtime|responses|audio/.test(r.path)).length, 0, 'the voice check must not call the (paid) AI');
  assert.deepEqual(page.errors, []);
});

test('AI replies in text practice get validated furigana (CK_AI_FURIGANA=1); a wrong notation is not shown', async (t) => {
  const health = await api(env.baseUrl, '/api/health', { method: 'GET' });
  if (!health.data?.features?.aiFurigana) return t.skip('server runs without CK_AI_FURIGANA=1');
  for (const bad of [false, true]) {
    env.mock.state.scenario.badRuby = bad;
    try {
      const page = await env.page();
      await openScene(page, env.baseUrl, '入浴を断られたとき');
      await page.getByRole('button', { name: '文字で練習' }).click();
      await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
      const last = page.locator('.chat-message.assistant').last();
      const rts = await last.locator('rt').allTextContents();
      const text = await last.locator('p').evaluate((p) => { const c = p.cloneNode(true); c.querySelectorAll('rt,rp').forEach((x) => x.remove()); return c.textContent; });
      assert.equal(text, 'そうなのね。もう少し、ゆっくり説明してもらえる？', 'the reply text itself is unchanged');
      if (bad) assert.deepEqual(rts, [], 'a notation that does not match the reply must not be shown');
      else assert.deepEqual(rts, ['すこ', 'せつめい']);
      assert.deepEqual(page.errors, []);
    } finally {
      env.mock.state.scenario.badRuby = false;
    }
  }
});

test('when voice cannot start, the free voice check can be opened from the error panel', async () => {
  env.mock.state.scenario.error = { status: 500, code: 'server_error' };
  try {
    const page = await env.page();
    await openScene(page, env.baseUrl, '入浴を断られたとき');
    await page.getByRole('button', { name: /音声でAIと話す/ }).click();
    await page.locator('.conversation-error').waitFor();
    await page.locator('.conversation-error').getByRole('button', { name: /音声テスト/ }).click();
    const modal = page.locator('.voice-check-modal');
    await modal.waitFor();
    assert.ok(await modal.isVisible(), 'the voice check is shown above the practice screen');
    await modal.getByRole('button', { name: 'テストを始める' }).click();
    await modal.getByRole('button', { name: 'マイクを確認する' }).waitFor();
    await modal.getByRole('button', { name: '閉じる' }).click();
    await modal.waitFor({ state: 'detached' });
    assert.deepEqual(page.errors.filter((e) => !/500|Failed to load/.test(e)), []);
  } finally {
    env.mock.state.scenario.error = null;
  }
});

test('responsive layout: desktop width also renders without errors', async () => {
  const page = await env.page({ viewport: { width: 1280, height: 860 }, locale: 'ja-JP' });
  await gotoApp(page, env.baseUrl);
  await page.locator('h1', { hasText: '今日も、ひとつずつ。' }).waitFor();
  assert.deepEqual(page.errors, []);
});

export { transcript, PHONE };
