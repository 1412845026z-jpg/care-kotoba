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

// --- Pronunciation claims (feedback is made from text; EVAL-002 tag pronunciation_claim_without_audio) ---
import { claimsPronunciation, stripPronunciationClaims } from '@/lib/feedback-quality';
import { readFileSync } from 'node:fs';

test('pronunciation judgements are detected in Japanese, Chinese and English; "not assessed" notes are not', () => {
  for (const claim of ['発音も不正確です。', '発音がとてもきれいでした。', 'アクセントが少し違います。', '你的发音很清楚。', '语调有点不自然。', 'Your pronunciation was clear.', 'Work on your intonation.']) {
    assert.ok(claimsPronunciation(claim), claim);
  }
  for (const note of ['発音は文字からは判断できません。', '発音については評価していません。', '文字だけでは発音は分かりません。', '发音无法从文字判断。', '本反馈不评价发音。', '没有评估发音。', 'Pronunciation is not assessed from text.', 'We cannot judge pronunciation without audio.', '「今は入りたくないのですね」と受け止めています。']) {
    assert.ok(!claimsPronunciation(note), note);
  }
});

test('stripPronunciationClaims removes only the judging sentence', () => {
  const r = stripPronunciationClaims('「原因はまだ分かりません」と分けて報告できています。発音もきれいでした。次は時刻も添えましょう。');
  assert.equal(r.removed, 1);
  assert.equal(r.text, '「原因はまだ分かりません」と分けて報告できています。次は時刻も添えましょう。');
  assert.deepEqual(stripPronunciationClaims('发音无法从文字判断。'), { text: '发音无法从文字判断。', removed: 0 });
});

test('verifyFeedback strips pronunciation claims everywhere and drops pronunciation-only corrections', () => {
  const r = verifyFeedback({
    score: 70,
    heading: '発音がきれいです。よく伝わりました。',
    summary: '受け止めができています。你的发音很好。',
    strengths: ['発音が自然。', '相手の気持ちを確かめました。'],
    improvements: [
      { original: '今日は、入りたくないお気持ちなのですね。', better: '今日は入りたくないのですね。', reason: '「お気持ち」の発音が不明瞭です。' },
      { original: '何か、気になることがございますか', better: '何か気になることはありますか。', reason: 'より自然な言い方です。' },
    ],
    goals: [{ label: '受け止める', achieved: true, evidence: '「今日は、入りたくないお気持ちなのですね」発音も良い。' }],
    nextPhrase: '今は入りたくないのですね。',
  }, msgs);
  assert.equal(r.heading, 'よく伝わりました。');
  assert.equal(r.summary, '受け止めができています。');
  assert.deepEqual(r.strengths, ['相手の気持ちを確かめました。']);
  assert.deepEqual(r.improvements.map((c) => c.original), ['何か、気になることがございますか'], 'pronunciation-only correction dropped');
  assert.equal(r.goals[0].evidence, '「今日は、入りたくないお気持ちなのですね」');
  assert.equal(r.goals[0].evidenceVerified, true);
  assert.equal(r.quality.removedPronunciationClaims, 5);
  assert.equal(r.quality.droppedPronunciationOnlyImprovements, 1);
  assert.equal(r.quality.droppedUnquotedImprovements, 0, 'a pronunciation-only drop is not counted as an unquoted quote');
});

test('verifyCorrection drops a chat correction that is only about pronunciation', () => {
  assert.equal(verifyCorrection({ original: '何か、気になることがございますか', better: '何か気になることはありますか', reason: '発音が少し違います。' }, learner[1]), null);
  assert.deepEqual(verifyCorrection({ original: '何か、気になることがございますか', better: '何か気になることはありますか', reason: '自然な言い方です。発音もよいです。' }, learner[1]), { original: '何か、気になることがございますか', better: '何か気になることはありますか', reason: '自然な言い方です。' });
});

test('deterministic gates agree with the EVAL-002 drafts (evals/source-confidence) where they apply', () => {
  const rows = readFileSync('../evals/source-confidence/samples.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(rows.length, 12);
  let checkedQuotes = 0;
  for (const r of rows) {
    const fb = r.candidate_feedback_ja;
    const expectsPronunciationTag = r.expected_feedback.additional_rejection_tags.includes('pronunciation_claim_without_audio');
    assert.equal(claimsPronunciation(fb), expectsPronunciationTag, `${r.id}: pronunciation gate`);
    const gate = r.expected_feedback.gates.quote_attribution;
    if (gate === 'pass' || gate === 'fail') {
      checkedQuotes++;
      const reliable = r.learner_turn.transcript_status === 'reliable';
      const ok = reliable && quotedSegments(fb).every((q) => isQuotedFrom(q, [r.learner_turn.text_ja]));
      assert.equal(ok ? 'pass' : 'fail', gate, `${r.id}: quote attribution`);
    }
  }
  assert.equal(checkedQuotes, 6, 'quote gate applies to 6 of the 12 drafts; the other gates need a human or model judge');
});
