// Voice-loop tests over a real loopback WebRTC connection to a SIMULATED
// Realtime peer (tests/harness/realtime-sim.mjs). They verify the app's own
// WebRTC/data-channel/transcript/hangup handling. They do not exercise OpenAI's
// model, speech recognition, VAD timing, audio quality or billing.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, openScene } from './helpers.mjs';
import { attachRealtimeSimulator, SIM_LAUNCH_ARGS, assistantTurn, userSpeech } from '../harness/realtime-sim.mjs';

let env, sim;
before(async () => {
  env = await setup({ launchArgs: SIM_LAUNCH_ARGS });
  sim = await attachRealtimeSimulator({ browser: env.browser, mock: env.mock });
});
after(async () => { await sim?.close(); await env?.close(); });

async function transcript(page) {
  return page.$$eval('.chat-message', (els) => els
    .filter((e) => e.dataset.status !== 'pending' && e.dataset.status !== 'empty')
    .map((e) => ({ role: e.classList.contains('user') ? 'user' : 'assistant', text: e.querySelector('p')?.textContent?.trim() || '', status: e.dataset.status || '' })));
}

async function startLive(page, title = 'お顔を拭く前のひとこと', query = '') {
  await openScene(page, env.baseUrl + query, title);
  const callsBefore = sim.callCount;
  await page.getByRole('button', { name: /音声でAIと話す/ }).click();
  await page.waitForFunction(() => true);
  const deadline = Date.now() + 15000;
  while (sim.callCount === callsBefore) {
    if (Date.now() > deadline) throw new Error('app never posted an SDP offer to /v1/realtime/calls');
    await new Promise((r) => setTimeout(r, 100));
  }
  await sim.waitForOpen();
  return sim.lastCallId();
}

/** Opening turn the way the app expects it: wait for the app's first response.create. */
async function openingTurn() {
  await sim.waitForClientEvent('response.create');
  const a1 = assistantTurn({ itemId: 'item_a1', previousItemId: null, text: 'そのタオルで何をするの？' });
  await sim.send([...a1.start, ...a1.deltas, ...a1.done]);
}

test('voice: a late input transcription is shown before the reply it triggered, with no duplicates', async () => {
  const page = await env.page();
  await startLive(page);
  await openingTurn();
  await page.waitForFunction(() => [...document.querySelectorAll('.chat-message.assistant p')].some((p) => p.textContent.includes('タオル')));

  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  const a2 = assistantTurn({ itemId: 'item_a2', previousItemId: 'item_u1', text: 'そうなのね。少しだけなら、いいわよ。', chunks: 2 });
  // Realistic race: the reply starts streaming before the transcription of the learner's turn completes.
  await sim.send([...u1.started, ...u1.committed, ...a2.start, a2.deltas[0], ...u1.transcribed('温かいタオルで、お顔を拭いてもよろしいですか。'), a2.deltas[1], ...a2.done]);
  await page.waitForFunction(() => [...document.querySelectorAll('.chat-message.assistant p')].some((p) => p.textContent.includes('少しだけなら')));
  await page.waitForTimeout(300);
  const t = await transcript(page);
  assert.deepEqual(t.map((m) => [m.role, m.text]), [
    ['assistant', 'そのタオルで何をするの？'],
    ['user', '温かいタオルで、お顔を拭いてもよろしいですか。'],
    ['assistant', 'そうなのね。少しだけなら、いいわよ。'],
  ]);
  assert.deepEqual(page.errors, []);
});

test('voice: finishing a session asks the server to hang up the Realtime call', async () => {
  const page = await env.page();
  const callId = await startLive(page);
  await openingTurn();
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  await sim.send([...u1.started, ...u1.committed, ...u1.transcribed('おはようございます。お顔を拭いてもよろしいですか。')]);
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.user').length >= 1);
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor({ timeout: 15000 });
  const deadline = Date.now() + 5000;
  while (!env.mock.state.hangups.some((h) => h.callId === callId) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  assert.ok(env.mock.state.hangups.some((h) => h.callId === callId), `no server-side hangup for ${callId}; hangups=${JSON.stringify(env.mock.state.hangups)}`);
});

test('voice: the voice transcript reaches feedback in conversation order', async () => {
  const page = await env.page();
  await startLive(page);
  await openingTurn();
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  const a2 = assistantTurn({ itemId: 'item_a2', previousItemId: 'item_u1', text: 'いいわよ。熱くしないでね。' });
  await sim.send([...u1.started, ...u1.committed, ...a2.start, ...a2.deltas, ...u1.transcribed('お顔を拭いてもよろしいですか。'), ...a2.done]);
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.user').length >= 1);
  env.mock.state.requests.length = 0;
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor({ timeout: 15000 });
  const fb = env.mock.state.requests.find((r) => r.path === '/v1/responses' && r.body?.text?.format?.name === 'care_feedback');
  assert.ok(fb, 'no feedback request reached the mock');
  let sent = JSON.parse(fb.body.input);
  if (!Array.isArray(sent)) sent = sent.messages;
  const order = sent.map((m) => m.role + ':' + m.text);
  assert.deepEqual(order.slice(0, 3), ['assistant:そのタオルで何をするの？', 'user:お顔を拭いてもよろしいですか。', 'assistant:いいわよ。熱くしないでね。']);
});

test('voice: an interrupted reply is marked as interrupted', async () => {
  const page = await env.page();
  await startLive(page);
  await openingTurn();
  const a2 = assistantTurn({ itemId: 'item_a2', previousItemId: 'item_a1', text: 'それでは、まずタオルの温度を確かめてから、ゆっくり始めましょうね。', chunks: 2 });
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a2' });
  await sim.send([...a2.start, a2.deltas[0]]);
  await page.waitForTimeout(200);
  await sim.send([...u1.started, ...a2.cancelled(650), ...u1.committed, ...u1.transcribed('すみません、もう一度お願いします。')]);
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.user').length >= 1);
  await page.waitForTimeout(300);
  const status = await page.$$eval('.chat-message.assistant', (els) => els.map((e) => e.dataset.status || ''));
  assert.ok(status.includes('interrupted'), `no assistant message marked interrupted: ${JSON.stringify(status)}`);
});

test('voice: a failed transcription is shown as not recognised instead of disappearing', async () => {
  const page = await env.page();
  await startLive(page);
  await openingTurn();
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  await sim.send([...u1.started, ...u1.committed, ...u1.failed]);
  await page.waitForSelector('.chat-message.user[data-status="failed"]', { timeout: 5000 });
});

test('voice: losing the connection is reported and the session can be resumed with its transcript', async () => {
  const page = await env.page();
  const first = await startLive(page);
  await openingTurn();
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  await sim.send([...u1.started, ...u1.committed, ...u1.transcribed('温かいタオルを用意しました。')]);
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.user').length >= 1);
  await sim.dropConnection(first);
  const resume = page.getByRole('button', { name: /音声で再接続/ });
  await resume.waitFor({ timeout: 20000 });
  const callsBefore = sim.callCount;
  await resume.click();
  const deadline = Date.now() + 15000;
  while (sim.callCount === callsBefore && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  assert.ok(sim.callCount > callsBefore, 'resume did not create a new realtime call');
  const instructions = sim.sessions.at(-1).session?.instructions || '';
  assert.ok(instructions.includes('温かいタオルを用意しました。'), 'resumed session does not carry the earlier transcript');
  await sim.waitForOpen();
  const t = await transcript(page);
  assert.ok(t.some((m) => m.text === '温かいタオルを用意しました。'), 'transcript lost after resume');
});

test('voice: connects under React StrictMode (development double effects)', async () => {
  const page = await env.page();
  await startLive(page, 'お顔を拭く前のひとこと', '?strict');
  await openingTurn();
  await page.waitForFunction(() => [...document.querySelectorAll('.chat-message.assistant p')].some((p) => p.textContent.includes('タオル')), null, { timeout: 8000 });
});

test('voice: diagnostics can be exported after a session', async () => {
  const page = await env.page();
  await startLive(page);
  await openingTurn();
  const u1 = userSpeech({ itemId: 'item_u1', previousItemId: 'item_a1' });
  const a2 = assistantTurn({ itemId: 'item_a2', previousItemId: 'item_u1', text: 'わかったわ。' });
  await sim.send([...u1.started, ...u1.committed, ...u1.transcribed('お顔を拭きますね。')]);
  await page.waitForTimeout(400);
  await sim.send([...a2.start, ...a2.deltas, ...a2.done]);
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor({ timeout: 15000 });
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByRole('button', { name: /診断ログ/ }).click()]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const diag = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(diag.kind, 'care-kotoba-voice-diagnostics');
  assert.ok(diag.sessions?.[0]?.callId, 'no call id');
  assert.ok(diag.sessions[0].usage.responses >= 2, 'usage not aggregated');
  assert.ok(diag.sessions[0].latency.samples.length >= 1, 'no reply latency samples');
  assert.ok(diag.sessions[0].estimatedCostUsd > 0, 'no cost estimate');
  assert.ok(diag.sessions[0].serverEnd?.hangup, 'server end result missing');
});
