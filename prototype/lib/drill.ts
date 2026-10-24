// Pure helper for the one-line drill (components/line-drill.tsx).
export type DrillMessage = { role: 'user' | 'assistant'; text: string };

/** The conversation before the learner line that contains `original` (falls back to the whole conversation). */
export function contextBefore(messages: DrillMessage[], original: string): DrillMessage[] {
  const norm = (s: string) => (s || '').normalize('NFKC').replace(/[\s、。，．,.!！?？「」]/g, '');
  const target = norm(original);
  const i = messages.findIndex((m) => m.role === 'user' && target.length > 1 && norm(m.text).includes(target));
  return i >= 0 ? messages.slice(0, i) : messages;
}
