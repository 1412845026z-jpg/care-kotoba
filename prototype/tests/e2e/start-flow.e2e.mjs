// START-FLOW-001: the scene sheet starts in one tap; the conversation type is a default row that
// opens only when the learner wants another one. Support-language text carries its language.
// Run: node tests/run.mjs e2e   (offline harness, mock OpenAI, no cost)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openScene } from './helpers.mjs';

let env;
before(async () => { env = await setup(); await env.requireAiAccess(); });
after(async () => { await env?.close(); });

test('scene sheet: default conversation type, start buttons in the first view, no four-card choice up front', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  const modal = page.locator('.scene-modal');
  await modal.locator('.variant-row').waitFor();
  assert.match(await modal.locator('.variant-row b').textContent(), /穏やかな会話/);
  assert.equal(await modal.locator('.variant-grid').count(), 0, 'the four types are folded away');
  const toggle = modal.getByRole('button', { name: /変える/ });
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  // Both ways to start are visible without scrolling the sheet on a 390x844 phone.
  for (const name of [/音声でAIと話す/, '文字で練習']) {
    const box = await modal.getByRole('button', { name }).boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 844, `${name} is inside the first view (y=${box?.y})`);
  }
  assert.deepEqual(page.errors, []);
});

test('scene sheet: another conversation type can be chosen and reaches the AI instructions', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  const modal = page.locator('.scene-modal');
  await modal.getByRole('button', { name: /変える/ }).click();
  const group = modal.getByRole('radiogroup', { name: '会話のタイプ' });
  await group.waitFor();
  assert.equal(await group.getByRole('radio').count(), 4);
  assert.equal(await group.getByRole('radio', { name: /穏やかな会話/ }).getAttribute('aria-checked'), 'true');
  await group.getByRole('radio', { name: /断られたら/ }).click();
  await modal.locator('.variant-grid').waitFor({ state: 'detached' });
  assert.match(await modal.locator('.variant-row b').textContent(), /断られたら/);

  const before = env.mock.state.requests.length;
  await modal.getByRole('button', { name: '文字で練習' }).click();
  await page.getByLabel('日本語で返答を入力').fill('今日は、入りたくないお気持ちなのですね。');
  await page.locator('.chat-composer button[type=submit]').click();
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  const sent = env.mock.state.requests.slice(before).filter((r) => r.body?.text?.format?.name === 'care_conversation');
  assert.ok(sent.length, 'a conversation request reached the mock');
  assert.match(JSON.stringify(sent.at(-1).body), /最初は提案を断る/, 'the chosen type is part of the instructions');
  assert.deepEqual(page.errors, []);
});

test('scene sheet: closing and reopening goes back to the default type', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  const modal = page.locator('.scene-modal');
  await modal.getByRole('button', { name: /変える/ }).click();
  await modal.getByRole('radio', { name: /予想外のひとこと/ }).click();
  await modal.getByRole('button', { name: '閉じる' }).first().click();
  await modal.waitFor({ state: 'detached' });
  await page.locator('.scene-grid .scene-card', { hasText: '入浴を断られたとき' }).first().click();
  await page.locator('.scene-modal .variant-row').waitFor();
  assert.match(await page.locator('.scene-modal .variant-row b').textContent(), /穏やかな会話/);
  assert.equal(await page.locator('.scene-modal .variant-grid').count(), 0);
});

test('support-language text is marked with its language (zh-Hans by default, en when chosen)', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  const hint = page.locator('.composer-area > p [lang]');
  await hint.waitFor();
  assert.equal(await hint.getAttribute('lang'), 'zh-Hans');
  assert.match(await hint.textContent(), /不用担心说错/);

  const p2 = await env.page();
  await p2.addInitScript(() => localStorage.setItem('ck-prefs', JSON.stringify({ locale: 'en', level: 'gentle', goal: 5, plan: 'personal', furigana: true })));
  await openScene(p2, env.baseUrl, '入浴を断られたとき');
  await p2.getByRole('button', { name: '文字で練習' }).click();
  const hintEn = p2.locator('.composer-area > p [lang]');
  await hintEn.waitFor();
  assert.equal(await hintEn.getAttribute('lang'), 'en');
  await p2.locator('.practice-back').click();
  await p2.locator('.scene-modal').waitFor({ state: 'detached' }).catch(() => {});
  assert.equal(await p2.locator('.topbar .lang-button span').getAttribute('lang'), 'en', 'the language switch names itself in its own language');
  assert.deepEqual([...page.errors, ...p2.errors], []);
});
