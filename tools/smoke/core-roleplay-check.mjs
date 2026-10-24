#!/usr/bin/env node
// Behaviour check of the AI partner in the 12 core drafts (CORE-PREVIEW-001), through the app's own /api/chat.
// Answers the open question "does the real model follow the draft instructions?" with fixed probes:
//
//   clarification   agree-only / guess  -> the partner must NOT reveal the hidden fact yet          (automatic)
//                   ask (example line)  -> the partner should reveal it                               (automatic)
//   refusal_respect pressure            -> the hidden reason must NOT come out under pressure        (automatic)
//                                          and the partner should keep declining                      (recorded for review)
//                   accept (example)    -> recorded for review
//   report_certainty overclaim / report -> recorded for review (does the partner ask about the source? invent causes?)
//
// AGAINST A REAL SERVER THIS SPENDS MONEY: one text-model call per probe (28 per repeat with all scenes;
// a few cents with the current text model). Without --yes it only prints the plan and calls nothing.
// It never prints the access code. Probes come from content/scenarios (opening, examples, counterexamples);
// leak markers below must occur in that scene's hidden fact, or the tool stops (content changed -> update them).
//
//   node tools/smoke/core-roleplay-check.mjs --base https://<staging-host>                       # plan only (free)
//   CK_SMOKE_ACCESS_CODE=... node tools/smoke/core-roleplay-check.mjs --base https://<host> --yes [--repeat 3] [--scene CK-C01] [--out report.json]
//
// Exit: 0 all automatic checks passed, 1 an automatic check failed or a call failed, 2 usage / stale markers.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const base = (opt('--base') || process.env.CK_SMOKE_BASE || '').replace(/\/+$/, '');
const yes = args.includes('--yes');
const repeat = Math.min(10, Math.max(1, Number(opt('--repeat') || 1) || 1));
const only = opt('--scene');
const out = opt('--out');
if (!/^https?:\/\//.test(base)) { console.error('pass --base https://host'); process.exit(2); }

// Words that only appear in a reply if the hidden fact is being disclosed. Each must occur in the hidden fact text.
const LEAK_MARKERS = {
  'CK-C01': ['アルバム', '談話室', '面会'],
  'CK-C02': ['行事', '案内'],
  'CK-C03': ['着替'],
  'CK-C04': ['参加希望', '人数', 'レクリエーション', '16時'],
  'CK-R01': ['眠れ'],              // not 休みたい: declining with 「今は休みたい」 is part of the refusal, not the reason
  'CK-R02': ['騒が', '落ち着かな'],
  'CK-R03': ['廊下'],
  'CK-R04': ['電話', '家族'],
};
// Written-out variants a reply may use for the same disclosure.
const MARKER_VARIANTS = { '騒が': ['騒が', 'にぎやか', 'うるさ'], '落ち着かな': ['落ち着かな'], '眠れ': ['眠れ', '寝られ', '寝れ'], '16時': ['16時', '4時', '十六時', '四時'] };

const scenes = readdirSync(join(repo, 'content', 'scenarios')).filter((f) => /^CK-.+\.json$/.test(f)).sort()
  .map((f) => JSON.parse(readFileSync(join(repo, 'content', 'scenarios', f), 'utf8')))
  .filter((d) => !only || d.id === only);
if (!scenes.length) { console.error(`no scene ${only}`); process.exit(2); }

const stale = [];
for (const d of scenes) {
  const facts = d.hidden_information.map((h) => h.fact_ja).join(' ');
  for (const m of LEAK_MARKERS[d.id] || []) if (!facts.includes(m)) stale.push(`${d.id}: marker 「${m}」 is not in its hidden fact any more`);
  if ((d.primary_skill === 'clarification' || d.primary_skill === 'refusal_respect') && !LEAK_MARKERS[d.id]) stale.push(`${d.id}: no leak markers defined`);
}
if (stale.length) { console.error(`leak markers out of date (content/scenarios changed):\n  ${stale.join('\n  ')}`); process.exit(2); }

function probesFor(d) {
  const ex = d.examples[0].learner_ja, cx = d.counterexamples.map((c) => c.learner_ja);
  if (d.primary_skill === 'clarification') return [
    { kind: 'agree-only', line: 'はい、分かりました。', expect: 'no-leak' },
    { kind: 'guess', line: cx[0], expect: 'no-leak' },
    { kind: 'ask', line: ex, expect: 'reveal' },
  ];
  if (d.primary_skill === 'refusal_respect') return [
    { kind: 'pressure', line: cx[cx.length - 1], expect: 'no-leak', review: 'keeps declining politely; does not give in' },
    { kind: 'accept', line: ex, expect: 'review', review: 'accepts calmly; a reason only if offered (R04: none unless volunteered)' },
  ];
  return [
    { kind: 'overclaim', line: cx[0], expect: 'review', review: 'asks whether the learner confirmed it / how they know; invents no cause or diagnosis' },
    { kind: 'report', line: ex, expect: 'review', review: 'acknowledges seen/heard vs unconfirmed; invents no cause or diagnosis' },
  ];
}

const plan = scenes.flatMap((d) => probesFor(d).map((p) => ({ scene: d.id, version: d.version, skill: d.primary_skill, opening: d.opening_ja, ...p })));
const report = { base, at: new Date().toISOString(), paidCalls: yes ? plan.length * repeat : 0, repeat, probes: [], summary: null };

let cookie = '';
async function post(path, body) {
  const t0 = Date.now();
  try {
    const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    return { status: r.status, ms: Date.now() - t0, data: await r.json().catch(() => null), headers: r.headers };
  } catch (e) { return { status: 0, ms: Date.now() - t0, data: null, error: e?.name || 'error' }; }
}

const leaksIn = (scene, text) => (LEAK_MARKERS[scene] || []).filter((m) => (MARKER_VARIANTS[m] || [m]).some((v) => String(text || '').includes(v)));

if (!yes) {
  report.plan = plan.map(({ scene, kind, line, expect }) => ({ scene, kind, line, expect }));
  report.note = `plan only: ${plan.length} probes x ${repeat} = ${plan.length * repeat} text-model calls with --yes; nothing was called`;
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const access = await fetch(base + '/api/access').then((r) => r.json()).catch(() => null);
if (access?.required) {
  const code = process.env.CK_SMOKE_ACCESS_CODE;
  if (!code) { console.error('server needs an access code: set CK_SMOKE_ACCESS_CODE (it is not printed)'); process.exit(2); }
  const login = await post('/api/access', { code });
  if (login.status !== 200) { console.error(`access login failed: HTTP ${login.status}`); process.exit(1); }
  cookie = (login.headers.get('set-cookie') || '').split(';')[0];
}

for (let i = 0; i < repeat; i++) {
  for (const p of plan) {
    const r = await post('/api/chat', { scenarioId: p.scene, variant: 'gentle', locale: 'zh', level: 'gentle', messages: [{ role: 'assistant', text: p.opening }, { role: 'user', text: p.line }] });
    const reply = typeof r.data?.reply === 'string' ? r.data.reply : '';
    const suggestions = Array.isArray(r.data?.suggestions) ? r.data.suggestions : [];
    const better = r.data?.correction?.better || '';
    const entry = { run: i + 1, scene: p.scene, version: p.version, kind: p.kind, learner: p.line, status: r.status, ms: r.ms, reply, suggestions, correction: r.data?.correction || null };
    if (r.status !== 200 || !reply) entry.result = 'error';
    else if (p.expect === 'no-leak') {
      const leaked = { reply: leaksIn(p.scene, reply), suggestions: leaksIn(p.scene, suggestions.join(' ')), correction: leaksIn(p.scene, better) };
      entry.leaked = Object.fromEntries(Object.entries(leaked).filter(([, v]) => v.length));
      entry.result = Object.keys(entry.leaked).length ? 'fail' : 'pass';
      if (p.review) entry.review = p.review;
    } else if (p.expect === 'reveal') {
      entry.revealed = leaksIn(p.scene, reply);
      entry.result = entry.revealed.length ? 'pass' : 'fail';
    } else { entry.result = 'review'; entry.review = p.review; }
    report.probes.push(entry);
  }
}

const count = (res) => report.probes.filter((x) => x.result === res).length;
const leakProbes = report.probes.filter((x) => x.leaked !== undefined);
report.summary = {
  automaticPass: count('pass'), automaticFail: count('fail'), forReview: count('review'), errors: count('error'),
  leakRate: leakProbes.length ? `${leakProbes.filter((x) => x.result === 'fail').length}/${leakProbes.length}` : null,
  revealRate: (() => { const r = report.probes.filter((x) => x.revealed !== undefined); return r.length ? `${r.filter((x) => x.result === 'pass').length}/${r.length}` : null; })(),
  note: 'Automatic checks look for marker words only; read the "review" probes and the replies before drawing conclusions. One run is a sample, not a rate.',
};
const text = JSON.stringify(report, null, 2);
if (out) writeFileSync(out, text + '\n');
console.log(text);
process.exit(count('fail') || count('error') ? 1 : 0);
