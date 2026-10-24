#!/usr/bin/env node
// Read-only QA for the content drafts (content/terminology, content/scenarios; owned by Codex):
//  1. compares each term's reading_ja with a second, independent machine reading (kuromoji.js +
//     mecab-ipadic) and lists disagreements for a human to decide (the machine is often wrong on
//     care vocabulary, e.g. 口腔 = こうくう in care usage);
//  2. lists kanji words in the Japanese scenario/term texts whose machine reading should be checked
//     by a teacher (unknown words), so furigana can later be generated the same way as for the app.
// It never modifies content/. Output: JSON report (stdout or --out).
//
// Usage: NODE_PATH=<dir with kuromoji, doublearray, async> node tools/furigana/check-content.mjs --kuromoji <kuromoji.js dir> [--out report.json]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const kuromojiDir = opt('--kuromoji') || process.env.CK_KUROMOJI_DIR;
if (!kuromojiDir || !existsSync(join(kuromojiDir, 'package.json'))) throw new Error('pass --kuromoji <dir>');
const kpkg = JSON.parse(readFileSync(join(kuromojiDir, 'package.json'), 'utf8'));
const kuromoji = createRequire(join(kuromojiDir, 'package.json'))(join(kuromojiDir, kpkg.main || 'src/kuromoji.js'));
const tokenizer = await new Promise((ok, fail) => kuromoji.builder({ dicPath: join(kuromojiDir, 'dict') }).build((e, t) => (e ? fail(e) : ok(t))));

const KANJI = /[㐀-䶿一-鿿豈-﫿々〆]/;
const kata2hira = (s) => (s || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const machineReading = (text) => tokenizer.tokenize(text).map((t) => kata2hira(t.reading && t.reading !== '*' ? t.reading : t.surface_form)).join('');
// Reviewed care-field readings (same corrections as tools/furigana/overrides.json for the app).
const careReadings = JSON.parse(readFileSync(join(repo, 'tools', 'furigana', 'overrides.json'), 'utf8'));

const terms = JSON.parse(readFileSync(join(repo, 'content', 'terminology', 'terms.json'), 'utf8'));
const readingIssues = [];
for (const t of terms) {
  const given = kata2hira(String(t.reading_ja || '')).replace(/\s/g, '');
  const machine = machineReading(t.ja);
  if (given !== machine) readingIssues.push({ id: t.id, ja: t.ja, reading_ja: t.reading_ja, machine, note: 'disagreement: a human decides which is right' });
}

const unknownWords = new Map();
const scenarioFiles = readdirSync(join(repo, 'content', 'scenarios')).filter((f) => /^CK-.*\.json$/.test(f));
const jaStrings = [];
const walk = (v, where) => {
  if (typeof v === 'string') { if (KANJI.test(v)) jaStrings.push([where, v]); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${where}[${i}]`));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (/_ja$|^ja$|^fact_ja$|learner_ja/.test(k) || typeof x === 'object') walk(x, `${where}.${k}`);
};
for (const f of scenarioFiles) walk(JSON.parse(readFileSync(join(repo, 'content', 'scenarios', f), 'utf8')), f.replace(/\.json$/, ''));
for (const t of terms) jaStrings.push([`${t.id}.example_ja`, t.example_ja]);
for (const [where, s] of jaStrings) {
  if (/[一-鿿]/.test(s) && /[一-鿿]/.test(s) && !/[ぁ-んァ-ヶ]/.test(s)) continue; // Chinese notes, not Japanese
  for (const tok of tokenizer.tokenize(s)) {
    if (!KANJI.test(tok.surface_form)) continue;
    if (tok.word_type === 'UNKNOWN' || !tok.reading || tok.reading === '*') {
      const e = unknownWords.get(tok.surface_form) || { word: tok.surface_form, places: [] };
      if (e.places.length < 3) e.places.push(where);
      unknownWords.set(tok.surface_form, e);
    }
  }
}

const report = {
  tool: 'tools/furigana/check-content.mjs', kuromoji: kpkg.version, dictionary: 'mecab-ipadic-2.7.0-20070801',
  checkedAt: new Date().toISOString(), terms: terms.length, scenarioFiles: scenarioFiles.length, japaneseStrings: jaStrings.length,
  termReadingDisagreements: readingIssues,
  wordsWithoutMachineReading: [...unknownWords.values()],
  careReadingsKnown: Object.keys(careReadings).filter((k) => !k.startsWith('//')).length,
  note: 'Read-only. Disagreements are not errors by themselves; content/ is owned by Codex and needs teacher review.',
};
const out = JSON.stringify(report, null, 2) + '\n';
if (opt('--out')) writeFileSync(opt('--out'), out); else process.stdout.write(out);
console.error(JSON.stringify({ terms: terms.length, disagreements: readingIssues.length, unknownWords: unknownWords.size }));
