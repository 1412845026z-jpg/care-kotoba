// Best-effort, in-memory sliding-window limiter. On Cloudflare Workers each
// isolate has its own memory, so this slows down a single abusive client but
// is NOT a quota or a billing control. Durable per-user limits and usage
// accounting need shared storage (KV / Durable Objects / D1) — backlog G2.

const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSeconds: number } {
  const since = now - windowMs;
  const hits = (buckets.get(key) || []).filter((t) => t > since);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (!v.length || v[v.length - 1] <= since) buckets.delete(k);
      if (buckets.size <= MAX_KEYS / 2) break;
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Check without recording (for limits that should only count failures, e.g. wrong access codes). */
export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()): { limited: boolean; retryAfterSeconds: number } {
  const hits = (buckets.get(key) || []).filter((t) => t > now - windowMs);
  buckets.set(key, hits);
  return hits.length >= limit ? { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) } : { limited: false, retryAfterSeconds: 0 };
}

export function recordHit(key: string, now = Date.now()) {
  const hits = buckets.get(key) || [];
  hits.push(now);
  buckets.set(key, hits);
}

export const ROUTE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  chat: { limit: 40, windowMs: 10 * 60_000 },
  feedback: { limit: 12, windowMs: 10 * 60_000 },
  speech: { limit: 60, windowMs: 10 * 60_000 },
  session: { limit: 8, windowMs: 10 * 60_000 },
  sessionEnd: { limit: 30, windowMs: 10 * 60_000 },
  accessAttempt: { limit: 10, windowMs: 10 * 60_000 },
};

export function resetRateLimits() {
  buckets.clear();
}
