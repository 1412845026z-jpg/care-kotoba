// ENV-002 (Codex) regression: response.create must be tracked from the moment it is sent, not from
// response.created. Pure scripted server events; no WebRTC, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ResponseSequencer } from '@/lib/response-sequencer';
import { VoiceSession } from '@/lib/realtime-client';

function harness({ sendOk = true } = {}) {
  const sent = [];
  const seq = new ResponseSequencer((id) => { if (!sendOk) return false; sent.push(id); return true; }, 'rc');
  const ev = (type, extra = {}) => seq.observe({ type, ...extra });
  const added = (id) => ev('conversation.item.added', { item: { id } });
  const rejected = (eventId) => ev('error', { error: { code: 'conversation_already_has_active_response', ...(eventId ? { event_id: eventId } : {}) } });
  return { sent, seq, ev, added, rejected };
}

test('two lines typed before response.created send one create; the second gets its own reply after done', () => {
  const h = harness();
  assert.equal(h.seq.request('t1'), 'sent');
  assert.equal(h.seq.request('t2'), 'queued', 'create still in flight (no response.created yet)');
  assert.deepEqual(h.sent, ['rc_1']);
  // Real server order: t1 added, our create acknowledged, then t2 added (it came after the create).
  h.added('t1');
  h.ev('response.created');
  h.added('t2');
  assert.deepEqual(h.sent, ['rc_1']);
  h.ev('response.done');
  assert.deepEqual(h.sent, ['rc_1', 'rc_2'], 'follow-up create for t2');
  h.ev('response.created');
  h.ev('response.done');
  assert.deepEqual(h.seq.state.waiting, []);
  assert.equal(h.sent.length, 2, 'no extra creates');
});

test('the exact ENV-002 sequence (delayed ack, stray rejection, server never echoes items) still requests the follow-up', () => {
  const h = harness();
  h.seq.request('t1');
  h.seq.request('t2');
  h.ev('response.created');
  h.rejected(); // no event_id and nothing in flight: not ours, ignored
  h.ev('response.done');
  assert.deepEqual(h.sent, ['rc_1', 'rc_2']);
  h.ev('response.created');
  h.ev('response.done');
  assert.deepEqual(h.seq.state.waiting, []);
});

test('the opening create is in flight when the learner types: the line waits and is answered after the opening', () => {
  const h = harness();
  assert.equal(h.seq.request(), 'sent', 'opening line');
  assert.equal(h.seq.request('t1'), 'queued');
  h.ev('response.created');
  h.added('t1'); // added after the opening response was created: not covered by it
  h.ev('response.done');
  assert.deepEqual(h.sent, ['rc_1', 'rc_2']);
});

test('the opening is dropped (not queued) when a response is already running', () => {
  const h = harness();
  h.ev('response.created'); // e.g. server VAD answered first
  assert.equal(h.seq.request(), 'dropped');
  h.ev('response.done');
  assert.deepEqual(h.sent, []);
});

test('many lines typed during one answer produce exactly one create after it', () => {
  const h = harness();
  h.ev('response.created');
  for (const id of ['t1', 't2', 't3']) { assert.equal(h.seq.request(id), 'queued'); h.added(id); }
  h.ev('response.done');
  assert.deepEqual(h.sent, ['rc_1']);
  h.ev('response.created');
  h.ev('response.done');
  assert.deepEqual(h.seq.state.waiting, []);
  assert.equal(h.sent.length, 1);
});

test('a create rejected because server VAD started a response first is retried after that response', () => {
  const h = harness();
  h.seq.request('t1');
  h.ev('response.created'); // VAD response, created before the server saw t1
  h.added('t1');            // so t1 arrives after it
  h.rejected('rc_1');       // and our create is rejected (matched by event_id)
  assert.equal(h.seq.state.rejected, 1);
  h.ev('response.done');
  assert.deepEqual(h.sent, ['rc_1', 'rc_2'], 'retried once the VAD response is done');
});

test('a rejection while nothing is known to be active retries at most 3 times in a row', () => {
  const h = harness();
  h.seq.request('t1');
  for (let i = 1; i <= 5; i++) h.rejected(`rc_${i}`);
  assert.equal(h.sent.length, 4, '1 original + 3 immediate retries');
  h.ev('response.created');
  h.ev('response.done');
  assert.equal(h.sent.length, 5, 'still answered once things settle');
});

test('while the learner is speaking nothing is sent; the VAD response covers lines the server already added', () => {
  const h = harness();
  h.ev('input_audio_buffer.speech_started');
  assert.equal(h.seq.request('t1'), 'queued');
  h.added('t1');
  h.ev('input_audio_buffer.speech_stopped');
  h.ev('input_audio_buffer.committed');
  h.ev('response.created'); // created by server VAD, after t1 was added
  h.ev('response.done');
  assert.deepEqual(h.sent, [], 'no duplicate reply');
  assert.deepEqual(h.seq.state.waiting, []);
});

test('an empty commit after speech releases a queued line', () => {
  const h = harness();
  h.ev('input_audio_buffer.speech_started');
  h.seq.request('t1');
  h.ev('error', { error: { code: 'input_audio_buffer_commit_empty' } });
  assert.deepEqual(h.sent, ['rc_1']);
});

test('if the data channel cannot send, nothing is marked in flight and the line is sent later', () => {
  let ok = false;
  const sent = [];
  const seq = new ResponseSequencer((id) => { if (!ok) return false; sent.push(id); return true; }, 'rc');
  assert.equal(seq.request('t1'), 'queued');
  assert.equal(seq.state.inFlight, null);
  ok = true;
  seq.observe({ type: 'response.created' });
  seq.observe({ type: 'response.done' });
  assert.deepEqual(sent, ['rc_2']);
});

test('VoiceSession: delayed ack + two typed lines -> one create each, never two at once (fake data channel)', () => {
  const out = [];
  const session = new VoiceSession({ scenarioId: 'bath-5', variant: 'gentle', locale: 'zh', level: 'gentle', resume: true, audio: { play: async () => {}, pause() {}, srcObject: null }, onChange() {} });
  session.dc = { readyState: 'open', send: (raw) => out.push(JSON.parse(raw)) };
  const creates = () => out.filter((e) => e.type === 'response.create');
  assert.equal(session.sendText('今日は入りたくないお気持ちなのですね。'), true);
  assert.equal(session.sendText('少し時間をおいて、もう一度伺ってもよろしいですか。'), true);
  assert.equal(creates().length, 1, 'second create held until the first is answered');
  assert.ok(creates()[0].event_id, 'creates carry an event_id so rejections can be matched');
  const [first, second] = out.filter((e) => e.type === 'conversation.item.create').map((e) => e.item.id);
  session.onMessage(JSON.stringify({ type: 'conversation.item.added', item: { id: first } }));
  session.onMessage(JSON.stringify({ type: 'response.created', response: { id: 'r1' } }));
  session.onMessage(JSON.stringify({ type: 'conversation.item.added', item: { id: second } }));
  session.onMessage(JSON.stringify({ type: 'response.done', response: { id: 'r1', status: 'completed', output: [] } }));
  assert.equal(creates().length, 2);
  assert.equal(session.diagnostics().responses.waiting.length, 1, 'second line waits for its response.created');
  session.onMessage(JSON.stringify({ type: 'response.created', response: { id: 'r2' } }));
  assert.equal(session.diagnostics().responses.waiting.length, 0);
});
