// Access protection for the paid AI routes (mock OpenAI).
// Offline harness: the suite starts its own server with an access code.
// BASE_URL mode: needs a dev server started with CK_ACCESS_CODE=<code> and the same value in
// CK_E2E_ACCESS_CODE; otherwise the suite is skipped (it cannot reconfigure an external server).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { setup, openScene, gotoApp, api, EXTERNAL } from './helpers.mjs';

const HARNESS_CODE = 'pilot-code-2026';
let env, code, skipAll = false;
before(async () => {
  env = await setup({ env: { CK_ACCESS_POLICY: undefined, CK_ACCESS_CODE: HARNESS_CODE } });
  code = env.accessCode;
  if (EXTERNAL && (!env.serverAccess?.required || !code)) {
    skipAll = `external server policy is "${env.serverAccess?.policy}"${code ? '' : ' and CK_E2E_ACCESS_CODE is not set'}; start the dev server with CK_ACCESS_CODE and pass the same value in CK_E2E_ACCESS_CODE to run this suite`;
  }
});
after(async () => { await env?.close(); });

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const flipFirstByte = (part) => { const b = Buffer.from(part, 'base64url'); b[0] ^= 0x01; return b.toString('base64url'); };
const aliasOf = (part) => part.slice(0, -1) + B64URL[B64URL.indexOf(part.at(-1)) ^ 1];
/** "ck_access=v1.access.<payload>.<sig>" with <sig> replaced by f(<sig>). */
function editSignature(pair, f) {
  const eq = pair.indexOf('=');
  const parts = pair.slice(eq + 1).split('.');
  assert.equal(parts.length, 4, 'unexpected cookie format');
  parts[3] = f(parts[3]);
  return pair.slice(0, eq + 1) + parts.join('.');
}

const chatBody = { scenarioId: 'bath-5', variant: 'gentle', locale: 'zh', level: 'gentle', messages: [{ role: 'user', text: 'こんにちは。' }] };

function rawPost(baseUrl, path, { host, body, cookie } = {}) {
  const u = new URL(baseUrl + path);
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body || {}));
    const req = httpRequest({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': data.length, ...(host ? { host } : {}), ...(cookie ? { cookie } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { let json = null; try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {} resolve({ status: res.statusCode, data: json, headers: res.headers }); });
    });
    req.on('error', reject);
    req.end(data);
  });
}

test('AI routes refuse requests without access (no Origin header, like curl)', async (t) => {
  if (skipAll) return t.skip(skipAll);
  const before = env.mock.state.requests.length;
  for (const path of ['/api/chat', '/api/feedback', '/api/speech', '/api/session']) {
    const body = path === '/api/speech' ? { text: 'こんにちは' } : path === '/api/session' ? { ...chatBody, sdp: 'v=0' } : chatBody;
    const res = await api(env.baseUrl, path, { body });
    assert.equal(res.status, 401, `${path} answered ${res.status} without access`);
    assert.equal(res.data?.code, 'access_required', `${path}: expected the app's JSON refusal, got ${res.contentType}`);
  }
  assert.equal(env.mock.state.requests.length, before, 'an unauthenticated request reached the (mock) OpenAI API');
});

test('a wrong access code is rejected and the right one grants an HttpOnly cookie', async (t) => {
  if (skipAll) return t.skip(skipAll);
  const wrong = await api(env.baseUrl, '/api/access', { body: { code: 'nope' } });
  assert.equal(wrong.status, 401);
  const ok = await api(env.baseUrl, '/api/access', { body: { code } });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get('set-cookie') || '';
  assert.match(cookie, /ck_access=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  const chat = await api(env.baseUrl, '/api/chat', { body: chatBody, headers: { cookie: cookie.split(';')[0] } });
  assert.equal(chat.status, 200, JSON.stringify(chat.data));
  assert.ok(chat.data.reply);
  // Tamper so the signature BYTES change. Editing the last character is not enough: its lowest bits
  // are unused base64 padding (COOKIE-ENCODING-001), so "...A" -> "...B" can be the same signature.
  const pair = cookie.split(';')[0];
  const forged = await api(env.baseUrl, '/api/chat', { body: chatBody, headers: { cookie: editSignature(pair, flipFirstByte) } });
  assert.equal(forged.status, 401, 'a cookie with a changed signature byte was accepted');
  // Same bytes, non-canonical spelling: rejected by the token contract (lib/signing.ts), deterministically.
  const alias = await api(env.baseUrl, '/api/chat', { body: chatBody, headers: { cookie: editSignature(pair, aliasOf) } });
  assert.equal(alias.status, 401, 'a non-canonical alias of a valid cookie was accepted');
});

test('without an access code, AI routes only answer on localhost', async (t) => {
  // Reconfigures the server (removes the code) and spoofs the Host header. Only meaningful in the
  // harness: a Vite dev server rejects unknown Host headers itself (an HTML 403 that is not the app's),
  // and the test process cannot change a running Worker's environment.
  if (EXTERNAL) return t.skip('harness only: needs to reconfigure the server and spoof Host');
  const saved = process.env.CK_ACCESS_CODE;
  delete process.env.CK_ACCESS_CODE;
  try {
    const local = await rawPost(env.baseUrl, '/api/chat', { body: chatBody });
    assert.equal(local.status, 200, 'local development without a code should work');
    const remote = await rawPost(env.baseUrl, '/api/chat', { host: 'care-kotoba.example.com', body: chatBody });
    assert.equal(remote.status, 403, 'a public host without access configuration must be refused');
    assert.equal(remote.data?.code, 'access_not_configured', 'the 403 must be the app refusal (JSON code), not a generic host block');
  } finally {
    process.env.CK_ACCESS_CODE = saved;
  }
});

test('the learner is asked for the access code before an AI practice, and the demo needs none', async (t) => {
  if (skipAll) return t.skip(skipAll);
  const page = await env.page(undefined, { login: false });
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByText('まずはデモで操作を体験').click();
  await page.getByText('DEMO').first().waitFor();
  await page.getByRole('button', { name: /戻る/ }).click();

  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await page.getByRole('button', { name: '文字で練習' }).click();
  const field = page.getByLabel('アクセスコード');
  await field.waitFor();
  await field.fill('wrong-code');
  await page.getByRole('button', { name: /確認して続ける/ }).click();
  await page.locator('.access-error').waitFor();
  await field.fill(code);
  await page.getByRole('button', { name: /確認して続ける/ }).click();
  await page.getByLabel('日本語で返答を入力').fill('今日は、入りたくないお気持ちなのですね。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  assert.deepEqual(page.errors, []);
});

test('deleting this device\'s learning data also forgets the access code', async (t) => {
  if (skipAll) return t.skip(skipAll);
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  const before = await page.evaluate(() => fetch('/api/access').then((r) => r.json()));
  assert.equal(before.granted, true, 'test setup: the browser is logged in');
  await page.getByRole('button', { name: '学習設定' }).click();
  await page.getByRole('button', { name: 'この端末の学習データを削除' }).click();
  await page.getByRole('button', { name: '削除する' }).click();
  await page.locator('.toast', { hasText: '削除しました' }).waitFor();
  const after = await page.evaluate(() => fetch('/api/access').then((r) => r.json()));
  assert.equal(after.granted, false, 'access cookie still valid after deleting local data');
});
