// I18N-001: Japanese is the base; the learner may add a support language (en/zh/vi/my/id). Each gloss carries
// its language; vi/my/id gaps fall back to English marked en; Chinese never appears under another label.
// Run: node tests/run.mjs e2e   (offline harness, no AI call)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

const prefs = (locale) => ({ locale, level: 'gentle', goal: 5, plan: 'personal', furigana: true });
async function withLocale(locale) {
  const page = await env.page();
  if (locale) await page.addInitScript((p) => localStorage.setItem('ck-prefs', JSON.stringify(p)), prefs(locale));
  await gotoApp(page, env.baseUrl);
  return page;
}
/** Every element marked with a language, as [lang, text] (direct text only, so nested marks are not double counted). */
const marked = (page) => page.evaluate(() => [...document.querySelectorAll('body [lang]')].map((e) => [e.getAttribute('lang'), [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()]).filter(([, t]) => t));
const HAN = /[一-鿿]/;

test('default: Japanese only. No glosses, no Chinese, the selector offers six languages named in their own language', async () => {
  const page = await withLocale(null);
  assert.equal(await page.locator('.nav-gloss').count(), 0);
  assert.equal(await page.locator('[lang="zh-Hans"]').count(), 0);
  assert.equal(await page.locator('.mobile-nav.has-gloss').count(), 0);
  await page.locator('.topbar .lang-button').click();
  const select = page.locator('.settings-modal select').first();
  const options = await select.locator('option').evaluateAll((os) => os.map((o) => [o.value, o.getAttribute('lang'), o.textContent]));
  assert.deepEqual(options.map((o) => o[0]), ['ja', 'en', 'zh', 'vi', 'my', 'id']);
  assert.deepEqual(options.map((o) => o[1]), ['ja', 'en', 'zh-Hans', 'vi', 'my', 'id']);
  assert.equal(options[3][2], 'Tiếng Việt (bản nháp)', 'the draft mark is in the same language as the name');
  assert.match(options[4][2], /မြန်မာ/);
  assert.equal(await select.inputValue(), 'ja');
  // Choosing a language applies at once and is kept on this device.
  await select.selectOption('vi');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ck-prefs') || '{}').locale === 'vi');
  assert.equal(await page.locator('.settings-lang-note [lang="vi"]').count(), 1, 'Vietnamese interface words are labelled as drafts');
  assert.deepEqual(page.errors, []);
});

for (const [locale, tag, home, sample] of [
  ['zh', 'zh-Hans', '首页', HAN],
  ['en', 'en', 'Home', /Home/],
  ['vi', 'vi', 'Trang chủ', /Trang chủ/],
  ['my', 'my', 'ပင်မ', /[က-႟]/],
  ['id', 'id', 'Beranda', /Beranda/],
]) {
  test(`${locale}: key glosses are in ${tag}; nothing Chinese under another label`, async () => {
    const page = await withLocale(locale);
    const gloss = page.locator('.mobile-nav button').first().locator('.nav-gloss');
    assert.equal(await gloss.getAttribute('lang'), tag);
    assert.equal(await gloss.textContent(), home);
    assert.equal(await page.locator('.topbar .lang-button span').getAttribute('lang'), tag);
    // The gloss sits inside the button's name, so screen readers read both.
    assert.match(await page.locator('.mobile-nav button').first().textContent(), sample);
    // Data deletion: the warning and both buttons carry a gloss (Burmese falls back to English for the long warning).
    await page.locator('.topbar .lang-button').click();
    await page.getByRole('button', { name: /この端末の学習データを削除/ }).click();
    const warn = page.locator('.clear-confirm p > [lang]');
    assert.equal(await warn.getAttribute('lang'), locale === 'my' ? 'en' : tag);
    assert.equal(await page.locator('.clear-confirm .btn-gloss').count(), 2);
    const bad = (await marked(page)).filter(([l, t]) => l !== 'zh-Hans' && l !== 'ja' && HAN.test(t.replace(/書き出す|ことばノート/g, '')));
    assert.deepEqual(bad, [], 'no Chinese text under a non-Chinese label');
    // The only Chinese on the page is the selector's own option 「简体中文」.
    if (locale !== 'zh') assert.equal(await page.locator('[lang="zh-Hans"]:not(option)').count(), 0);
    assert.deepEqual(page.errors, []);
  });
}

test('voice-unavailable message gets a gloss in the support language', async () => {
  const page = await env.page();
  await page.addInitScript((p) => { localStorage.setItem('ck-prefs', JSON.stringify(p)); window.speechSynthesis.getVoices = () => [{ lang: 'en-US', name: 'English only' }]; window.speechSynthesis.speak = () => {}; }, prefs('id'));
  await gotoApp(page, env.baseUrl);
  await page.locator('.mobile-nav button', { hasText: '基礎' }).click();
  await page.locator('.basic-topic').first().click();
  await page.locator('.basic-scene-row').first().click();
  await page.locator('.basic-line').first().getByRole('button', { name: 'ゆっくり聞く' }).click();
  const toast = page.locator('.toast');
  await toast.waitFor();
  assert.match(await toast.textContent(), /この端末には日本語の音声がありません/);
  assert.equal(await toast.locator('.toast-gloss').getAttribute('lang'), 'id');
  assert.match(await toast.locator('.toast-gloss').textContent(), /tidak punya suara bahasa Jepang/);
  assert.deepEqual(page.errors, []);
});

test('a stored Chinese setting from an older version is kept', async () => {
  const page = await withLocale('zh');
  await page.locator('.topbar .lang-button').click();
  assert.equal(await page.locator('.settings-modal select').first().inputValue(), 'zh');
  assert.deepEqual(page.errors, []);
});
