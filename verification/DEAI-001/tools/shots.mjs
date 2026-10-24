// DEAI-001 screenshots on the offline harness. Google Fonts requests are answered locally with the
// same families (BIZ UDPGothic / BIZ UDPMincho, OFL, from @fontsource 5.3.0) so the screens show the
// intended type instead of fallbacks. Nothing goes to the network.
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { setup, openScene, gotoApp, PHONE } from '../../../prototype/tests/e2e/helpers.mjs';

const OUT = process.env.OUT; mkdirSync(OUT, { recursive: true });
const FONTS = process.env.CK_FONTS_DIR; // folder holding x-fontsource-biz-udp{gothic,mincho}-5.3.0/package (npm pack @fontsource/biz-udpgothic@5.3.0 @fontsource/biz-udpmincho@5.3.0, then untar)
const pkgs = readdirSync(FONTS).filter((d) => d.startsWith('x-fontsource-')).map((d) => join(FONTS, d, 'package'));
let fontCss = '';
const files = new Map();
for (const p of pkgs) {
  for (const w of ['400', '700']) fontCss += readFileSync(join(p, `${w}.css`), 'utf8').replace(/url\(\.\/files\/([^)]+)\)/g, (_, f) => { files.set(f, join(p, 'files', f)); return `url(https://fonts.gstatic.com/ck/${f})`; });
}
async function withFonts(page) {
  await page.context().route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss }));
  await page.context().route(/fonts\.gstatic\.com\/ck\//, (r) => { const f = r.request().url().split('/ck/')[1]; const path = files.get(f); return path ? r.fulfill({ status: 200, contentType: f.endsWith('woff2') ? 'font/woff2' : 'font/woff', body: readFileSync(path) }) : r.fulfill({ status: 404 }); });
  return page;
}
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700); };
const DESK = { viewport: { width: 1280, height: 860 }, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' };

const env = await setup({ env: { CK_AI_FURIGANA: '1' } });
await env.requireAiAccess();
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (k) => !only || only.includes(k);
try {
  if (want('home')) {
    const page = await withFonts(await env.page());
    await gotoApp(page, env.baseUrl); await settle(page);
    await page.screenshot({ path: `${OUT}/390-01-home.png` });
    await page.screenshot({ path: `${OUT}/390-01-home-full.png`, fullPage: true });
    await page.locator('.mobile-nav button', { hasText: 'シーン' }).click(); await settle(page);
    await page.screenshot({ path: `${OUT}/390-02-scenes.png` });
    await page.locator('.mobile-nav button', { hasText: '学習記録' }).click().catch(() => {}); await settle(page);
    await page.screenshot({ path: `${OUT}/390-07-progress.png`, fullPage: true });
    console.log('home errors', page.errors);
  }
  if (want('demo')) {
    const page = await withFonts(await env.page());
    await openScene(page, env.baseUrl, '入浴を断られたとき'); await settle(page);
    await page.screenshot({ path: `${OUT}/390-03-scene-modal.png` });
    await page.getByText('まずはデモで操作を体験').click();
    const box = page.getByLabel('日本語で返答を入力');
    for (const line of ['今日は、入りたくないお気持ちなのですね。', '何か、気になることがありますか。']) {
      await box.fill(line); await page.keyboard.press('Enter');
      await page.waitForFunction((n) => document.querySelectorAll('.chat-message.assistant').length >= n, (await page.locator('.chat-message.assistant').count()) + 1);
    }
    await settle(page);
    await page.screenshot({ path: `${OUT}/390-04-practice.png` });
    await page.getByText('終了して振り返る').click();
    await page.getByText('ひとつ、会話を体験しました。').waitFor(); await settle(page);
    { const h = await page.evaluate(() => document.querySelector('.feedback-main').scrollHeight + 140); await page.setViewportSize({ width: 390, height: h }); await settle(page);
      await page.screenshot({ path: `${OUT}/390-05a-demo-feedback.png` }); await page.setViewportSize({ width: 390, height: 844 }); }
    console.log('demo errors', page.errors);
  }
  if (want('ai')) {
    env.mock.state.scenario.quoteMode = 'exact';
    const page = await withFonts(await env.page());
    await openScene(page, env.baseUrl, '入浴を断られたとき');
    await page.getByRole('button', { name: '文字で練習' }).click();
    await page.getByLabel('日本語で返答を入力').fill('今日は、入りたくないお気持ちなのですね。');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
    await page.getByText('終了して振り返る').click();
    await page.locator('.feedback-summary h2').waitFor(); await settle(page);
    await page.screenshot({ path: `${OUT}/390-05-feedback.png` });
    { const h = await page.evaluate(() => document.querySelector('.feedback-main').scrollHeight + 140); await page.setViewportSize({ width: 390, height: h }); await settle(page);
      await page.screenshot({ path: `${OUT}/390-05-feedback-full.png` }); await page.setViewportSize({ width: 390, height: 844 }); }
    const save = page.locator('.correction-card button', { hasText: '保存' }).first();
    if (await save.count()) await save.click();
    await page.getByRole('button', { name: /ホームへ戻る/ }).click(); await page.locator('.mobile-nav button', { hasText: 'ホーム' }).click(); await settle(page);
    await page.screenshot({ path: `${OUT}/390-08-home-after.png`, fullPage: true });
    await page.locator('.mobile-nav button', { hasText: 'ノート' }).click().catch(() => {}); await settle(page);
    await page.screenshot({ path: `${OUT}/390-06-notes.png`, fullPage: true });
    console.log('ai errors', page.errors);
  }
  if (want('desk')) {
    const page = await withFonts(await env.page(DESK));
    await gotoApp(page, env.baseUrl); await settle(page);
    await page.screenshot({ path: `${OUT}/1280-01-home.png` });
    await page.screenshot({ path: `${OUT}/1280-01-home-full.png`, fullPage: true });
    await page.locator('.sidebar button', { hasText: '法人向け管理' }).click(); await settle(page);
    await page.screenshot({ path: `${OUT}/1280-09-admin.png` });
    console.log('desk errors', page.errors);
  }
  if (want('modals')) {
    const page = await withFonts(await env.page());
    await gotoApp(page, env.baseUrl);
    await page.getByRole('button', { name: '学習設定' }).first().click(); await settle(page);
    await page.screenshot({ path: `${OUT}/390-10-settings.png` });
    console.log('modal errors', page.errors);
  }
} finally { await env.close(); }
