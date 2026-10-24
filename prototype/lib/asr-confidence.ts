// Recognition confidence for a learner's voice line, from Realtime transcription logprobs.
//
// When the session is created with include: ["item.input_audio_transcription.logprobs"]
// (CK_ASR_LOGPROBS=1, off by default), conversation.item.input_audio_transcription.completed
// carries logprobs: [{ token, logprob, bytes }]. A line is "uncertain" when the recogniser itself
// was unsure, so the app asks the learner to check it and feedback does not treat it as a
// language error (CLAUDE.md: 转写不够时确认或标为不确定).
// The thresholds are first guesses and MUST be calibrated on real devices (DEVICE-001): the
// diagnostics log records mean/min per line without the text.

export type AsrConfidence = { mean: number; min: number; low: string[]; tokens: number; uncertain: boolean };

export const ASR_THRESHOLDS = { mean: 0.8, token: 0.3, lowToken: 0.5 };

type LogProb = { token?: unknown; logprob?: unknown };

const round = (x: number) => Math.round(x * 1000) / 1000;

/** null when there are no usable logprobs (feature off, or the model does not return them). */
export function confidenceOf(logprobs: unknown, t = ASR_THRESHOLDS): AsrConfidence | null {
  if (!Array.isArray(logprobs)) return null;
  const items = (logprobs as LogProb[]).filter((x) => x && typeof x.logprob === 'number' && Number.isFinite(x.logprob as number) && (x.logprob as number) <= 0);
  if (!items.length) return null;
  const probs = items.map((x) => Math.exp(x.logprob as number));
  const mean = Math.exp(items.reduce((a, x) => a + (x.logprob as number), 0) / items.length);
  const min = Math.min(...probs);
  const low = items.filter((_, i) => probs[i] < t.lowToken).map((x) => String(x.token ?? '').trim()).filter(Boolean).slice(0, 8);
  return { mean: round(mean), min: round(min), low, tokens: items.length, uncertain: mean < t.mean || min < t.token };
}
