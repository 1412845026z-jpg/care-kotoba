import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialTranscript, applyEvent, turnsInOrder, addTextTurn, editTurn, pendingUserTurns } from '@/lib/realtime-transcript';

const run = (events, state = initialTranscript()) => events.reduce(applyEvent, state);
const view = (s) => turnsInOrder(s).map((t) => [t.role, t.text, t.status]);

const opening = [
  { type: 'response.output_item.added', response_id: 'r1', item: { id: 'a1', type: 'message', role: 'assistant' } },
  { type: 'conversation.item.added', previous_item_id: null, item: { id: 'a1', type: 'message', role: 'assistant', content: [] } },
  { type: 'response.output_audio_transcript.delta', item_id: 'a1', response_id: 'r1', delta: 'そのタオルで' },
  { type: 'response.output_audio_transcript.delta', item_id: 'a1', response_id: 'r1', delta: '何をするの？' },
  { type: 'response.output_audio_transcript.done', item_id: 'a1', response_id: 'r1', transcript: 'そのタオルで何をするの？' },
  { type: 'response.done', response: { id: 'r1', status: 'completed', output: [{ id: 'a1' }] } },
];

test('late input transcription keeps conversation order and creates no duplicates', () => {
  const s = run([
    ...opening,
    { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' },
    { type: 'response.output_item.added', response_id: 'r2', item: { id: 'a2', type: 'message', role: 'assistant' } },
    { type: 'conversation.item.added', previous_item_id: 'u1', item: { id: 'a2', type: 'message', role: 'assistant', content: [] } },
    { type: 'response.output_audio_transcript.delta', item_id: 'a2', delta: 'そうなのね。' },
    { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'お顔を拭いてもよろしいですか。' },
    { type: 'response.output_audio_transcript.delta', item_id: 'a2', delta: 'いいわよ。' },
    { type: 'response.output_audio_transcript.done', item_id: 'a2', transcript: 'そうなのね。いいわよ。' },
  ]);
  assert.deepEqual(view(s), [
    ['assistant', 'そのタオルで何をするの？', 'done'],
    ['user', 'お顔を拭いてもよろしいですか。', 'done'],
    ['assistant', 'そうなのね。いいわよ。', 'done'],
  ]);
});

test('a reply whose added event arrives after its first delta is moved behind the learner turn', () => {
  const s = run([
    ...opening,
    { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' },
    { type: 'response.output_audio_transcript.delta', item_id: 'a2', delta: 'はい。' },
    { type: 'conversation.item.added', previous_item_id: 'u1', item: { id: 'a2', type: 'message', role: 'assistant', content: [] } },
    { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'こんにちは。' },
  ]);
  assert.deepEqual(view(s).map((x) => x[0] + ':' + x[1]), ['assistant:そのタオルで何をするの？', 'user:こんにちは。', 'assistant:はい。']);
});

test('pending learner turn is visible as pending and counted until transcribed', () => {
  const s = run([...opening, { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' }, { type: 'conversation.item.input_audio_transcription.delta', item_id: 'u1', delta: 'おは' }]);
  assert.equal(pendingUserTurns(s), 1);
  assert.deepEqual(view(s)[1], ['user', 'おは', 'pending']);
});

test('interruption: truncated item and cancelled response mark the reply interrupted, later done does not undo it', () => {
  const s = run([
    ...opening,
    { type: 'response.output_item.added', response_id: 'r2', item: { id: 'a2', type: 'message', role: 'assistant' } },
    { type: 'response.output_audio_transcript.delta', item_id: 'a2', delta: 'それでは、まず' },
    { type: 'conversation.item.truncated', item_id: 'a2', audio_end_ms: 650 },
    { type: 'response.done', response: { id: 'r2', status: 'cancelled', output: [{ id: 'a2' }] } },
    { type: 'response.output_audio_transcript.done', item_id: 'a2', transcript: 'それでは、まずタオルの温度を確かめましょう。' },
  ]);
  assert.equal(turnsInOrder(s)[1].status, 'interrupted');
});

test('failed and empty transcriptions are kept distinguishable', () => {
  const s = run([
    ...opening,
    { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' },
    { type: 'conversation.item.input_audio_transcription.failed', item_id: 'u1', error: { code: 'x' } },
    { type: 'input_audio_buffer.committed', item_id: 'u2', previous_item_id: 'u1' },
    { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u2', transcript: '   ' },
  ]);
  assert.deepEqual(view(s).slice(1).map((x) => x[2]), ['failed', 'empty']);
});

test('resumed session: seeds stay first and the new session starts after them', () => {
  const seed = [{ role: 'assistant', text: 'そのタオルで何をするの？' }, { role: 'user', text: '温かいタオルです。', source: 'voice' }];
  const s = run([{ type: 'input_audio_buffer.committed', item_id: 'u9', previous_item_id: null }, { type: 'conversation.item.input_audio_transcription.completed', item_id: 'u9', transcript: '続けてもいいですか。' }], initialTranscript(seed));
  assert.deepEqual(view(s).map((x) => x[1]), ['そのタオルで何をするの？', '温かいタオルです。', '続けてもいいですか。']);
  assert.equal(turnsInOrder(s)[1].source, 'voice');
});

test('typed text during a voice session merges with the server echo of the same item id', () => {
  let s = run(opening);
  s = addTextTurn(s, 'ck_txt_1', 'すみません、もう一度お願いします。');
  s = run([{ type: 'conversation.item.added', previous_item_id: 'a1', item: { id: 'ck_txt_1', type: 'message', role: 'user', content: [{ type: 'input_text', text: 'すみません、もう一度お願いします。' }] } }], s);
  assert.equal(turnsInOrder(s).length, 2);
  assert.equal(turnsInOrder(s)[1].source, 'text');
});

test('a learner correction is not overwritten by a later transcription event', () => {
  let s = run([...opening, { type: 'input_audio_buffer.committed', item_id: 'u1', previous_item_id: 'a1' }, { type: 'conversation.item.input_audio_transcription.failed', item_id: 'u1' }]);
  s = editTurn(s, 'u1', 'お顔を拭きます。');
  s = run([{ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'おかおをふきます' }], s);
  const t = turnsInOrder(s)[1];
  assert.equal(t.text, 'お顔を拭きます。');
  assert.equal(t.edited, true);
  assert.equal(t.status, 'done');
});

test('unknown and non-message events leave the state untouched', () => {
  const s0 = run(opening);
  const s1 = run([{ type: 'rate_limits.updated' }, { type: 'conversation.item.added', item: { id: 'f1', type: 'function_call' } }, {}], s0);
  assert.deepEqual(view(s1), view(s0));
});
