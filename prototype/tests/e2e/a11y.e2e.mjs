// A11Y-003: fixes for the axe findings of A11Y-CI-001 and the focus loss Codex saw after choosing a
// conversation type. Run: node tests/run.mjs e2e   (offline harness, mock OpenAI, no cost)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openScene, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); await env.requireAiAccess(); });
after(async () => { await env?.close(); });

const activeInfo = (page) => page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, id: a?.id || '', text: (a?.textContent || '').trim().slice(0, 30) }; });

test('dialogs are named after their heading; icon-only and brand buttons have names that match what is shown', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  // The name includes the furigana (ruby text is read too), so check the link to the visible heading.
  const named = await page.evaluate(() => { const d = document.querySelector('.scene-modal'); const h = d && document.getElementById(d.getAttribute('aria-labelledby') || ''); return !!h && h.tagName === 'H2' && d.contains(h); });
  assert.ok(named, 'the scene sheet is labelled by its own title');
  assert.equal(await page.getByRole('dialog', { name: /られたとき/ }).count(), 1);
  await page.getByRole('button', { name: '閉じる' }).first().click();
  await page.locator('.scene-modal').waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('button', { name: 'レベルで絞り込む' }).count(), 1, 'the mobile filter button has a name');
  await page.locator('.topbar .lang-button').click();
  assert.equal(await page.getByRole('dialog', { name: 'あなたの学び方' }).count(), 1, 'the settings sheet is named');
  await page.keyboard.press('Escape');
  const desk = await env.page({ viewport: { width: 1280, height: 860 }, locale: 'ja-JP' });
  await gotoApp(desk, env.baseUrl);
  assert.equal(await desk.getByRole('button', { name: /Care Kotoba/ }).count(), 1, 'the brand button name contains the visible brand');
  assert.equal(await desk.getByRole('complementary', { name: 'メニュー' }).count(), 1);
  assert.equal(await desk.getByRole('complementary', { name: '今日の記録' }).count(), 1);
  assert.deepEqual([...page.errors, ...desk.errors], []);
});

test('after choosing a conversation type, focus stays on the 変える control (not lost to the page)', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: /変える/ }).click();
  await page.getByRole('radio', { name: /断られたら/ }).click();
  await page.locator('.variant-grid').waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement?.id === 'variant-toggle');
  assert.equal((await activeInfo(page)).id, 'variant-toggle');
});

test('practice covers the page as a named dialog: the page behind is inert, one main landmark, focus comes back on close', async () => {
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.getByRole('dialog', { name: '入浴を断られたとき' }).waitFor();
  assert.equal(await page.getByRole('heading', { level: 1, name: '入浴を断られたとき' }).count(), 1);
  assert.equal(await page.getByRole('main').count(), 1, 'only the practice main is exposed');
  assert.equal(await page.getByRole('banner').count(), 1, 'only the practice header is exposed');
  assert.equal(await page.locator('.practice-root').getByRole('banner').count(), 1);
  assert.ok(await page.evaluate(() => document.querySelector('.app-shell').inert && document.querySelector('.mobile-nav').inert), 'page behind is inert');
  await page.getByRole('button', { name: /戻る/ }).click();
  await page.locator('.practice-root').waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body);
  assert.equal(await page.evaluate(() => document.querySelector('.app-shell').inert), false, 'page is usable again');
  assert.notEqual((await activeInfo(page)).tag, 'BODY');
  assert.deepEqual(page.errors, []);
});

test('feedback is a named dialog and its sections do not skip heading levels', async () => {
  env.mock.state.scenario.quoteMode = 'exact';
  const page = await env.page();
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.getByLabel('日本語で返答を入力').fill('今日は、入りたくないお気持ちなのですね。');
  await page.locator('.chat-composer button[type=submit]').click();
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  assert.equal(await page.getByRole('dialog', { name: 'おつかれさまでした。' }).count(), 1);
  const levels = await page.$$eval('.feedback-main :is(h1,h2,h3,h4)', (hs) => hs.map((h) => Number(h.tagName[1])));
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] <= 1, `heading levels ${levels.join(',')} skip at ${i}`);
  assert.deepEqual(page.errors, []);
});
