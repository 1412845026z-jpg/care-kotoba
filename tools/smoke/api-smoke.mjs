#!/usr/bin/env node
// Smoke test of a running Care Kotoba server through its own API (the same calls the app makes):
// health, access code, one text-practice turn, one feedback, one TTS line. Voice (WebRTC) is not
// covered here; use the in-app 音声テスト and docs/09 on a phone for that.
//
// AGAINST A REAL DEPLOYMENT THIS SPENDS MONEY (a few cents: 2 text-model calls + 1 short TTS) and
// needs the user's authorisation. It refuses to call AI routes unless --yes is given, and never
// prints the access code or any key.
//
//   node tools/smoke/api-smoke.mjs --base https://<staging-host>            # health + access only (free)
//   CK_SMOKE_ACCESS_CODE=... node tools/smoke/api-smoke.mjs --base https://<staging-host> --yes
//   node tools/smoke/api-smoke.mjs --base http://127.0.0.1:5173 --yes      # local dev with the mock
//
// Output: one JSON report on stdout (statuses, latencies, quote check), exit 1 on any failure.
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const base = (opt('--base') || process.env.CK_SMOKE_BASE || '').replace(/\/+$/, '');
const yes = args.includes('--yes');
const scene = opt('--scene') || 'bath-5';
if (!/^https?:\/\//.test(base)) { console.error('pass --base https://host'); process.exit(2); }

const report = { base, scene, at: new Date().toISOString(), paidCalls: yes, steps: [] };
let cookie = '';
async function call(name, path, { method = 'POST', body } = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const type = r.headers.get('content-type') || '';
    const data = type.includes('json') ? await r.json().catch(() => null) : { bytes: (await r.arrayBuffer()).byteLength, type };
    const step = { name, status: r.status, ms: Date.now() - t0 };
    report.steps.push(step);
    return { r, data, step };
  } catch (e) {
    const step = { name, status: 0, ms: Date.now() - t0, error: e?.name || 'error' };
    report.steps.push(step);
    return { r: null, data: null, step };
  }
}

const health = await call('health', '/api/health', { method: 'GET' });
if (health.data) report.server = { configured: health.data.configured, models: health.data.models, access: health.data.access, voice: health.data.voice, lifecycleWarnings: (health.data.modelLifecycle?.warnings || []).length };
const access = await call('access', '/api/access', { method: 'GET' });
if (access.data?.required) {
  const code = process.env.CK_SMOKE_ACCESS_CODE;
  if (!code) report.note = 'server needs an access code: set CK_SMOKE_ACCESS_CODE (it is not printed)';
  else {
    const login = await call('access-login', '/api/access', { body: { code } });
    cookie = (login.r?.headers.get('set-cookie') || '').split(';')[0];
    login.step.cookie = !!cookie;
  }
}

if (yes) {
  const learner = '今日は、入りたくないのですね。何か気になることはありますか。';
  const chat = await call('chat', '/api/chat', { body: { scenarioId: scene, variant: 'gentle', locale: 'zh', level: 'gentle', messages: [{ role: 'assistant', text: '今日はお風呂に入りたくないの。' }, { role: 'user', text: learner }] } });
  if (chat.data) chat.step.reply = typeof chat.data.reply === 'string' && chat.data.reply.length > 0;
  const fb = await call('feedback', '/api/feedback', { body: { scenarioId: scene, variant: 'gentle', locale: 'zh', messages: [{ role: 'assistant', text: '今日はお風呂に入りたくないの。' }, { role: 'user', text: learner, source: 'text' }] } });
  if (fb.data) {
    fb.step.improvements = (fb.data.improvements || []).length;
    const norm = (x) => String(x || '').normalize('NFKC').replace(/[\s、。，．,.!！?？「」]/g, '');
    fb.step.allQuotesFromLearner = (fb.data.improvements || []).every((c) => norm(c.original).length > 1 && norm(learner).includes(norm(c.original)));
    fb.step.quality = fb.data.quality;
  }
  const tts = await call('speech', '/api/speech', { body: { text: 'お顔を拭いてもよろしいですか。' } });
  if (tts.data) tts.step.audioBytes = tts.data.bytes;
} else {
  report.note = (report.note ? report.note + '; ' : '') + 'AI routes skipped (no --yes): nothing was spent';
}

const failed = report.steps.filter((s) => s.status === 0 || s.status >= 400);
report.ok = failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
