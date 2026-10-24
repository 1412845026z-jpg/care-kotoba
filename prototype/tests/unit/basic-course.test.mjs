// SSW-BASIC-APP-001: the generated basic course data matches content/ssw-basic and its furigana are aligned
// with the reviewed whole-sentence readings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASIC_COURSE } from '@/lib/basic-course-data';
import { sanitizeBasicProgress, isBasicSceneId } from '@/lib/basic-course';
import { plainOf } from '@/lib/furigana';

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
