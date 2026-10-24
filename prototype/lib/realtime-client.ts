// Browser-side OpenAI Realtime voice session over WebRTC (GA interface via our /api/session).
// Owns the RTCPeerConnection, data channel, microphone, transcript and metrics,
// and makes sure the server is asked to hang up the call however the session ends.
// UI-agnostic: components/practice.tsx renders the snapshot it emits.
import { addTextTurn, applyEvent, editTurn, initialTranscript, pendingUserTurns, turnsInOrder, type RealtimeEvent, type TranscriptState, type Turn } from './realtime-transcript';
import { VoiceMetrics } from './voice-metrics';
import { ResponseSequencer } from './response-sequencer';

export type VoicePhase = 'connecting' | 'live' | 'unstable' | 'ended';
export type VoiceActivity = 'idle' | 'listening' | 'thinking' | 'speaking';
export type VoiceEndReason = 'finish' | 'closed' | 'pagehide' | 'max_duration' | 'connection_lost' | 'remote_closed' | 'connection_failed' | 'start_failed' | 'aborted';
export type ServerEnd = { hangup: string; serverSeconds?: number; overMax?: boolean; transport: 'fetch' | 'beacon' | 'none'; status?: number };
export type VoiceSnapshot = { phase: VoicePhase; activity: VoiceActivity; audioBlocked: boolean; muted: boolean; endReason?: VoiceEndReason; error?: { code: string; message: string }; maxSeconds: number; callId?: string; liveSince?: number };
export type VoiceOptions = {
  scenarioId: string; variant: string; locale: string; level: string;
  seed?: { role: 'user' | 'assistant'; text: string; source?: 'voice' | 'text' }[];
  resume?: boolean;
  audio: HTMLAudioElement;
  onChange: (snapshot: VoiceSnapshot, turns: Turn[]) => void;
};

/** Seconds left before the session's time limit (null when not live). Pure; used for the on-screen countdown. */
export function remainingSeconds(maxSeconds: number, liveSince: number | undefined, now = Date.now()): number | null {
  if (!liveSince || !(maxSeconds > 0)) return null;
  return Math.max(0, Math.ceil(maxSeconds - (now - liveSince) / 1000));
}

export class VoiceError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

// Errors that do not end the conversation (e.g. cancelling when nothing is playing).
const BENIGN_ERRORS = new Set(['response_cancel_not_active', 'conversation_already_has_active_response', 'input_audio_buffer_commit_empty']);
const FATAL_ERRORS = new Set(['session_expired', 'insufficient_quota', 'invalid_api_key', 'rate_limit_exceeded']);
const DISCONNECT_GRACE_MS = 8000;

export class VoiceSession {
  private o: VoiceOptions;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private transcript: TranscriptState;
  private snap: VoiceSnapshot;
  private closing = false;
  private token: string | null = null;
  private serverEndPromise: Promise<ServerEnd> | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private textSeq = 0;
  // Decides when response.create may be sent (opening line, typed lines, retry after a rejection).
  // See lib/response-sequencer.ts; covered by tests/unit/response-sequencer.test.mjs.
  private responses = new ResponseSequencer((eventId) => this.send({ type: 'response.create', event_id: eventId }));
  readonly metrics = new VoiceMetrics();
  readonly startedAtIso = new Date().toISOString();
  models = { realtime: 'unknown', transcribe: 'unknown' };
  serverEnd: ServerEnd | null = null;

  constructor(options: VoiceOptions) {
    this.o = options;
    this.transcript = initialTranscript(options.seed || []);
    this.snap = { phase: 'connecting', activity: 'idle', audioBlocked: false, muted: false, maxSeconds: 180 };
  }

  get snapshot() { return this.snap; }
  get turns() { return turnsInOrder(this.transcript); }

  private emit(patch: Partial<VoiceSnapshot> = {}) {
    this.snap = { ...this.snap, ...patch };
    this.o.onChange(this.snap, this.turns);
  }

  async start() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new VoiceError('no_microphone_api', 'マイクに対応していないブラウザです。文字でも練習できます。');
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.closing) { mic.getTracks().forEach((t) => t.stop()); return; }
      this.mic = mic;
      this.metrics.note('client.microphone_ready');
      const pc = new RTCPeerConnection();
      this.pc = pc;
      pc.ontrack = (e) => { this.o.audio.srcObject = e.streams[0]; void this.tryPlay(); };
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      const dc = pc.createDataChannel('oai-events');
      this.dc = dc;
      dc.onopen = () => this.onOpen();
      dc.onclose = () => { if (!this.closing) this.end('remote_closed'); };
      dc.onmessage = (m) => this.onMessage(m.data);
      pc.onconnectionstatechange = () => this.onConnectionState(pc.connectionState);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.closing) return;
      const history = this.o.resume ? this.turns.filter((t) => (t.status === 'done' || t.status === 'interrupted') && t.text.trim()).map((t) => ({ role: t.role, text: t.text })) : undefined;
      const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sdp: offer.sdp, scenarioId: this.o.scenarioId, variant: this.o.variant, locale: this.o.locale, level: this.o.level, resume: !!this.o.resume, history }) });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new VoiceError(j.code || 'session_error', j.error || '音声AIに接続できませんでした。');
      }
      this.token = r.headers.get('x-ck-session');
      this.models = { realtime: r.headers.get('x-ck-model') || 'unknown', transcribe: r.headers.get('x-ck-transcribe-model') || 'unknown' };
      const max = Number(r.headers.get('x-ck-session-max'));
      const callId = r.headers.get('x-ck-call') || undefined;
      const answer = await r.text();
      this.metrics.note('client.session_created', { item: callId });
      if (this.closing) { this.requestServerEnd('aborted', true); return; }
      this.emit({ maxSeconds: Number.isFinite(max) && max > 0 ? max : 180, callId });
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (e) {
      const err = e as { name?: string; code?: string; message?: string };
      const code = err.name === 'NotAllowedError' ? 'microphone_denied' : err.name === 'NotFoundError' ? 'microphone_missing' : err.code || 'start_failed';
      const message = code === 'microphone_denied' ? 'マイクが許可されていません。ブラウザで許可するか、文字で練習できます。' : code === 'microphone_missing' ? 'マイクが見つかりません。文字で練習できます。' : err.message || '音声に接続できませんでした。';
      this.metrics.note('client.start_failed', { code });
      this.end('start_failed', { code, message });
    }
  }

  private onOpen() {
    if (this.closing) return;
    this.metrics.ready();
    this.emit({ phase: 'live', liveSince: Date.now() });
    // The session instructions already contain the opening line; no per-response instruction
    // override (that would replace the role/scene instructions for this response).
    if (!this.o.resume) this.responses.request();
    this.timers.push(setTimeout(() => this.end('max_duration'), this.snap.maxSeconds * 1000));
  }

  private onConnectionState(state: RTCPeerConnectionState) {
    this.metrics.connectionState(state);
    if (this.closing) return;
    if (state === 'connected' && this.snap.phase === 'unstable') this.emit({ phase: 'live' });
    if (state === 'disconnected') {
      this.emit({ phase: 'unstable' });
      this.timers.push(setTimeout(() => { if (!this.closing && this.pc?.connectionState !== 'connected') this.end('connection_lost'); }, DISCONNECT_GRACE_MS));
    }
    if (state === 'failed') this.end('connection_failed');
  }

  private onMessage(data: unknown) {
    if (this.closing && this.snap.phase === 'ended') return;
    let e: RealtimeEvent;
    try { e = JSON.parse(String(data)); } catch { return; }
    this.metrics.observe(e);
    this.transcript = applyEvent(this.transcript, e);
    this.responses.observe(e);
    let activity = this.snap.activity;
    switch (e.type) {
      case 'input_audio_buffer.speech_started': activity = 'listening'; break;
      case 'input_audio_buffer.speech_stopped': case 'input_audio_buffer.committed': activity = 'thinking'; break;
      case 'output_audio_buffer.started': activity = 'speaking'; break;
      case 'output_audio_buffer.stopped': case 'output_audio_buffer.cleared': activity = 'idle'; break;
      case 'response.done': if (activity === 'thinking') activity = 'idle'; break;
    }
    let error = this.snap.error;
    if (e.type === 'error') {
      const code = String(e.error?.code || e.error?.type || 'error');
      if (!BENIGN_ERRORS.has(code)) error = { code, message: '音声AIでエラーが発生しました。' + (FATAL_ERRORS.has(code) ? '文字の練習に切り替えられます。' : '話し続けても大丈夫です。') };
      if (FATAL_ERRORS.has(code)) { this.emit({ activity, error }); this.end('connection_failed', error); return; }
    }
    this.emit({ activity, error });
  }

  private send(event: Record<string, unknown>) {
    if (this.dc?.readyState !== 'open') return false;
    this.dc.send(JSON.stringify(event));
    this.metrics.note('client.' + String(event.type));
    return true;
  }

  sendText(text: string): boolean {
    const t = text.trim();
    if (!t || this.dc?.readyState !== 'open') return false;
    const id = `ck_txt_${Date.now().toString(36)}_${++this.textSeq}`.slice(0, 32);
    this.transcript = addTextTurn(this.transcript, id, t);
    this.send({ type: 'conversation.item.create', item: { id, type: 'message', role: 'user', content: [{ type: 'input_text', text: t }] } });
    if (this.responses.request(id) === 'queued') this.metrics.note('client.response_queued', { item: id });
    this.emit({ activity: 'thinking' });
    return true;
  }

  edit(id: string, text: string) {
    this.transcript = editTurn(this.transcript, id, text);
    this.emit();
  }

  setMuted(muted: boolean) {
    this.mic?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
    this.metrics.note(muted ? 'client.mute' : 'client.unmute');
    this.emit({ muted });
  }

  private async tryPlay() {
    try { await this.o.audio.play(); if (this.snap.audioBlocked) this.emit({ audioBlocked: false }); }
    catch { this.metrics.note('client.audio_blocked'); this.emit({ audioBlocked: true }); }
  }

  /** Call from a tap handler when the browser blocked autoplay. */
  async unlockAudio() { await this.tryPlay(); return !this.snap.audioBlocked; }

  /** Wait (up to waitMs) for in-flight transcriptions of the learner's last turn, so feedback sees the last thing they said. */
  async drain(waitMs = 1500) {
    const until = Date.now() + waitMs;
    while (this.snap.phase !== 'ended' && pendingUserTurns(this.transcript) > 0 && Date.now() < until) await new Promise((r) => setTimeout(r, 50));
  }

  /** End the session and ask the server to hang up. Resolves with the server's answer (or null without a session token). */
  stop(reason: VoiceEndReason): Promise<ServerEnd | null> {
    this.end(reason);
    return this.serverEndPromise ?? Promise.resolve(this.serverEnd);
  }

  private end(reason: VoiceEndReason, error?: { code: string; message: string }) {
    if (this.snap.phase === 'ended' && this.closing) return;
    this.closing = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    try { this.dc?.close(); } catch {}
    try { this.pc?.close(); } catch {}
    this.mic?.getTracks().forEach((t) => t.stop());
    try { this.o.audio.pause(); this.o.audio.srcObject = null; } catch {}
    this.metrics.note('client.end', { status: reason });
    // Pending learner turns that never got a transcript are shown as not recognised.
    for (const t of this.turns) if (t.role === 'user' && t.status === 'pending') this.transcript = applyEvent(this.transcript, { type: 'conversation.item.input_audio_transcription.failed', item_id: t.id });
    this.requestServerEnd(reason, reason === 'closed' || reason === 'pagehide' || reason === 'aborted');
    this.emit({ phase: 'ended', activity: 'idle', endReason: reason, ...(error ? { error } : {}) });
  }

  private requestServerEnd(reason: VoiceEndReason, beacon: boolean) {
    if (this.serverEndPromise) return;
    // No token yet (the session request is still in flight): start() requests the hangup once it arrives.
    if (!this.token) { this.serverEnd = { hangup: 'no_session_token', transport: 'none' }; return; }
    const body = JSON.stringify({ token: this.token, reason, metrics: this.metrics.serverSummary(this.models) });
    if (beacon && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/session/end', new Blob([body], { type: 'text/plain;charset=UTF-8' }))) {
      this.serverEnd = { hangup: 'requested', transport: 'beacon' };
      this.serverEndPromise = Promise.resolve(this.serverEnd);
      return;
    }
    this.serverEndPromise = fetch('/api/session/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, signal: AbortSignal.timeout(5000) })
      .then(async (r) => { const j = (await r.json().catch(() => ({}))) as { hangup?: string; serverSeconds?: number; overMax?: boolean }; return { hangup: j.hangup || `http_${r.status}`, serverSeconds: j.serverSeconds, overMax: j.overMax, transport: 'fetch' as const, status: r.status }; })
      .catch(() => ({ hangup: 'request_failed', transport: 'fetch' as const }))
      .then((res) => { this.serverEnd = res; return res; });
  }

  diagnostics() {
    return {
      callId: this.snap.callId || null,
      startedAt: this.startedAtIso,
      resume: !!this.o.resume,
      models: this.models,
      maxSeconds: this.snap.maxSeconds,
      endReason: this.snap.endReason || null,
      serverEnd: this.serverEnd,
      responses: this.responses.state,
      ...this.metrics.summary(this.models),
      log: this.metrics.log,
    };
  }
}
