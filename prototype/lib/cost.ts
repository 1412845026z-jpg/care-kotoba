// Rough API cost estimates for diagnostics and test planning. NOT billing data:
// the authoritative numbers are the OpenAI usage dashboard / Usage API. Prices are
// USD per 1M tokens, checked 2026-10-23 on developers.openai.com (model pages and
// /api/docs/pricing). Update `checked` when you change a number.

export type Rates = { textIn: number; textCached: number; textOut: number; audioIn: number; audioCached: number; audioOut: number };
export const PRICING_CHECKED = '2026-10-23';
export const REALTIME_PRICES: Record<string, Rates & { note?: string }> = {
  'gpt-realtime-2.1-mini': { textIn: 0.6, textCached: 0.06, textOut: 2.4, audioIn: 10, audioCached: 0.3, audioOut: 20 },
  'gpt-realtime-mini': { textIn: 0.6, textCached: 0.06, textOut: 2.4, audioIn: 10, audioCached: 0.3, audioOut: 20, note: 'Text rates from the model page. The current pricing page no longer lists gpt-realtime-mini audio rates; audio assumed equal to gpt-realtime-2.1-mini.' },
};
/** Input-transcription models: USD per 1M audio input tokens / text output tokens. */
export const TRANSCRIBE_PRICES: Record<string, { audioIn: number; textOut: number; perMinute?: number }> = {
  'gpt-4o-mini-transcribe': { audioIn: 1.25, textOut: 5, perMinute: 0.003 },
  'gpt-transcribe': { audioIn: 0, textOut: 0, perMinute: 0.0045 },
  'gpt-live-transcribe': { audioIn: 0, textOut: 0, perMinute: 0.017 },
};
export const TEXT_PRICES: Record<string, { in: number; cached: number; out: number }> = {
  'gpt-4.1-mini': { in: 0.4, cached: 0.1, out: 1.6 },
  'gpt-6-luna': { in: 0.1, cached: 0.01, out: 0.5 },
};

export type UsageTotals = { textIn: number; textCached: number; audioIn: number; audioCached: number; textOut: number; audioOut: number };
export const emptyUsage = (): UsageTotals => ({ textIn: 0, textCached: 0, audioIn: 0, audioCached: 0, textOut: 0, audioOut: 0 });

/** Adds one Realtime `response.done` usage object. input_*_tokens include the cached part. */
export function addRealtimeUsage(total: UsageTotals, usage: unknown): UsageTotals {
  const u = (usage || {}) as { input_token_details?: { text_tokens?: number; audio_tokens?: number; cached_tokens_details?: { text_tokens?: number; audio_tokens?: number } }; output_token_details?: { text_tokens?: number; audio_tokens?: number } };
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  const cachedText = n(u.input_token_details?.cached_tokens_details?.text_tokens), cachedAudio = n(u.input_token_details?.cached_tokens_details?.audio_tokens);
  return {
    textIn: total.textIn + Math.max(0, n(u.input_token_details?.text_tokens) - cachedText),
    textCached: total.textCached + cachedText,
    audioIn: total.audioIn + Math.max(0, n(u.input_token_details?.audio_tokens) - cachedAudio),
    audioCached: total.audioCached + cachedAudio,
    textOut: total.textOut + n(u.output_token_details?.text_tokens),
    audioOut: total.audioOut + n(u.output_token_details?.audio_tokens),
  };
}

export function estimateRealtimeUsd(model: string, t: UsageTotals): { usd: number | null; basis: string } {
  const r = REALTIME_PRICES[model] || REALTIME_PRICES[Object.keys(REALTIME_PRICES).find((k) => model.startsWith(k + '-')) || ''];
  if (!r) return { usd: null, basis: `no price table for ${model}` };
  const usd = (t.textIn * r.textIn + t.textCached * r.textCached + t.textOut * r.textOut + t.audioIn * r.audioIn + t.audioCached * r.audioCached + t.audioOut * r.audioOut) / 1e6;
  return { usd: Math.round(usd * 1e6) / 1e6, basis: `${model} rates checked ${PRICING_CHECKED}${r.note ? ' — ' + r.note : ''}` };
}

export function estimateTranscribeUsd(model: string, audioTokens: number, textTokens: number, seconds = 0): { usd: number | null; basis: string } {
  const r = TRANSCRIBE_PRICES[model];
  if (!r) return { usd: null, basis: `no price table for ${model}` };
  const byTokens = (audioTokens * r.audioIn + textTokens * r.textOut) / 1e6;
  const usd = byTokens > 0 ? byTokens : (r.perMinute || 0) * (seconds / 60);
  return { usd: Math.round(usd * 1e6) / 1e6, basis: `${model} rates checked ${PRICING_CHECKED}` };
}
