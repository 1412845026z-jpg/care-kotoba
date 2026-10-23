// Small HMAC-SHA256 token helper on WebCrypto (available in Cloudflare Workers and Node >= 20).
// Token: v1.<purpose>.<base64url(JSON payload)>.<base64url(signature)>
//
// Contract: both base64url parts must be CANONICAL (alphabet A-Z a-z 0-9 - _, no padding, unused
// trailing bits zero), i.e. exactly what b64url() produces. Base64 leaves 2 or 4 unused bits in the
// last character, so without this check several strings decode to the same bytes (a 32-byte HMAC
// ends in a character whose lowest 2 bits are ignored: "...A" and "...B" are the same signature).
// Rejecting the aliases keeps every valid token a single string. This is hygiene, not a fix for a
// known bypass: an alias can only be made from a token that is already validly signed.

const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const B64URL_CHARS = /^[A-Za-z0-9_-]*$/;

/** Decode only the canonical base64url form (see the contract above); anything else returns null. */
export function fromCanonicalB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!B64URL_CHARS.test(s) || s.length % 4 === 1) return null;
  const bytes = fromB64url(s);
  return b64url(bytes) === s ? bytes : null;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Derive a purpose-bound key so a token for one purpose can never verify as another. */
export async function deriveSecret(base: string, label: string): Promise<string> {
  const key = await hmacKey(base);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(label)));
}

export async function signToken(secret: string, purpose: string, payload: Record<string, unknown>): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const head = `v1.${purpose}.${body}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(head));
  return `${head}.${b64url(sig)}`;
}

export async function verifyToken<T extends Record<string, unknown>>(secret: string, purpose: string, token: unknown): Promise<T | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || parts[1] !== purpose) return null;
  const body = fromCanonicalB64url(parts[2]);
  const sig = fromCanonicalB64url(parts[3]);
  if (!body || !sig || sig.length !== 32) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(`v1.${purpose}.${parts[2]}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(body));
    return payload && typeof payload === 'object' ? (payload as T) : null;
  } catch {
    return null;
  }
}

/** Constant-time comparison of two strings via their SHA-256 digests. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

export function randomId(bytes = 12): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
