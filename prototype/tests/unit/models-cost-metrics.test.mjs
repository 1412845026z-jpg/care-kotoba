import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveModels, lifecycleWarnings, MODEL_DEFAULTS } from '@/lib/models';
import { addRealtimeUsage, emptyUsage, estimateRealtimeUsd } from '@/lib/cost';
import { VoiceMetrics } from '@/lib/voice-metrics';

test('model overrides are validated; defaults reproduce the archived prototype', () => {
  assert.deepEqual({ ...resolveModels(() => undefined), voice: undefined }, { ...MODEL_DEFAULTS, voice: undefined });
  const m = resolveModels((k) => ({ CK_MODEL_TEXT: 'gpt-6-luna', CK_MODEL_REALTIME: 'bad model id!', CK_VOICE: 'cedar' })[k]);
  assert.equal(m.text, 'gpt-6-luna');
  assert.equal(m.realtime, 'gpt-realtime-mini');
  assert.equal(m.voice, 'cedar');
});

test('lifecycle warnings cover every default model with days left', () => {
  const w = lifecycleWarnings(MODEL_DEFAULTS, new Date('2026-10-23T00:00:00Z'));
  assert.deepEqual(w.map((x) => x.model).sort(), ['gpt-4.1-mini', 'gpt-4o-mini-transcribe', 'gpt-4o-mini-tts', 'gpt-realtime-mini']);
  assert.equal(w.find((x) => x.model === 'gpt-4.1-mini').daysLeft, 83);
  assert.deepEqual(lifecycleWarnings({ text: 'gpt-6-luna' }), []);
});

test('usage accounting separates cached tokens and estimates cost', () => {
  const u = addRealtimeUsage(emptyUsage(), { input_token_details: { text_tokens: 1000, audio_tokens: 200, cached_tokens_details: { text_tokens: 600, audio_tokens: 50 } }, output_token_details: { text_tokens: 20, audio_tokens: 300 } });
  assert.deepEqual(u, { textIn: 400, textCached: 600, audioIn: 150, audioCached: 50, textOut: 20, audioOut: 300 });
  const est = estimateRealtimeUsd('gpt-realtime-mini', u);
  // 400*.6 + 600*.06 + 20*2.4 + 150*10 + 50*.3 + 300*20 = 7839 per 1M
  assert.equal(est.usd, 0.007839);
  assert.equal(estimateRealtimeUsd('unknown-model', u).usd, null);
});

test('voice metrics: reply latency, barge-ins, usage and failures', () => {
  let now = 0;
  const m = new VoiceMetrics(() => now);
  now = 400; m.ready();
  const at = (t, e) => { now = t; m.observe(e); };
  at(900, { type: 'output_audio_buffer.started', response_id: 'r1' });
  at(2000, { type: 'output_audio_buffer.stopped', response_id: 'r1' });
  at(2100, { type: 'response.done', response: { id: 'r1', status: 'completed', usage: { input_token_details: { text_tokens: 100 }, output_token_details: { audio_tokens: 50 } } } });
  at(3000, { type: 'input_audio_buffer.speech_started' });
  at(4000, { type: 'input_audio_buffer.speech_stopped' });
  at(4050, { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' });
  at(5200, { type: 'output_audio_buffer.started', response_id: 'r2' });
  at(5600, { type: 'input_audio_buffer.speech_started' }); // learner talks over the reply
  at(5700, { type: 'output_audio_buffer.cleared', response_id: 'r2' });
  at(5800, { type: 'response.done', response: { id: 'r2', status: 'cancelled' } });
  at(6000, { type: 'conversation.item.input_audio_transcription.failed', item_id: 'u2', error: { code: 'audio_unintelligible' } });
  const s = m.summary({ realtime: 'gpt-realtime-mini', transcribe: 'gpt-4o-mini-transcribe' });
  assert.deepEqual(s.latency.samples, [1200]);
  assert.equal(s.firstAudioMs, 500);
  assert.equal(s.bargeIns, 1);
  assert.deepEqual(s.usage.byStatus, { completed: 1, cancelled: 1 });
  assert.equal(s.usage.transcription.failed, 1);
  assert.ok(s.estimatedCostUsd > 0);
  assert.equal(m.log.find((l) => l.type === 'input_audio_buffer.committed').prev, 'a1');
  const server = m.serverSummary({ realtime: 'gpt-realtime-mini', transcribe: 'gpt-4o-mini-transcribe' });
  assert.equal(server.cancelled, 1);
  assert.ok(Object.values(server).every((v) => typeof v === 'number' || (v && typeof v === 'object') || v === null), 'server summary is numbers only');
});

import { remainingSeconds } from '@/lib/realtime-client';
test('remaining time for the on-screen countdown', () => {
  assert.equal(remainingSeconds(180, undefined, 1000), null);
  assert.equal(remainingSeconds(0, 1000, 1000), null);
  assert.equal(remainingSeconds(180, 1_000, 1_000), 180);
  assert.equal(remainingSeconds(180, 1_000, 121_000), 60);
  assert.equal(remainingSeconds(180, 1_000, 120_500), 61, 'rounds up so it never shows 0 too early');
  assert.equal(remainingSeconds(180, 1_000, 999_000), 0);
});
