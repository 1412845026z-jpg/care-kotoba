import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJa, isQuotedFrom, verifyFeedback, verifyCorrection, quotedSegments } from '@/lib/feedback-quality';

const learner = ['今日は、入りたくないお気持ちなのですね。', '何か、気になることがございますか'];
const msgs = [{ role: 'assistant', text: '今日は絶対に入りたくない。' }, ...learner.map((text) => ({ role: 'user', text, source: 'voice' }))];

test('normalisation ignores punctuation, spaces and full/half width', () => {
  assert.equal(normalizeJa('今日は、 入りたくない。'), normalizeJa('今日は入りたくない'));
  assert.equal(normalizeJa('ＡＢＣ　１２３'), 'abc123');
});

test('quotes must come from the learner', () => {
  assert.ok(isQuotedFrom('今日は入りたくないお気持ちなのですね', learner));
  assert.ok(isQuotedFrom('入りたくないお気持ち', learner), 'substring');
  assert.ok(isQuotedFrom('何か気になることがございますか。', learner), 'punctuation difference');
  assert.ok(!isQuotedFrom('早くお風呂に入ってください。', learner), 'fabricated');
  assert.ok(!isQuotedFrom('今日は絶対に入りたくない。', learner), "partner's line is not the learner's");
  assert.ok(!isQuotedFrom('ね', learner), 'too short to verify');
});

test('verifyFeedback drops unquoted improvements and flags unverifiable goal evidence', () => {
  const r = verifyFeedback({
    score: 140,
    heading: 'h', summary: 's', strengths: ['a', 7],
    improvements: [
      { original: '今日は、入りたくないお気持ちなのですね。', better: 'b1', reason: 'r' },
      { original: '早くお風呂に入ってください。', better: 'b2', reason: 'r' },
      { original: '何か、気になることがございますか', better: 'b3', reason: 'r' },
    ],
    goals: [
      { label: 'g1', achieved: true, evidence: '「入りたくないお気持ちなのですね」と受け止めた' },
      { label: 'g2', achieved: true, evidence: '「お湯の温度を確認します」と説明した' },
      { label: 'g3', achieved: true, evidence: '相手の気持ちを確かめた' },
    ],
    nextPhrase: 'n',
  }, msgs);
  assert.equal(r.score, 100);
  assert.deepEqual(r.improvements.map((i) => i.better), ['b1', 'b3']);
  assert.equal(r.quality.droppedUnquotedImprovements, 1);
  assert.deepEqual(r.goals.map((g) => g.evidenceVerified), [true, false, false]);
  assert.deepEqual(r.strengths, ['a']);
  assert.equal(r.quality.voiceLines, 2);
});

test('verifyFeedback tolerates a malformed model result', () => {
  const r = verifyFeedback({ improvements: 'x', goals: null, score: 'abc' }, msgs);
  assert.equal(r.score, 0);
  assert.deepEqual(r.improvements, []);
  assert.deepEqual(r.goals, []);
});

test('chat correction is kept only when it quotes the last learner line', () => {
  assert.deepEqual(verifyCorrection({ original: '入りたくないですか', better: 'お入りになりたくないですか', reason: 'r' }, '今日は入りたくないですか。'), { original: '入りたくないですか', better: 'お入りになりたくないですか', reason: 'r' });
  assert.equal(verifyCorrection({ original: 'お風呂に入りましょう', better: 'x', reason: 'r' }, '今日は入りたくないですか。'), null);
  assert.equal(verifyCorrection(null, 'x'), null);
});

test('quoted segments are read from 「」 and quotes', () => {
  assert.deepEqual(quotedSegments('「おはよう」と言い、"大丈夫"と確認'), ['おはよう', '大丈夫']);
});
