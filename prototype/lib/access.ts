// Access protection for the routes that spend API money (chat, feedback, speech, voice session).
//
// Policies (env CK_ACCESS_POLICY):
//   code  - visitors must enter one of CK_ACCESS_CODE (comma-separated) once; an HttpOnly,
//           SameSite=Strict, HMAC-signed cookie then grants access for CK_ACCESS_TTL_DAYS (default 14).
//   open  - no check. Only for deployments already behind platform access control
//           (e.g. the original private Sites site, Cloudflare Access).
//   local - only requests whose URL host is localhost/127.0.0.1/::1. For development; on a platform
//           that routes by Host header (Cloudflare) a public visitor cannot reach the app as localhost.
// Default: `code` when CK_ACCESS_CODE is set, otherwise `local`. A public deployment without
// configuration therefore refuses AI requests instead of spending the API key's balance.
//
// This is a pilot/test gate, not an account system: no per-user identity, no organisation roles.
import { deriveSecret, randomId, safeEqual, signToken, verifyToken } from './signing';
import { isRateLimited, recordHit, ROUTE_LIMITS } from './rate-limit';

export type Getter = (name: string) => string | undefined;
export type AccessPolicy = 'code' | 'open' | 'local';
export const ACCESS_COOKIE = 'ck_access';

export function accessConfig(get: Getter) {
  const codes = (get('CK_ACCESS_CODE') || '').split(',').map((c) => c.trim()).filter((c) => c.length >= 6);
  const raw = (get('CK_ACCESS_POLICY') || '').trim().toLowerCase();
  const policy: AccessPolicy = raw === 'open' || raw === 'local' || raw === 'code' ? raw : codes.length ? 'code' : 'local';
  const ttlDays = Math.min(90, Math.max(1, Number(get('CK_ACCESS_TTL_DAYS')) || 14));
  return { policy, codes, ttlDays, configured: policy !== 'code' || codes.length > 0 };
}

export function isLocalRequest(req: Request) {
  const host = new URL(req.url).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}

export function clientKey(req: Request) {
  return (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim().slice(0, 64);
}

async function signingSecret(get: Getter, codes: string[]) {
  // Rotating CK_ACCESS_CODE (or CK_SESSION_SECRET) invalidates every issued cookie.
  const base = get('CK_SESSION_SECRET') || get('OPENAI_API_KEY') || 'ck-unkeyed';
  return deriveSecret(base, 'ck-access-v1|' + [...codes].sort().join('\n'));
}

function readCookie(req: Request, name: string) {
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export type AccessResult = { ok: true; subject: string; policy: AccessPolicy } | { ok: false; status: number; code: string; error: string; policy: AccessPolicy };

export async function checkAccess(req: Request, get: Getter): Promise<AccessResult> {
  const { policy, codes } = accessConfig(get);
  if (policy === 'open') return { ok: true, subject: 'ip:' + clientKey(req), policy };
  if (policy === 'local') {
    return isLocalRequest(req)
      ? { ok: true, subject: 'local', policy }
      : { ok: false, status: 403, code: 'access_not_configured', error: 'このサイトでは、AI練習の利用設定がされていません。デモで操作を体験できます。', policy };
  }
  if (!codes.length) return { ok: false, status: 403, code: 'access_not_configured', error: 'このサイトでは、AI練習の利用設定がされていません。デモで操作を体験できます。', policy };
  const token = readCookie(req, ACCESS_COOKIE);
  const payload = token ? await verifyToken<{ sub: string; exp: number }>(await signingSecret(get, codes), 'access', token) : null;
  if (payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() && typeof payload.sub === 'string') {
    return { ok: true, subject: 'tok:' + payload.sub, policy };
  }
  return { ok: false, status: 401, code: 'access_required', error: 'AI練習には、アクセスコードが必要です。', policy };
}

export async function grantAccess(req: Request, get: Getter, code: unknown): Promise<{ status: number; body: Record<string, unknown>; cookie?: string }> {
  const { policy, codes, ttlDays } = accessConfig(get);
  if (policy !== 'code') return { status: 200, body: { granted: true, policy } };
  if (!codes.length) return { status: 403, body: { error: 'アクセスコードが設定されていません。', code: 'access_not_configured' } };
  // Only wrong codes count towards the limit, so testers re-entering a correct code are never locked out.
  const attemptKey = 'access:' + clientKey(req);
  const limited = isRateLimited(attemptKey, ROUTE_LIMITS.accessAttempt.limit, ROUTE_LIMITS.accessAttempt.windowMs);
  if (limited.limited) return { status: 429, body: { error: `試行回数が多すぎます。${limited.retryAfterSeconds}秒後にもう一度お試しください。`, code: 'rate_limited' } };
  const given = typeof code === 'string' ? code.trim().slice(0, 200) : '';
  let match = false;
  for (const c of codes) if (await safeEqual(given, c)) match = true;
  if (!match) { recordHit(attemptKey); return { status: 401, body: { error: 'アクセスコードが正しくありません。', code: 'access_denied' } }; }
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const token = await signToken(await signingSecret(get, codes), 'access', { sub: randomId(9), exp });
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return { status: 200, body: { granted: true, policy, expiresAt: new Date(exp * 1000).toISOString() }, cookie: `${ACCESS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttlDays * 86400}${secure}` };
}

export function clearAccessCookie(req: Request) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
