// Simulated OpenAI Realtime peer for browser tests.
//
// A second Chromium page plays the role of the Realtime server: it answers the
// app's real WebRTC offer (forwarded by mock-openai /v1/realtime/calls),
// receives the app's "oai-events" data channel, sends back an audio track and
// scripted server events. This exercises the app's actual RTCPeerConnection,
// data-channel and transcript code over a real (loopback) WebRTC connection.
//
// It does NOT reproduce OpenAI's model behaviour, timing, audio quality, VAD or
// billing. Event shapes follow the GA Realtime API docs as checked 2026-10-23.

export const SIM_LAUNCH_ARGS = ['--disable-features=WebRtcHideLocalIpsWithMdns'];

export async function attachRealtimeSimulator({ browser, mock }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('about:blank');
  let calls = 0;
  const sessions = [];

  mock.state.onRealtimeCall = async ({ sdp, session }) => {
    calls += 1;
    const callId = `rtc_sim${calls}_${Math.random().toString(36).slice(2, 10)}`;
    sessions.push({ callId, session, at: Date.now() });
    const answer = await page.evaluate(async ({ offer, callId }) => {
      const sim = (window.__sims ||= {});
      const pc = new RTCPeerConnection();
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      dest.stream.getTracks().forEach((t) => pc.addTrack(t, dest.stream));
      const state = { pc, ctx, callId, received: [], dc: null, open: false, closedByApp: false };
      sim[callId] = state;
      window.__lastSim = callId;
      pc.ondatachannel = (e) => {
        state.dc = e.channel;
        state.dc.onopen = () => { state.open = true; };
        state.dc.onclose = () => { state.open = false; };
        state.dc.onmessage = (m) => { try { state.received.push({ ...JSON.parse(m.data), __at: Date.now() }); } catch { state.received.push({ raw: m.data }); } };
        if (state.dc.readyState === 'open') state.open = true;
      };
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const t = setTimeout(resolve, 3000);
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } };
      });
      return pc.localDescription.sdp;
    }, { offer: sdp, callId });
    return { sdp: answer, callId };
  };

  mock.state.onHangup = async (callId) => {
    await page.evaluate((id) => { const s = window.__sims?.[id]; if (s) { s.hungUp = true; s.pc.close(); s.ctx.close(); } }, callId).catch(() => {});
  };

  const api = {
    page,
    sessions,
    get callCount() { return calls; },
    lastCallId() { return sessions.at(-1)?.callId; },
    async waitForOpen(callId = api.lastCallId(), timeout = 15000) {
      await page.waitForFunction((id) => window.__sims?.[id]?.open === true, callId, { timeout });
    },
    async send(events, callId = api.lastCallId()) {
      const list = Array.isArray(events) ? events : [events];
      await page.evaluate(({ list, id }) => {
        const s = window.__sims[id];
        let n = (s.eventSeq ||= 0);
        for (const e of list) { n += 1; s.dc.send(JSON.stringify({ event_id: `evt_sim_${n}`, ...e })); }
        s.eventSeq = n;
      }, { list, id: callId });
    },
    async pause(ms) { await page.waitForTimeout(ms); },
    async received(callId = api.lastCallId()) {
      return page.evaluate((id) => window.__sims?.[id]?.received || [], callId);
    },
    async waitForClientEvent(type, { callId = api.lastCallId(), timeout = 10000, count = 1 } = {}) {
      await page.waitForFunction(({ id, type, count }) => (window.__sims?.[id]?.received || []).filter((e) => e.type === type).length >= count, { id: callId, type, count }, { timeout });
      return (await api.received(callId)).filter((e) => e.type === type);
    },
    async dropConnection(callId = api.lastCallId()) {
      // Simulates the server side vanishing (network loss / server-side end) without a hangup request.
      await page.evaluate((id) => { const s = window.__sims?.[id]; if (s) { s.pc.close(); s.ctx.close(); } }, callId);
    },
    async isClosed(callId = api.lastCallId()) {
      return page.evaluate((id) => { const s = window.__sims?.[id]; return !s || s.pc.connectionState === 'closed' || s.pc.signalingState === 'closed'; }, callId);
    },
    async close() { await context.close(); },
  };
  return api;
}

// ---- Scripted event builders (GA Realtime event shapes) --------------------

let respSeq = 0;
export function usage({ textIn = 900, audioIn = 120, cachedText = 600, cachedAudio = 0, textOut = 30, audioOut = 160 } = {}) {
  return {
    total_tokens: textIn + audioIn + textOut + audioOut,
    input_tokens: textIn + audioIn,
    output_tokens: textOut + audioOut,
    input_token_details: { text_tokens: textIn, audio_tokens: audioIn, image_tokens: 0, cached_tokens: cachedText + cachedAudio, cached_tokens_details: { text_tokens: cachedText, audio_tokens: cachedAudio, image_tokens: 0 } },
    output_token_details: { text_tokens: textOut, audio_tokens: audioOut },
  };
}

/** Assistant turn split into parts so a test can interleave other events. */
export function assistantTurn({ itemId, previousItemId = null, text, chunks = 3 }) {
  const responseId = `resp_sim_${++respSeq}`;
  const size = Math.ceil(text.length / chunks);
  const deltas = Array.from({ length: chunks }, (_, i) => text.slice(i * size, (i + 1) * size)).filter(Boolean);
  const start = [
    { type: 'response.created', response: { id: responseId, object: 'realtime.response', status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', response_id: responseId, output_index: 0, item: { id: itemId, type: 'message', role: 'assistant', status: 'in_progress', content: [] } },
    { type: 'conversation.item.added', previous_item_id: previousItemId, item: { id: itemId, type: 'message', role: 'assistant', status: 'in_progress', content: [] } },
    { type: 'output_audio_buffer.started', response_id: responseId },
  ];
  const deltaEvents = deltas.map((delta) => ({ type: 'response.output_audio_transcript.delta', response_id: responseId, item_id: itemId, output_index: 0, content_index: 0, delta }));
  const done = [
    { type: 'response.output_audio_transcript.done', response_id: responseId, item_id: itemId, output_index: 0, content_index: 0, transcript: text },
    { type: 'output_audio_buffer.stopped', response_id: responseId },
    { type: 'response.done', response: { id: responseId, object: 'realtime.response', status: 'completed', output: [{ id: itemId, type: 'message', role: 'assistant' }], usage: usage() } },
  ];
  const cancelled = (audioEndMs = 700) => [
    { type: 'output_audio_buffer.cleared', response_id: responseId },
    { type: 'conversation.item.truncated', item_id: itemId, content_index: 0, audio_end_ms: audioEndMs },
    { type: 'response.done', response: { id: responseId, object: 'realtime.response', status: 'cancelled', status_details: { type: 'cancelled', reason: 'turn_detected' }, output: [{ id: itemId, type: 'message', role: 'assistant' }], usage: usage({ audioOut: 40 }) } },
  ];
  return { responseId, start, deltas: deltaEvents, done, cancelled };
}

export function userSpeech({ itemId, previousItemId, audioStartMs = 1000, audioEndMs = 3200 }) {
  return {
    started: [{ type: 'input_audio_buffer.speech_started', audio_start_ms: audioStartMs, item_id: itemId }],
    committed: [
      { type: 'input_audio_buffer.speech_stopped', audio_end_ms: audioEndMs, item_id: itemId },
      { type: 'input_audio_buffer.committed', previous_item_id: previousItemId, item_id: itemId },
      { type: 'conversation.item.added', previous_item_id: previousItemId, item: { id: itemId, type: 'message', role: 'user', status: 'completed', content: [{ type: 'input_audio', transcript: null }] } },
    ],
    transcribed: (transcript) => [
      { type: 'conversation.item.input_audio_transcription.delta', item_id: itemId, content_index: 0, delta: transcript.slice(0, Math.ceil(transcript.length / 2)) },
      { type: 'conversation.item.input_audio_transcription.completed', item_id: itemId, content_index: 0, transcript, usage: { type: 'tokens', total_tokens: 60, input_tokens: 50, input_token_details: { text_tokens: 0, audio_tokens: 50 }, output_tokens: 10 } },
    ],
    failed: [{ type: 'conversation.item.input_audio_transcription.failed', item_id: itemId, content_index: 0, error: { type: 'transcription_error', code: 'audio_unintelligible', message: 'sim' } }],
  };
}
