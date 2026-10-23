import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confidenceOf, ASR_THRESHOLDS } from '@/lib/asr-confidence';
import { initialTranscript, applyEvent, turnsInOrder } from '@/lib/realtime-transcript';
import { verifyFeedback } from '@/lib/feedback-quality';
import { asrLogprobs } from '@/lib/voice-server';
import { VoiceMetrics } from '@/lib/voice-metrics';

const lp = (pairs) => pairs.map(([token, p]) => ({ token, logprob: Math.log(p), bytes: [...Buffer.from(token)] }));

test('no usable logprobs -> null (feature off or model without logprobs)', () => {
  for (const v of [undefined, null, [], 'x', [{ token: 'a' }], [{ token: 'a', logprob: 'x' }], [{ token: 'a', logprob: 0.5 }], [{ token: 'a', logprob: NaN }]]) assert.equal(confidenceOf(v), null, JSON.stringify(v));
});

test('confident and unsure lines', () => {
  const sure = confidenceOf(lp([['お顔', 0.98], ['を', 0.99], ['拭', 0.95], ['いても', 0.97]]));
  assert.equal(sure.uncertain, false);
  assert.ok(sure.mean > 0.95 && sure.min === 0.95);
  assert.deepEqual(sure.low, []);
  const oneBad = confidenceOf(lp([['右', 0.2], ['膝', 0.99], ['が', 0.99], ['痛い', 0.99]]));
  assert.equal(oneBad.uncertain, true, 'one very unsure token (a body side) is enough');
  assert.deepEqual(oneBad.low, ['右']);
  const allMeh = confidenceOf(lp([['今日', 0.7], ['は', 0.75], ['入り', 0.7], ['たくない', 0.72]]));
  assert.equal(allMeh.uncertain, true, 'low average');
  assert.equal(ASR_THRESHOLDS.mean, 0.8);
});

test('transcript reducer stores confidence on the learner line only when logprobs are present', () => {
  let s = initialTranscript();
  s = applyEvent(s, { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: null });
  s = applyEvent(s, { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: '右膝が痛いです。', logprobs: lp([['右', 0.2], ['膝が痛いです。', 0.99]]) });
  s = applyEvent(s, { type: 'input_audio_buffer.committed', item_id: 'u2', previous_item_id: 'u1' });
  s = applyEvent(s, { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u2', transcript: '分かりました。' });
  const [u1, u2] = turnsInOrder(s);
  assert.equal(u1.asr.uncertain, true);
  assert.equal(u2.asr, undefined);
});

test('feedback marks corrections of lines the recogniser was unsure about; edited lines are trusted', () => {
  const msgs = [
    { role: 'user', text: '右膝が痛いと話しています。', source: 'voice', asrUncertain: true },
    { role: 'user', text: '原因はまだ分かりません。', source: 'voice', asrUncertain: true, edited: true },
    { role: 'user', text: '確認をお願いします。', source: 'voice' },
  ];
  const r = verifyFeedback({ improvements: [
    { original: '右膝が痛いと話しています。', better: 'a', reason: 'r' },
    { original: '原因はまだ分かりません。', better: 'b', reason: 'r' },
    { original: '確認をお願いします。', better: 'c', reason: 'r' },
  ] }, msgs);
  assert.deepEqual(r.improvements.map((c) => [c.better, !!c.fromVoice, !!c.uncertainTranscript]), [['a', true, true], ['b', false, false], ['c', true, false]]);
  assert.equal(r.quality.uncertainLines, 1);
  assert.equal(r.quality.uncertainCorrections, 1);
});

test('CK_ASR_LOGPROBS switch and metrics record numbers only', () => {
  assert.equal(asrLogprobs(() => undefined), false);
  assert.equal(asrLogprobs((k) => (k === 'CK_ASR_LOGPROBS' ? '1' : undefined)), true);
  assert.equal(asrLogprobs((k) => (k === 'CK_ASR_LOGPROBS' ? 'off' : undefined)), false);
  const m = new VoiceMetrics();
  m.observe({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: '右膝が痛いです。', logprobs: lp([['右', 0.2], ['膝', 0.99]]) });
  const entry = m.log.find((e) => e.type === 'conversation.item.input_audio_transcription.completed');
  assert.ok(entry.asrMean > 0 && entry.asrMin === 0.2);
  assert.ok(!JSON.stringify(m.log).includes('右膝'), 'no transcript text in the log');
  assert.deepEqual(m.summary({ realtime: 'x', transcribe: 'y' }).asr, { lines: 1, uncertain: 1 });
});
