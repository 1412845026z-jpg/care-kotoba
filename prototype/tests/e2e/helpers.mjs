// Shared setup for browser tests: mock OpenAI + app + Chromium.
//
// Two modes:
//  - Offline harness (default): starts tests/harness/server.mjs with the env each suite asks for.
//  - BASE_URL=http://127.0.0.1:5173 : drives an already running `pnpm dev` instead. The test
//    process cannot reconfigure that server, so:
//      * start the mock with a fixed port (CK_MOCK_PORT=4010) and the dev server with
//        OPENAI_BASE_URL=http://127.0.0.1:4010/v1 and a dummy OPENAI_API_KEY;
//      * app/voice suites need either CK_ACCESS_POLICY=local on the server, or the server's
//        access code in CK_E2E_ACCESS_CODE (the helpers then log in first);
//      * the access suite needs a server with CK_ACCESS_CODE set and the same value in
//        CK_E2E_ACCESS_CODE; tests that must reconfigure the server are skipped with a reason.
// See tests/README.md.
import { startHarness } from '../harness/server.mjs';
import { createMockOpenAI } from '../harness/mock-openai.mjs';
import { toolRequire } from '../harness/tool-require.mjs';

const { chromium } = toolRequire('playwright');

export const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' };
export const EXTERNAL = !!process.env.BASE_URL;

/** Readiness contract: app/page.tsx sets <html data-app-ready="true"> once React has hydrated/mounted. */
export const READY_SELECTOR = 'html[data-app-ready="true"]';

const defaultLaunch = (options) => chromium.launch(options);

/** Close everything that was started, in reverse order. Every step runs even if an earlier one fails. */
async function closeAll(resources) {
  const errors = [];
  for (const r of [...resources].reverse()) {
    try { await r.close(); } catch (e) { errors.push(`${r.name}: ${e?.message || e}`); }
  }
  resources.length = 0;
  return errors;
}

/**
 * Starts mock OpenAI, the harness (unless BASE_URL) and Chromium. If any step fails, the ones that
 * already started are closed before the ORIGINAL error is rethrown, so a failed `before` (e.g. a
 * missing Chromium executable) cannot leave servers that keep the test process alive.
 * `launch` is injectable for the cleanup regression test; it gets ({ baseUrl, mockOrigin }) too.
 */
export async function setup({ env = {}, launchArgs = [], launch = defaultLaunch } = {}) {
  const resources = [];
  try {
    return await startAll({ env, launchArgs, launch, resources });
  } catch (error) {
    const cleanupErrors = await closeAll(resources);
    if (cleanupErrors.length) console.error(`# setup cleanup also failed: ${cleanupErrors.join('; ')}`);
    throw error;
  }
}

async function startAll({ env, launchArgs, launch, resources }) {
  const mock = createMockOpenAI();
  resources.push({ name: 'mock OpenAI', close: () => mock.close() });
  const origin = await mock.listen(Number(process.env.CK_MOCK_PORT || 0));
  if (EXTERNAL) console.log(`# mock OpenAI at ${origin}/v1 (dev server needs OPENAI_BASE_URL=${origin}/v1)`);
  let harness = null;
  let baseUrl = process.env.BASE_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    harness = await startHarness({
      env: { OPENAI_API_KEY: 'test-dummy-key-not-real', OPENAI_BASE_URL: `${origin}/v1`, CK_ACCESS_POLICY: 'local', CK_ACCESS_CODE: undefined, CK_RATE_LIMIT_MULTIPLIER: '100', ...env },
      rewriteOpenAI: origin,
      rebuild: !process.env.CK_E2E_NO_REBUILD,
    });
    resources.push({ name: 'harness', close: () => harness.close() });
    baseUrl = harness.url;
  }
  const serverAccess = (await api(baseUrl, '/api/access', { method: 'GET' })).data;
  const accessCode = EXTERNAL ? process.env.CK_E2E_ACCESS_CODE || '' : env.CK_ACCESS_CODE || '';
  let cookie = '';
  async function loginCookie() {
    if (cookie || !serverAccess?.required || !accessCode) return cookie;
    const r = await api(baseUrl, '/api/access', { body: { code: accessCode } });
    if (r.status !== 200) throw new Error(`login with the configured access code failed: HTTP ${r.status} ${JSON.stringify(r.data)}`);
    cookie = (r.headers.get('set-cookie') || '').split(';')[0];
    return cookie;
  }
  const browser = await launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', ...launchArgs] }, { baseUrl, mockOrigin: origin });
  resources.push({ name: 'Chromium', close: () => browser.close() });
  const pages = [];
  return {
    mock, baseUrl, browser, serverAccess, accessCode,
    /** For suites that expect AI routes to be usable: fails fast with a clear reason when they are not. */
    async requireAiAccess() {
      if (!serverAccess) throw new Error(`GET ${baseUrl}/api/access did not answer JSON; is this the Care Kotoba dev server?`);
      if (serverAccess.required && !accessCode) throw new Error('the server requires an access code (policy "code"): set CK_E2E_ACCESS_CODE to it, or restart the dev server with CK_ACCESS_POLICY=local');
      if (!serverAccess.configured) throw new Error(`the server refuses AI calls (policy "${serverAccess.policy}", not configured for this host)`);
      await loginCookie();
    },
    loginCookie,
    /** Headers for Node-side API calls that should be authorised (cookie when the server uses an access code). */
    async authHeaders() { const c = await loginCookie(); return c ? { cookie: c } : {}; },
    async page(contextOptions = PHONE, { login = true } = {}) {
      const context = await browser.newContext(contextOptions);
      if (login && serverAccess?.required && accessCode) {
        const r = await context.request.post(baseUrl + '/api/access', { data: { code: accessCode } });
        if (!r.ok()) throw new Error(`browser login failed: HTTP ${r.status()}`);
      }
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
      page.errors = errors;
      pages.push(page);
      return page;
    },
    async close() {
      const errors = await closeAll(resources);
      if (errors.length) throw new Error(`cleanup failed: ${errors.join('; ')}`);
    },
  };
}

export async function seedStorage(page, entries) {
  await page.addInitScript((e) => { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, entries);
}

/** Navigate and wait for the readiness contract instead of clicking server-rendered, not yet hydrated buttons. */
export async function gotoApp(page, url) {
  await page.goto(url);
  await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: 30000 });
}

export async function openScene(page, url, title) {
  await gotoApp(page, url);
  const mobile = page.locator('.mobile-nav button', { hasText: 'シーン' });
  if (await mobile.isVisible()) await mobile.click();
  else await page.locator('.sidebar nav button', { hasText: 'シーンを探す' }).click(); // desktop layout
  await page.getByLabel('シーンを検索').fill(title);
  await page.locator('.scene-grid .scene-card', { hasText: title }).first().click();
  await page.locator('.scene-modal').waitFor();
}

/** Opens one of the optional core drafts (CORE-PREVIEW-001): ?core=1 turns the preview on, then the core pill lists them. */
export async function openCoreScene(page, baseUrl, title) {
  await gotoApp(page, `${baseUrl}/?core=1`);
  const mobile = page.locator('.mobile-nav button', { hasText: 'シーン' });
  if (await mobile.isVisible()) await mobile.click();
  else await page.locator('.sidebar nav button', { hasText: 'シーンを探す' }).click();
  await page.locator('.core-pill').click();
  await page.locator('.scene-grid .scene-card', { hasText: title }).first().click();
  await page.locator('.scene-modal').waitFor();
}

// Development servers show their own error overlay for errors that React already caught in an error boundary
// (vinext: #__vinext_dev_error_overlay_root). It covers the page and intercepts clicks (ENV-004, real dev).
// The crash tests check OUR boundary, which is what learners see in production builds, so they hide it.
const DEV_OVERLAY = '#__vinext_dev_error_overlay_root,[data-vinext-dev-error-overlay],vite-error-overlay,nextjs-portal';
export async function hideDevErrorOverlay(page) {
  await page.addInitScript((sel) => {
    const add = () => { const s = document.createElement('style'); s.dataset.ckTest = 'hide-dev-overlay'; s.textContent = `${sel}{display:none!important;pointer-events:none!important}`; document.head.appendChild(s); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  }, DEV_OVERLAY);
}
/** True when a dev error overlay element is in the page (hidden or not); the offline harness never has one. */
export const devErrorOverlayPresent = (page) => page.evaluate((sel) => !!document.querySelector(sel), DEV_OVERLAY);
/** Harness only: puts a full-screen element like vinext's overlay into the page, to prove hideDevErrorOverlay works. */
export const simulateDevErrorOverlay = (page) => page.evaluate(() => { const d = document.createElement('div'); d.id = '__vinext_dev_error_overlay_root'; d.setAttribute('data-vinext-dev-error-overlay', ''); d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0003'; document.body.appendChild(d); });

export async function api(baseUrl, path, { method = 'POST', body, headers = {} } = {}) {
  const res = await fetch(baseUrl + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('json')) data = await res.json().catch(() => null); else await res.arrayBuffer();
  return { status: res.status, data, headers: res.headers, contentType: type };
}
