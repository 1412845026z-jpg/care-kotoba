// REVIEW-001: scheduling of the ことばノート review (lib/review.ts on top of ts-fsrs). Pure, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReviewStore, dueNoteIds, nextDue, previewAnswers, answer, intervalLabel, tokyoDay, REVIEW_ANSWERS, SESSION_LIMIT } from '@/lib/review';

const NOW = new Date('2026-10-24T06:00:00Z'); // 15:00 in Tokyo
const notes = [{ id: 'n3' }, { id: 'n2' }, { id: 'n1' }]; // newest first, as the app stores them
const days = (a, b) => (Date.parse(tokyoDay(a)) - Date.parse(tokyoDay(b))) / 86400000;

test('three plain answers, in screen order, no "easy"', () => {
  assert.deepEqual(REVIEW_ANSWERS.map((a) => a.label), ['まだ', 'もう少し', '思い出せた']);
});

test('never-reviewed notes are due today, oldest saved first', () => {
  assert.deepEqual(dueNoteIds(notes, {}, NOW), ['n1', 'n2', 'n3']);
  assert.equal(nextDue(notes, {}, NOW), null);
});

test('an answer schedules the phrase on a later day; better recall waits longer', () => {
  const p = previewAnswers({}, 'n1', NOW);
  assert.ok(days(p.again, NOW) >= 1, 'まだ: not again today');
  assert.ok(p.again <= p.hard && p.hard <= p.good, 'まだ <= もう少し <= 思い出せた');
  const after = answer({}, 'n1', 'good', NOW);
  assert.equal(after.n1.reps, 1);
  assert.equal(after.n1.due, p.good.toISOString(), 'the stored date matches the preview');
  assert.deepEqual(dueNoteIds(notes, after, NOW), ['n2', 'n3'], 'answered today, so not due again today');
  assert.equal(nextDue(notes, after, NOW).toISOString(), after.n1.due);
});

test('a phrase comes back on its day, before never-reviewed ones; "answer" does not mutate its input', () => {
  const s1 = answer({}, 'n2', 'again', NOW);
  const frozen = JSON.stringify(s1);
  const later = new Date(Date.parse(s1.n2.due) + 60_000);
  assert.deepEqual(dueNoteIds(notes, s1, later), ['n2', 'n1', 'n3']);
  answer(s1, 'n2', 'good', later);
  assert.equal(JSON.stringify(s1), frozen);
});

test('the session is capped', () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: 'm' + i }));
  assert.equal(dueNoteIds(many, {}, NOW).length, SESSION_LIMIT);
});

test('stored data survives JSON and bad entries are dropped instead of breaking the review', () => {
  const s = answer(answer({}, 'n1', 'hard', NOW), 'n2', 'good', NOW);
  const round = sanitizeReviewStore(JSON.parse(JSON.stringify(s)), ['n1', 'n2', 'n3']);
  assert.deepEqual(round, s);
  const messy = { ...JSON.parse(JSON.stringify(s)), gone: s.n1, n3: { due: 'not a date', stability: 1 } };
  messy.n2 = { ...messy.n2, state: 99 };
  assert.deepEqual(Object.keys(sanitizeReviewStore(messy, ['n1', 'n2', 'n3'])), ['n1'], 'unknown note, bad date and bad state are dropped');
  for (const raw of [null, 'x', [], 42, { n1: 'x' }]) assert.deepEqual(sanitizeReviewStore(raw, ['n1']), {});
});

test('interval labels in Japanese calendar days', () => {
  const at = (d) => new Date(NOW.getTime() + d * 86400000);
  assert.equal(intervalLabel(at(0), NOW), '今日');
  assert.equal(intervalLabel(at(1), NOW), '明日');
  assert.equal(intervalLabel(at(3), NOW), '3日後');
  assert.equal(intervalLabel(at(14), NOW), '2週間後');
  assert.equal(intervalLabel(at(90), NOW), '3か月後');
  assert.equal(intervalLabel(at(400), NOW), '1年後');
  // 23:30 in Tokyo → 00:30 next day is "明日", although only an hour later.
  assert.equal(intervalLabel(new Date('2026-10-24T15:30:00Z'), new Date('2026-10-24T14:30:00Z')), '明日');
});
