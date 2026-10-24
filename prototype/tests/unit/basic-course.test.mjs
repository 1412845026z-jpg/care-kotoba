// SSW-BASIC-APP-001: the generated basic course data matches content/ssw-basic and its furigana are aligned
// with the reviewed whole-sentence readings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BASIC_COURSE } from '@/lib/basic-course-data';
import { sanitizeBasicProgress, isBasicSceneId } from '@/lib/basic-course';
import { plainOf } from '@/lib/furigana';
import { basicSources } from '../harness/basic-sources.mjs';

const repo = join(process.cwd(), '..'); // tests run from prototype/ (same as core-scenarios.test.mjs)
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

test('generated file is up to date with content/ssw-basic (rerun tools/ssw-basic-app/generate.mjs after content changes)', () => {
  const out = execFileSync(process.execPath, [join(repo, 'tools', 'ssw-basic-app', 'generate.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /up to date/);
  const catalog = JSON.parse(readFileSync(join(repo, 'content', 'ssw-basic', 'catalog.json'), 'utf8'));
  assert.equal(BASIC_COURSE.scenes.length, catalog.scenes.length);
  assert.equal(BASIC_COURSE.topics.length, catalog.topics.length);
});

test('every line has furigana that reproduce its text exactly, and the reading matches the reviewed kana', () => {
  let lines = 0;
  for (const s of BASIC_COURSE.scenes) for (const d of s.dialogue) {
    lines++;
    const hasKanji = /[一-鿿0-9０-９々]/.test(d.ja);
    if (!hasKanji) { assert.equal(d.ruby, null, `${s.id}: no kanji, no ruby`); continue; }
    assert.ok(d.ruby, `${s.id}: ${d.ja} has no furigana`);
    assert.equal(plainOf(d.ruby), d.ja, `${s.id}: notation changes the text`);
    const reading = d.ruby.replace(/\{[^{}|]+\|([^{}|]+)\}/g, '$1');
    assert.equal(toHira(reading).replace(/\s+/g, ''), toHira(d.kana).replace(/\s+/g, ''), `${s.id}: reading differs from kana`);
  }
  assert.ok(lines >= 384);
});

test('ambiguous splits resolve to the natural reading', () => {
  const ruby = (id, i) => BASIC_COURSE.scenes.find((s) => s.id === id).dialogue[i].ruby;
  assert.match(ruby('SSW-S16', 0), /\{昨日\|きのう\}の\{夜\|よる\}/);
  const all = BASIC_COURSE.scenes.flatMap((s) => s.dialogue.map((d) => d.ruby || '')).join('\n');
  assert.ok(!/\{今\|いまは\}/.test(all) && !/\{確認\|かく\}/.test(all) && !/\{廊下\|ろうかに\}/.test(all));
});

test('practice turns point at the learner\'s line after a cue', () => {
  for (const s of BASIC_COURSE.scenes) {
    assert.equal(s.dialogue[s.practice.responseTurn].speaker, 'worker', s.id);
    assert.ok(s.practice.cueTurn < s.practice.responseTurn, s.id);
    assert.ok(isBasicSceneId(s.id), s.id);
  }
});

test('progress data from localStorage is cleaned', () => {
  assert.deepEqual(sanitizeBasicProgress({ 'SSW-S01': '2026-10-24T10:00:00Z', 'bath-5': '2026-10-24', 'SSW-S02': 'x', 'SSW-S03': 3 }), { 'SSW-S01': '2026-10-24T10:00:00.000Z' });
  for (const raw of [null, [], 'x', 1]) assert.deepEqual(sanitizeBasicProgress(raw), {});
});

// I18N-001 / I18N-CONTENT-QA: explanations are maps of the languages the sources actually provide (catalog inline
// keys and content/ssw-basic/locales packs). Compared with the sources, not with a fixed language list.
test('support texts match what the sources provide, per language, with each pack\'s review status', () => {
  const src = basicSources(repo);
  assert.deepEqual(BASIC_COURSE.support, src.support);
  assert.ok(src.support.zh, 'the catalog has Chinese explanations');
  for (const [loc, pk] of Object.entries(src.packs)) if (src.support[loc]) assert.equal(BASIC_COURSE.support[loc].status, pk.status, `${loc} status kept`);
  const byId = Object.fromEntries(src.catalog.scenes.map((s) => [s.id, s]));
  for (const s of BASIC_COURSE.scenes) {
    const c = byId[s.id];
    assert.deepEqual(Object.keys(s.goal), src.sceneField(c, 'goal'), `${s.id} goal`);
    assert.deepEqual(Object.keys(s.title), src.sceneField(c, 'title'), `${s.id} title`);
    assert.deepEqual(Object.keys(s.context), src.sceneField(c, 'context'), `${s.id} context`);
    assert.deepEqual(Object.keys(s.practice.check), src.sceneField(c, 'check'), `${s.id} check`);
    s.dialogue.forEach((d, i) => assert.deepEqual(Object.keys(d.tr), src.lineLangs(c, i), `${s.id}[${i}]`));
  }
  const topics = Object.fromEntries(src.catalog.topics.map((t) => [t.id, t]));
  for (const t of BASIC_COURSE.topics) assert.deepEqual(Object.keys(t.title), src.topicLangs(topics[t.id]), t.id);
});

function generateWith(packs) {
  const dir = mkdtempSync(join(tmpdir(), 'ck-locales-'));
  for (const [name, body] of Object.entries(packs)) writeFileSync(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  try {
    return { ok: true, data: JSON.parse(execFileSync(process.execPath, [join(repo, 'tools', 'ssw-basic-app', 'generate.mjs'), '--json'], { encoding: 'utf8', env: { ...process.env, SSW_BASIC_LOCALES_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] })) };
  } catch (e) { return { ok: false, err: String(e.stderr || e) }; } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('locale packs (content/ssw-basic/locales/<locale>.json) add a language without touching the catalog', () => {
  const first = BASIC_COURSE.scenes[0];
  const r = generateWith({ 'vi.json': { locale: 'vi', status: 'draft_unreviewed', topics: { [first.topicId]: { title: 'Chào hỏi' } }, scenes: { [first.id]: { goal: 'Chào buổi sáng', lines: ['Chào buổi sáng ạ.', null] } } } });

test('an English pack for all scenes is consumed with its draft status; Vietnamese learners would get it as the fallback', () => {
  const scenes = Object.fromEntries(BASIC_COURSE.scenes.map((s) => [s.id, { title: `Scene ${s.id}`, goal: `Goal for ${s.id}`, lines: s.dialogue.map((_, i) => `Line ${i + 1}`) }]));
  const topics = Object.fromEntries(BASIC_COURSE.topics.map((t) => [t.id, { title: `Topic ${t.id}` }]));
  const r = generateWith({ 'en.json': { locale: 'en', status: 'draft_unreviewed', topics, scenes } });
  assert.ok(r.ok, r.err);
  assert.deepEqual(r.data.support.en, { status: 'draft_unreviewed', scenes: BASIC_COURSE.scenes.length });
  assert.equal(r.data.support.zh.status, BASIC_COURSE.support.zh.status, 'Chinese status untouched');
  assert.ok(r.data.topics.every((t) => t.title.en && t.title.zh));
  assert.ok(r.data.scenes.every((s) => s.dialogue.every((d) => d.tr.en && !d.tr.vi)));
});
  assert.ok(r.ok, r.err);
  assert.deepEqual(r.data.support.vi, { status: 'draft_unreviewed', scenes: 1 });
  const s = r.data.scenes.find((x) => x.id === first.id);
  assert.equal(s.goal.vi, 'Chào buổi sáng');
  assert.equal(s.dialogue[0].tr.vi, 'Chào buổi sáng ạ.');
  assert.equal(s.dialogue[1].tr.vi, undefined, 'a gap stays a gap');
  assert.equal(s.goal.zh, first.goal.zh, 'Chinese untouched');
});

test('a pack with Chinese filed as Vietnamese, a wrong locale name, an unknown scene or topic, or a malformed shape is rejected', () => {
  const id = BASIC_COURSE.scenes[0].id;
  assert.match(generateWith({ 'vi.json': { locale: 'vi', status: 'draft', scenes: { [id]: { goal: '早上好，打招呼' } } } }).err, /not written in vi/);
  assert.match(generateWith({ 'my.json': { locale: 'my', status: 'draft', scenes: { [id]: { goal: 'Good morning' } } } }).err, /not written in my/);
  assert.match(generateWith({ 'ko.json': { locale: 'ko', status: 'draft', scenes: {} } }).err, /must be one of/);
  assert.match(generateWith({ 'id.json': { locale: 'id', status: 'draft', scenes: { 'SSW-S999': { goal: 'Selamat pagi' } } } }).err, /unknown scene/);
  assert.match(generateWith({ 'en.json': '{ not json' }).err, /locales\/en\.json/);
  assert.match(generateWith({ 'en.json': { locale: 'en', status: 'draft_unreviewed', topics: { 'no-such-topic': { title: 'Greetings' } } } }).err, /unknown topic no-such-topic/);
  assert.match(generateWith({ 'en.json': { locale: 'en', status: 'draft_unreviewed', scenes: [] } }).err, /must be objects keyed by id/);
  assert.match(generateWith({ 'en.json': { locale: 'en', status: 'draft_unreviewed', scenes: { [id]: { lines: 'Hello' } } } }).err, /list of texts or null/);
  assert.match(generateWith({ 'en.json': { locale: 'en', scenes: {} } }).err, /status missing/);
});
