// Per-session voice metrics from Realtime server events, for the diagnostics
// export used in real-device tests (docs/09_REAL_DEVICE_VOICE_TEST.md).
// Measured in the browser: latencies include network and playback start, and the
// usage numbers are what the server reported to this client — not billing data.
import { addRealtimeUsage, emptyUsage, estimateRealtimeUsd, estimateTranscribeUsd, type UsageTotals } from './cost';
import type { RealtimeEvent } from './realtime-transcript';

export type LogEntry = { t: number; type: string; item?: string; prev?: string | null; resp?: string; status?: string; code?: string; ms?: number };

export class VoiceMetrics {
  readonly startedAt: number;
  readyAt: number | null = null;
  firstAudioAt: number | null = null;
  usage: UsageTotals = emptyUsage();
  transcription = { audioTokens: 0, textTokens: 0, seconds: 0, completed: 0, failed: 0, empty: 0 };
  responses: Record<string, number> = {};
  bargeIns = 0;
  latencies: number[] = [];
  errors: { type: string; code: string; message: string }[] = [];
  eventCounts: Record<string, number> = {};
  connection: { t: number; state: string }[] = [];
  log: LogEntry[] = [];
  private speaking = false;
  private turnEndedAt: number | null = null;
  private now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
    this.startedAt = now();
  }

  private push(entry: Omit<LogEntry, 't'>) {
    this.log.push({ t: this.now() - this.startedAt, ...entry });
    if (this.log.length > 600) this.log.splice(0, this.log.length - 600);
  }

  note(type: string, extra: Omit<LogEntry, 't' | 'type'> = {}) {
    this.push({ type, ...extra });
  }

  connectionState(state: string) {
    this.connection.push({ t: this.now() - this.startedAt, state });
    this.push({ type: 'client.connection', status: state });
  }

  ready() {
    this.readyAt = this.now();
    this.push({ type: 'client.datachannel_open' });
  }

  observe(e: RealtimeEvent) {
    const type = String(e?.type || 'unknown');
    this.eventCounts[type] = (this.eventCounts[type] || 0) + 1;
    const t = this.now();
    const entry: Omit<LogEntry, 't'> = { type };
    if (e.item_id) entry.item = String(e.item_id);
    if (e.item?.id) entry.item = String(e.item.id);
    if ('previous_item_id' in (e || {})) entry.prev = e.previous_item_id ?? null;
    if (e.response_id) entry.resp = String(e.response_id);
    switch (type) {
      case 'input_audio_buffer.speech_started':
        if (this.speaking) this.bargeIns++;
        this.turnEndedAt = null;
        break;
      case 'input_audio_buffer.speech_stopped':
        this.turnEndedAt = t;
        break;
      case 'input_audio_buffer.committed':
        if (this.turnEndedAt === null) this.turnEndedAt = t;
        break;
      case 'output_audio_buffer.started':
        this.speaking = true;
        if (this.firstAudioAt === null) this.firstAudioAt = t;
        if (this.turnEndedAt !== null) { entry.ms = t - this.turnEndedAt; this.latencies.push(entry.ms); this.turnEndedAt = null; }
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        this.speaking = false;
        break;
      case 'conversation.item.input_audio_transcription.completed': {
        this.transcription.completed++;
        if (!String(e.transcript || '').trim()) this.transcription.empty++;
        const u = e.usage || {};
        if (u.type === 'duration') this.transcription.seconds += Number(u.seconds) || 0;
        else { this.transcription.audioTokens += Number(u.input_token_details?.audio_tokens) || 0; this.transcription.textTokens += Number(u.output_tokens) || 0; }
        break;
      }
      case 'conversation.item.input_audio_transcription.failed':
        this.transcription.failed++;
        entry.code = String(e.error?.code || e.error?.type || 'failed');
        break;
      case 'response.done': {
        const status = String(e.response?.status || 'unknown');
        entry.status = status;
        entry.resp = String(e.response?.id || '');
        this.responses[status] = (this.responses[status] || 0) + 1;
        this.usage = addRealtimeUsage(this.usage, e.response?.usage);
        break;
      }
      case 'error':
        entry.code = String(e.error?.code || e.error?.type || 'error');
        this.errors.push({ type: String(e.error?.type || ''), code: entry.code, message: String(e.error?.message || '').slice(0, 160) });
        break;
    }
    this.push(entry);
  }

  summary(models: { realtime: string; transcribe: string }) {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const pct = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null);
    const realtime = estimateRealtimeUsd(models.realtime, this.usage);
    const transcribe = estimateTranscribeUsd(models.transcribe, this.transcription.audioTokens, this.transcription.textTokens, this.transcription.seconds);
    const totalResponses = Object.values(this.responses).reduce((a, b) => a + b, 0);
    return {
      durationSeconds: Math.round((this.now() - this.startedAt) / 100) / 10,
      connectMs: this.readyAt === null ? null : this.readyAt - this.startedAt,
      firstAudioMs: this.firstAudioAt === null || this.readyAt === null ? null : this.firstAudioAt - this.readyAt,
      latency: { definition: 'end of learner speech (speech_stopped/committed) -> output_audio_buffer.started, measured in the browser', samples: this.latencies, p50: pct(50), p95: pct(95), max: sorted.at(-1) ?? null },
      usage: { responses: totalResponses, byStatus: this.responses, tokens: this.usage, transcription: this.transcription },
      estimatedCostUsd: realtime.usd === null && transcribe.usd === null ? null : Math.round(((realtime.usd || 0) + (transcribe.usd || 0)) * 1e6) / 1e6,
      costBasis: [realtime.basis, transcribe.basis],
      bargeIns: this.bargeIns,
      errors: this.errors,
      eventCounts: this.eventCounts,
      connection: this.connection,
    };
  }

  /** Numbers only — safe to send to the server log at session end. */
  serverSummary(models: { realtime: string; transcribe: string }) {
    const s = this.summary(models);
    return { durationSeconds: s.durationSeconds, responses: s.usage.responses, cancelled: this.responses.cancelled || 0, failed: this.responses.failed || 0, tokens: s.usage.tokens, transcriptionFailed: this.transcription.failed, bargeIns: s.bargeIns, latencyP50: s.latency.p50, latencyP95: s.latency.p95, estimatedCostUsd: s.estimatedCostUsd, errors: this.errors.length };
  }
}
