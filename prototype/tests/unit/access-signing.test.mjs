import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { accessConfig, checkAccess, grantAccess } from '@/lib/access';
import { signToken, verifyToken, safeEqual, b64url, fromB64url, fromCanonicalB64url } from '@/lib/signing';
import { resetRateLimits, rateLimit } from '@/lib/rate-limit';

const getter = (vars) => (k) => vars[k];
const req = (url, cookie) => new Request(url, { method: 'POST', headers: cookie ? { cookie } : {} });
beforeEach(() => resetRateLimits());

test('policy defaults: code when a code is set, otherwise local; short codes are ignored', () => {
  assert.equal(accessConfig(getter({})).policy, 'local');
  assert.equal(accessConfig(getter({ CK_ACCESS_CODE: 'abcdef' })).policy, 'code');
  assert.equal(accessConfig(getter({ CK_ACCESS_CODE: 'abc' })).policy, 'local');
  assert.equal(accessConfig(getter({ CK_ACCESS_POLICY: 'open' })).policy, 'open');
  assert.equal(accessConfig(getter({ CK_ACCESS_POLICY: 'code' })).configured, false);
});

test('local policy only admits localhost hosts', async () => {
  const g = getter({});
  assert.equal((await checkAccess(req('http://localhost:5173/api/chat'), g)).ok, true);
  assert.equal((await checkAccess(req('http://127.0.0.1:5173/api/chat'), g)).ok, true);
  const remote = await checkAccess(req('https://care.example.com/api/chat'), g);
  assert.equal(remote.ok, false);
  assert.equal(remote.code, 'access_not_configured');
});

test('code policy: cookie from a correct code works, tampering and rotation invalidate it', async () => {
  const vars = { CK_ACCESS_CODE: 'pilot-code-1,pilot-code-2', OPENAI_API_KEY: 'k' };
  const g = getter(vars);
  assert.equal((await grantAccess(req('https://x.test/api/access'), g, 'wrong')).status, 401);
  const ok = await grantAccess(req('https://x.test/api/access'), g, 'pilot-code-2');
  assert.equal(ok.status, 200);
  assert.match(ok.cookie, /; Secure$/);
  const cookie = ok.cookie.split(';')[0];
  assert.equal((await checkAccess(req('https://x.test/api/chat', cookie), g)).ok, true);
  assert.equal((await checkAccess(req('https://x.test/api/chat'), g)).code, 'access_required');
  assert.equal((await checkAccess(req('https://x.test/api/chat', cookie.slice(0, -2) + 'xx'), g)).ok, false);
  vars.CK_ACCESS_CODE = 'pilot-code-3';
  assert.equal((await checkAccess(req('https://x.test/api/chat', cookie), g)).ok, false, 'rotating the code must revoke old cookies');
});

test('expired cookie is refused', async () => {
  const g = getter({ CK_ACCESS_CODE: 'pilot-code-1', CK_ACCESS_TTL_DAYS: '1' });
  const ok = await grantAccess(req('http://localhost/api/access'), g, 'pilot-code-1');
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 2 * 86400000;
    assert.equal((await checkAccess(req('http://localhost/api/chat', ok.cookie.split(';')[0]), g)).ok, false);
  } finally { Date.now = realNow; }
});

test('code guessing is rate limited per client', async () => {
  const g = getter({ CK_ACCESS_CODE: 'pilot-code-1' });
  let last;
  for (let i = 0; i < 11; i++) last = await grantAccess(new Request('https://x.test/api/access', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' } }), g, 'guess' + i);
  assert.equal(last.status, 429);
});

test('correct codes are not throttled, so testers are never locked out by successful logins', async () => {
  const g = getter({ CK_ACCESS_CODE: 'pilot-code-1' });
  for (let i = 0; i < 15; i++) {
    const r = await grantAccess(new Request('https://x.test/api/access', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.10' } }), g, 'pilot-code-1');
    assert.equal(r.status, 200, `login ${i + 1}`);
  }
});

test('signed tokens are bound to secret and purpose', async () => {
  const t = await signToken('s1', 'voice', { cid: 'rtc_1' });
  assert.deepEqual(await verifyToken('s1', 'voice', t), { cid: 'rtc_1' });
  assert.equal(await verifyToken('s2', 'voice', t), null);
  assert.equal(await verifyToken('s1', 'access', t), null);
  assert.equal(await verifyToken('s1', 'voice', t.replace('v1.voice.', 'v1.voice.e')), null);
  assert.equal(await verifyToken('s1', 'voice', 123), null);
  assert.equal(await safeEqual('a', 'a'), true);
  assert.equal(await safeEqual('a', 'b'), false);
});

// --- COOKIE-ENCODING-001 (Codex CI-003): base64url aliases and real tampering -----------------
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** Same bytes, different string: flip the lowest bit of the last character (always an unused bit when length % 4 is 2 or 3). */
const aliasOf = (part) => part.slice(0, -1) + ALPHABET[ALPHABET.indexOf(part.at(-1)) ^ 1];
/** Really different bytes: decode, flip one bit of the first byte, encode canonically again. */
const flipFirstByte = (part) => { const b = fromB64url(part); b[0] ^= 0x01; return b64url(b); };
const withPart = (token, i, f) => { const p = token.split('.'); p[i] = f(p[i]); return p.join('.'); };
const SECRET = 'diagnostic-only-not-a-real-secret';

test('deterministic fixture: the old "last character A->B" edit kept the HMAC bytes, and is now rejected', async () => {
  // Same fixture as verification/CI-003/reproduce_cookie_encoding.mjs (fake secret, first counter whose token ends in "A").
  let token, counter;
  for (counter = 0; counter < 512; counter++) {
    token = await signToken(SECRET, 'access', { sub: 'fictional', exp: 1900000000, counter });
    if (token.endsWith('A')) break;
  }
  assert.ok(token.endsWith('A'), 'fixture not found');
  assert.equal(counter, 14, 'HMAC is deterministic, so the fixture is stable');
  const alias = token.slice(0, -1) + 'B';
  assert.deepEqual(fromB64url(alias.split('.')[3]), fromB64url(token.split('.')[3]), 'A and B decode to the same 32 signature bytes');
  assert.deepEqual(await verifyToken(SECRET, 'access', token), { sub: 'fictional', exp: 1900000000, counter: 14 });
  assert.equal(await verifyToken(SECRET, 'access', alias), null, 'non-canonical alias must be rejected');
});

test('every token: a changed signature byte is rejected, and so are non-canonical aliases of signature and payload', async () => {
  for (let i = 0; i < 24; i++) {
    const token = await signToken(SECRET, i % 2 ? 'voice' : 'access', { i, pad: 'x'.repeat(i) });
    const purpose = i % 2 ? 'voice' : 'access';
    assert.ok(await verifyToken(SECRET, purpose, token));
    const [, , body, sig] = token.split('.');
    assert.equal(sig.length, 43);
    assert.notDeepEqual(fromB64url(flipFirstByte(sig)), fromB64url(sig));
    assert.equal(await verifyToken(SECRET, purpose, withPart(token, 3, flipFirstByte)), null, 'changed signature byte accepted');
    assert.equal(await verifyToken(SECRET, purpose, withPart(token, 3, aliasOf)), null, 'signature alias accepted');
    if (body.length % 4 !== 0) {
      assert.deepEqual(fromB64url(aliasOf(body)), fromB64url(body));
      assert.equal(await verifyToken(SECRET, purpose, withPart(token, 2, aliasOf)), null, 'payload alias accepted');
    }
    assert.equal(await verifyToken(SECRET, purpose, withPart(token, 3, (p) => p + '=')), null, 'padding accepted');
    assert.equal(await verifyToken(SECRET, purpose, withPart(token, 3, (p) => p.replace(/-/g, '+').replace(/_/g, '/'))) === null || !/[-_]/.test(sig), true, 'standard base64 alphabet accepted');
  }
});

test('canonical decoder: only what b64url() produces', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  const s = b64url(bytes);
  assert.deepEqual(fromCanonicalB64url(s), bytes);
  for (const bad of [s + '=', s.replace(/-/g, '+'), ' ' + s, 'A', 'AB', 'AAB']) assert.equal(fromCanonicalB64url(bad), null, JSON.stringify(bad));
  assert.deepEqual(fromCanonicalB64url('AA'), new Uint8Array([0]));
  assert.deepEqual(fromCanonicalB64url(''), new Uint8Array([]));
});

test('rate limiter window', () => {
  for (let i = 0; i < 3; i++) assert.ok(rateLimit('k', 3, 1000, 1000 + i).ok);
  const r = rateLimit('k', 3, 1000, 1500);
  assert.equal(r.ok, false);
  assert.ok(rateLimit('k', 3, 1000, 2100).ok);
});
