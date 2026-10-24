#!/usr/bin/env node
// SSW-BASIC-APP-001: copies the basic course (content/ssw-basic/catalog.json, owned by the content side,
// built by tools/ssw-basic/build.py) into the app as prototype/lib/basic-course-data.ts.
//
// Furigana: the content gives every line a whole-sentence reading (`kana`). This script aligns that reading
// with the Japanese text and writes the app's ruby notation ({漢字|かんじ}) per kanji run, so the reading the
// editors reviewed is the one shown. A line that cannot be aligned keeps no ruby and the app shows its kana
// line instead; the count is printed and checked by tests/unit/basic-course.test.mjs.
//
// Support languages (I18N-001): every explanation is copied as a map { zh, en, vi, my, id } with only the
// languages that exist. Two sources are read, both owned by the content side:
//   - inline fields in catalog.json: <field>_<locale> (title_en, goal_vi, context_id, practice.check_my) and,
//     on dialogue lines, the bare locale key (zh, en, vi, my, id);
//   - optional locale packs content/ssw-basic/locales/<locale>.json:
//       { "locale": "vi", "status": "draft_unreviewed",
//         "topics": { "<topic id>": { "title": "…" } },
//         "scenes": { "SSW-S01": { "title": "…", "goal": "…", "context": "…", "check": "…", "lines": ["…", null, …] } } }
//     (lines follow the dialogue order; null or a missing entry = not translated yet).
// A text never moves to another language's slot; a gap stays a gap (the app then shows Japanese, or English for
// vi/my/id). Each language's review status is copied so the app can label drafts.
// content/ stays the single source: never edit the generated file by hand.
// Usage (repository root, no dependencies):
//   node tools/ssw-basic-app/generate.mjs           write the file
//   node tools/ssw-basic-app/generate.mjs --check   exit 1 if the committed file is out of date
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(repo, 'content', 'ssw-basic', 'catalog.json');
const out = join(repo, 'prototype', 'lib', 'basic-course-data.ts');
const check = process.argv.includes('--check');

const raw = readFileSync(src, 'utf8');
const catalog = JSON.parse(raw);
const problems = [];
const need = (c, m) => { if (!c) problems.push(m); };
const str = (v) => typeof v === 'string' && v.trim().length > 0;

// ---- ruby alignment ------------------------------------------------------------------------------
const KANJI = /[㐀-䶿一-鿿豈-﫿々〆ヶ0-9０-９]/; // digits need a reading too
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function alignRuby(ja, kana) {
  const runs = [];
  for (const ch of ja) {
    const k = KANJI.test(ch);
    if (runs.length && runs.at(-1).k === k) runs.at(-1).t += ch; else runs.push({ k, t: ch });
  }
  if (!runs.some((r) => r.k)) return { notation: ja, aligned: true };
  // Kana in the text must appear as-is in the reading (katakana compared as hiragana; spaces ignored).
  // Each kanji (or digit) gets 1-4 kana; every split that fits is collected and the most typical one wins
  // (about two kana per kanji), so 昨日の夜 / きのうのよる cannot become {昨日|き}{夜|うのよる}.
  const reading = toHira(kana).replace(/\s+/g, '');
  const lits = runs.map((r) => (r.k ? null : toHira(r.t).replace(/\s+/g, '')));
  const found = [];
  const walk = (ri, pos, acc) => {
    if (found.length > 64) return;
    if (ri === runs.length) { if (pos === reading.length) found.push(acc.slice()); return; }
    if (!runs[ri].k) { if (reading.startsWith(lits[ri], pos)) walk(ri + 1, pos + lits[ri].length, acc); return; }
    const n = [...runs[ri].t].length;
    for (let len = n; len <= n * 4 && pos + len <= reading.length; len++) {
      const rt = reading.slice(pos, pos + len);
      if (!/^[\u3041-\u3096ー]+$/.test(rt)) break;
      acc.push(rt); walk(ri + 1, pos + len, acc); acc.pop();
    }
  };
  walk(0, 0, []);
  if (!found.length) return { notation: null, aligned: false };
  const cost = (sol) => { let c = 0, g = 0; for (const r of runs) if (r.k) c += Math.abs(sol[g++].length / [...r.t].length - 2); return c; };
  const best = found.sort((a, b) => cost(a) - cost(b))[0];
  let g = 0, notation = '';
  for (const r of runs) notation += r.k ? `{${r.t}|${best[g++]}}` : r.t;
  return { notation, aligned: true, alternatives: found.length };
}

// ---- copy ----------------------------------------------------------------------------------------
need(Array.isArray(catalog.topics) && catalog.topics.length > 0, 'catalog.topics missing');
need(Array.isArray(catalog.scenes) && catalog.scenes.length > 0, 'catalog.scenes missing');
const ROLES = new Set(['worker', 'resident', 'colleague', 'nurse', 'visitor', 'family', 'leader']);
let lines = 0, unaligned = [];
const line = (ja, kana, where) => {
  lines++;
  const r = alignRuby(ja, kana);
  if (!r.aligned) unaligned.push(where);
  return r.notation && r.notation !== ja ? r.notation : null;
};
// ---- support languages ---------------------------------------------------------------------------
const SUPPORT = ['zh', 'en', 'vi', 'my', 'id'];
// SSW_BASIC_LOCALES_DIR: tests only (tests/unit/basic-course.test.mjs), with --json.
const packDir = process.env.SSW_BASIC_LOCALES_DIR || join(repo, 'content', 'ssw-basic', 'locales');
const packs = {};
if (existsSync(packDir)) for (const f of readdirSync(packDir).filter((f) => f.endsWith('.json')).sort()) {
  const loc = f.replace(/\.json$/, '');
  let pack; try { pack = JSON.parse(readFileSync(join(packDir, f), 'utf8')); } catch (e) { problems.push(`locales/${f}: ${e.message}`); continue; }
  need(SUPPORT.includes(loc) && pack.locale === loc, `locales/${f}: file name and "locale" must be one of ${SUPPORT.join('/')}`);
  need(str(pack.status), `locales/${f}: status missing`);
  packs[loc] = pack;
}
/** { zh: …, en: … } from inline <field>_<locale> keys (or bare locale keys when field is '') and the packs. */
// A text must be written in its language's script: this catches, for example, Chinese filed under vi/my/id.
// (Japanese quoted inside a Vietnamese explanation is fine: only a text with no letters of its own script fails.)
const SCRIPT = { zh: /[\u4e00-\u9fff]/, en: /[A-Za-z]/, vi: /[A-Za-z]/, id: /[A-Za-z]/, my: /[\u1000-\u109f]/ };
const texts = (obj, field, fromPack) => {
  const out = {};
  for (const loc of SUPPORT) {
    const inline = obj?.[field ? `${field}_${loc}` : loc];
    const packed = packs[loc] ? fromPack(packs[loc]) : undefined;
    if (str(inline) && str(packed) && inline.trim() !== packed.trim()) problems.push(`${loc}: two different texts for ${field || 'line'} (catalog and locales/${loc}.json)`);
    const v = str(inline) ? inline : str(packed) ? packed : null;
    if (v && !SCRIPT[loc].test(v)) problems.push(`${loc}: "${v.slice(0, 24)}" (${field || 'line'}) is not written in ${loc}`);
    if (v) out[loc] = v.trim();
  }
  return out;
};
const topics = (catalog.topics || []).map((t) => {
  need(str(t.id) && str(t.title_ja), `topic ${t.id}: id/title`);
  return { id: t.id, titleJa: t.title_ja, title: texts(t, 'title', (p) => p.topics?.[t.id]?.title) };
});
const topicIds = new Set(topics.map((t) => t.id));
const scenes = (catalog.scenes || []).map((s) => {
  const w = s.id;
  need(str(s.id) && /^SSW-S\d{2,3}$/.test(s.id), `${w}: id`);
  need(topicIds.has(s.topic_id), `${w}: unknown topic ${s.topic_id}`);
  need(Array.isArray(s.dialogue) && s.dialogue.length >= 2, `${w}: dialogue`);
  const p = s.practice || {};
  need(Number.isInteger(p.response_turn) && s.dialogue?.[p.response_turn]?.speaker === 'worker', `${w}: practice.response_turn must be a worker line`);
  need(Number.isInteger(p.cue_turn) && p.cue_turn < p.response_turn, `${w}: practice.cue_turn`);
  const dialogue = (s.dialogue || []).map((d, i) => {
    need(ROLES.has(d.speaker) && str(d.ja) && str(d.kana), `${w}[${i}]: speaker/ja/kana`);
    return { speaker: d.speaker, ja: d.ja, kana: d.kana, tr: texts(d, '', (pk) => pk.scenes?.[w]?.lines?.[i]), ruby: line(d.ja, d.kana, `${w}[${i}]`) };
  });
  for (const [loc, pk] of Object.entries(packs)) { const l = pk.scenes?.[w]?.lines; need(l === undefined || (Array.isArray(l) && l.length <= dialogue.length), `locales/${loc}.json ${w}: lines longer than the dialogue`); }
  const sp = (f) => (pk) => pk.scenes?.[w]?.[f];
  return {
    id: s.id, topicId: s.topic_id, titleJa: s.title_ja, title: texts(s, 'title', sp('title')), goal: texts(s, 'goal', sp('goal')), context: texts(s, 'context', sp('context')),
    partner: s.npc_role, dialogue,
    practice: { cueTurn: p.cue_turn, responseTurn: p.response_turn, alternatives: (p.alternatives_ja || []).filter(str), check: texts(p, 'check', sp('check')) },
  };
});
need(new Set(scenes.map((s) => s.id)).size === scenes.length, 'duplicate scene ids');
for (const [loc, pk] of Object.entries(packs)) for (const id of Object.keys(pk.scenes || {})) need(scenes.some((s) => s.id === id), `locales/${loc}.json: unknown scene ${id}`);
// Per language: review status and how many scenes have a translated goal (the app labels drafts and gaps).
const support = {};
for (const loc of SUPPORT) {
  const n = scenes.filter((s) => s.goal[loc]).length;
  if (n) support[loc] = { status: packs[loc]?.status || catalog.status, scenes: n };
}
if (problems.length) { console.error('basic course: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  ')); process.exit(1); }

// Digest of what the app uses (not the whole file), so content-side additions such as delivery notes for
// voice generation do not make this file stale; a change to any line, reading or practice field does.
// --json (tests): print what would be generated, write nothing. No process.exit here: a large stdout on a pipe
// is written asynchronously and would be cut off.
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify({ support, topics, scenes }) + '\n');
else {
const digest = createHash('sha256').update(JSON.stringify({ topics, scenes, support })).digest('hex').slice(0, 16);
const body = `// GENERATED by tools/ssw-basic-app/generate.mjs from content/ssw-basic/catalog.json — do not edit.
// Source status ${catalog.status}; sha256 of the used fields ${digest} (the catalog version is left out on purpose:
// content-side releases that do not touch these fields must not make this file stale). Fictional scenes, AI-assisted drafts pending review
// by care professionals and Japanese teachers. Support languages and their status: see "support".
import type { BasicCourse } from './basic-course';

export const BASIC_COURSE: BasicCourse = ${JSON.stringify({ status: catalog.status, sourceDigest: digest, support, topics, scenes }, null, 1)};
`;
console.log(`basic course: ${topics.length} topics, ${scenes.length} scenes, ${lines} lines, ruby aligned ${lines - unaligned.length}/${lines}` + (unaligned.length ? ` (unaligned: ${unaligned.join(', ')})` : ''));
console.log('support languages: ' + (Object.entries(support).map(([l, v]) => `${l} ${v.scenes} scenes (${v.status})`).join(', ') || 'none'));
if (check) {
  const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (cur !== body) { console.error(`${out} is out of date: run node tools/ssw-basic-app/generate.mjs`); process.exit(1); }
  console.log('up to date');
} else {
  writeFileSync(out, body);
  console.log('wrote ' + out);
}
}
