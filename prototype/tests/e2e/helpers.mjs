// Shared setup for browser tests: mock OpenAI + app + Chromium.
// BASE_URL can point the browser at a real dev server instead of the offline
// harness (e.g. BASE_URL=http://127.0.0.1:5173 after `pnpm dev`); in that case
// the mock OpenAI server still starts (fixed port with CK_MOCK_PORT), and the dev
// server must be configured with OPENAI_BASE_URL=http://127.0.0.1:<CK_MOCK_PORT>/v1
// and a dummy OPENAI_API_KEY.
import { startHarness } from '../harness/server.mjs';
import { createMockOpenAI } from '../harness/mock-openai.mjs';
import { toolRequire } from '../harness/tool-require.mjs';

const { chromium } = toolRequire('playwright');

export const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' };

export async function setup({ env = {}, launchArgs = [] } = {}) {
  const mock = createMockOpenAI();
  const origin = await mock.listen(Number(process.env.CK_MOCK_PORT || 0));
  if (process.env.BASE_URL) console.log(`# mock OpenAI at ${origin}/v1 (dev server needs OPENAI_BASE_URL=${origin}/v1)`);
  let harness = null;
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    harness = await startHarness({
      env: { OPENAI_API_KEY: 'test-dummy-key-not-real', OPENAI_BASE_URL: `${origin}/v1`, CK_ACCESS_POLICY: 'local', CK_ACCESS_CODE: undefined, ...env },
      rewriteOpenAI: origin,
      rebuild: !process.env.CK_E2E_NO_REBUILD,
    });
    baseUrl = harness.url;
  }
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', ...launchArgs] });
  const pages = [];
  return {
    mock, baseUrl, browser,
    async page(contextOptions = PHONE) {
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
      page.errors = errors;
      pages.push(page);
      return page;
    },
    async close() {
      await browser.close();
      await harness?.close();
      await mock.close();
    },
  };
}

export async function seedStorage(page, entries) {
  await page.addInitScript((e) => { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, entries);
}

export async function openScene(page, baseUrl, title) {
  await page.goto(baseUrl);
  await page.locator('.mobile-nav button', { hasText: 'シーン' }).click();
  await page.getByLabel('シーンを検索').fill(title);
  await page.locator('.scene-grid .scene-card', { hasText: title }).first().click();
  await page.locator('.scene-modal').waitFor();
}

export async function api(baseUrl, path, { method = 'POST', body, headers = {} } = {}) {
  const res = await fetch(baseUrl + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('json')) data = await res.json(); else await res.arrayBuffer();
  return { status: res.status, data, headers: res.headers };
}
