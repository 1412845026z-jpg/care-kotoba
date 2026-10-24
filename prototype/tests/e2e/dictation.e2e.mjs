// FREE-VOICE-001: free dictation in text/demo practice through the browser's speech recognition.
// Chromium in CI has no usable recogniser, so a fake SpeechRecognition (same interface) is installed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openScene } from './helpers.mjs';

let env;
before(async () => { env = await setup(); await env.requireAiAccess(); });
after(async () => { await env?.close(); });

/** Fake recogniser: each start() delivers the next queued result (or error) as final, then ends. */
async function fakeRecognizer(page, queue) {
  await page.addInitScript((q) => {
    window.__ckSpeech = { queue: q, started: 0, langs: [] };
    class FakeRecognition {
      start() {
        const s = window.__ckSpeech; s.started++; s.langs.push(this.lang);
        const next = s.queue.shift() || { error: 'no-speech' };
        setTimeout(() => {
          if (next.error) { this.onerror?.({ error: next.error }); this.onend?.(); return; }
          this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: next.text.slice(0, 3), confidence: 0 }], { isFinal: false })] });
          setTimeout(() => {
            this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: next.text, confidence: next.confidence }], { isFinal: true })] });
            setTimeout(() => this.onend?.(), 30);
          }, 60);
        }, 60);
      }
      stop() {} abort() {}
    }
    window.webkitSpeechRecognition = FakeRecognition;
    delete window.SpeechRecognition;
  }, queue);
}

test('dictation: asks once, fills the box, and feedback receives the lines as voice transcripts (unsure / corrected)', async () => {
  const page = await env.page();
  await fakeRecognizer(page, [{ text: '今日は入りたくないのですね。', confidence: 0.3 }, { text: '何か気になることはありますか。', confidence: 0.9 }]);
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  const box = page.getByLabel('日本語で返答を入力');

  await page.getByRole('button', { name: '声で入力（端末の音声認識）' }).click();
  const notice = page.locator('.dictation-consent');
  await notice.waitFor();
  assert.match(await notice.textContent(), /料金はかかりません.*Google・Apple.*文字だけ/s);
  await notice.getByRole('button', { name: '使う' }).click();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="日本語で返答を入力"]').value === '今日は入りたくないのですね。');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ck-prefs')).dictationConsent), true, 'consent is remembered on this device');
  assert.deepEqual(await page.evaluate(() => window.__ckSpeech.langs), ['ja-JP']);
  await page.getByRole('button', { name: '送信' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await page.locator('.chat-message.user .asr-uncertain').waitFor(); // low confidence -> "please check"

  // Second line: no notice any more; the learner corrects the recognised text before sending.
  await page.getByRole('button', { name: '声で入力（端末の音声認識）' }).click();
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="日本語で返答を入力"]').value === '何か気になることはありますか。');
  assert.equal(await notice.count(), 0);
  await page.locator('.dictate-button[aria-pressed="false"]').waitFor(); // recognition has ended
  await box.fill('何か、気になることはございますか。');
  await box.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 3);

  env.mock.state.requests.length = 0;
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  const fb = env.mock.state.requests.find((r) => r.body?.text?.format?.name === 'care_feedback');
  const learner = JSON.parse(fb.body.input).filter((m) => m.role === 'user');
  assert.deepEqual(learner, [
    { role: 'user', text: '今日は入りたくないのですね。', source: 'voice', asrUncertain: true },
    { role: 'user', text: '何か、気になることはございますか。', source: 'voice', edited: true },
  ]);
  assert.deepEqual(page.errors, []);
});

test('dictation: a browser error is explained, and typing still works', async () => {
  const page = await env.page();
  await page.addInitScript(() => localStorage.setItem('ck-prefs', JSON.stringify({ locale: 'zh', level: 'gentle', goal: 5, plan: 'personal', furigana: true, corePreview: false, dictationConsent: true })));
  await fakeRecognizer(page, [{ error: 'not-allowed' }]);
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: 'まずはデモで操作を体験' }).click();
  await page.getByRole('button', { name: '声で入力（端末の音声認識）' }).click();
  const alert = page.locator('.conversation-error');
  await alert.waitFor();
  assert.match(await alert.textContent(), /許可されていません.*没有被允许/s);
  await page.getByLabel('日本語で返答を入力').fill('はい、分かりました。');
  await page.getByLabel('日本語で返答を入力').press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  assert.deepEqual(page.errors, []);
});

test('dictation: no button when the browser has no speech recognition', async () => {
  const page = await env.page();
  await page.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; });
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.getByLabel('日本語で返答を入力').waitFor();
  assert.equal(await page.getByRole('button', { name: '声で入力（端末の音声認識）' }).count(), 0);
  assert.deepEqual(page.errors, []);
});

test('voice check lists the free extras (browser dictation, Japanese device voice) as information', async () => {
  const page = await env.page();
  await page.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; });
  await page.goto(env.baseUrl);
  await page.waitForSelector('html[data-app-ready="true"]', { state: 'attached' });
  await page.getByLabel('学習設定').click();
  await page.getByRole('button', { name: /音声テスト/ }).click();
  await page.getByRole('button', { name: 'テストを始める' }).click();
  const item = page.locator('.voice-check-list li', { hasText: '声で入力（無料）' });
  await item.waitFor();
  assert.equal(await item.getAttribute('data-status'), 'info');
  assert.ok(await page.locator('.voice-check-list li', { hasText: '日本語の読み上げ（端末）' }).count() === 1);
  assert.deepEqual(page.errors, []);
});
