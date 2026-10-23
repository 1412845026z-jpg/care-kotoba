// Server-side checks on AI feedback: a quote presented as "what you said" must
// actually come from the learner's lines. Pure functions, unit-tested.

export type FeedbackMessage = { role: 'user' | 'assistant'; text: string; source?: 'voice' | 'text'; edited?: boolean; status?: string };
export type Correction = { original: string; better: string; reason: string };
export type FeedbackGoal = { label: string; achieved: boolean; evidence: string; evidenceVerified?: boolean };
export type FeedbackResult = { score: number; heading: string; summary: string; strengths: string[]; improvements: (Correction & { verified?: boolean })[]; goals: FeedbackGoal[]; nextPhrase: string; quality?: Record<string, unknown> };

const PUNCT = /[\s　、。，．,.!！?？・…‥「」『』（）()\[\]【】〈〉《》“”"'’‘：:；;~〜－\-]/g;

export function normalizeJa(s: string): string {
  return (s || '').normalize('NFKC').toLowerCase().replace(PUNCT, '');
}

function bigrams(s: string) {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

export function similarity(a: string, b: string): number {
  const x = normalizeJa(a), y = normalizeJa(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bx = bigrams(x), by = bigrams(y);
  if (!bx.length || !by.length) return 0;
  const counts = new Map<string, number>();
  for (const g of by) counts.set(g, (counts.get(g) || 0) + 1);
  let hit = 0;
  for (const g of bx) { const n = counts.get(g) || 0; if (n) { hit++; counts.set(g, n - 1); } }
  return (2 * hit) / (bx.length + by.length);
}

function pieces(text: string): string[] {
  return [text, ...text.split(/[。！？!?\n]+/)].map((t) => t.trim()).filter(Boolean);
}

/** True when `quote` is (a near-verbatim part of) one of the learner's lines. */
export function isQuotedFrom(quote: string, learnerTexts: string[], threshold = 0.82): boolean {
  const q = normalizeJa(quote);
  if (q.length < 2) return false;
  for (const t of learnerTexts) {
    if (normalizeJa(t).includes(q)) return true;
    for (const p of pieces(t)) if (similarity(quote, p) >= threshold) return true;
  }
  return false;
}

/** Text inside 「」 or "" in an evidence string. */
export function quotedSegments(evidence: string): string[] {
  return [...(evidence || '').matchAll(/[「『"“]([^」』"”]{2,200})[」』"”]/g)].map((m) => m[1]);
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Keep only improvements whose `original` is the learner's own words; flag goals whose
 * evidence cannot be traced to a learner line. Never invents or upgrades anything.
 */
export function verifyFeedback(raw: Partial<FeedbackResult>, messages: FeedbackMessage[]): FeedbackResult {
  const learner = messages.filter((m) => m.role === 'user' && m.text?.trim()).map((m) => m.text);
  const improvements = (Array.isArray(raw.improvements) ? raw.improvements : []).slice(0, 6).map((c) => ({ original: str(c?.original, 400), better: str(c?.better, 400), reason: str(c?.reason, 600) }));
  const kept = improvements.filter((c) => c.better && isQuotedFrom(c.original, learner)).slice(0, 3).map((c) => ({ ...c, verified: true }));
  const dropped = improvements.filter((c) => !kept.some((k) => k.original === c.original && k.better === c.better)).map((c) => c.original);
  const goals = (Array.isArray(raw.goals) ? raw.goals : []).slice(0, 6).map((g) => {
    const evidence = str(g?.evidence, 400);
    const quotes = quotedSegments(evidence);
    const evidenceVerified = quotes.length > 0 ? quotes.every((q) => isQuotedFrom(q, learner)) : false;
    return { label: str(g?.label, 120), achieved: g?.achieved === true, evidence, evidenceVerified };
  });
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    heading: str(raw.heading, 200),
    summary: str(raw.summary, 1200),
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).filter((s) => typeof s === 'string').slice(0, 5).map((s) => s.slice(0, 400)),
    improvements: kept,
    goals,
    nextPhrase: str(raw.nextPhrase, 300),
    quality: { droppedUnquotedImprovements: dropped.length, learnerLines: learner.length, voiceLines: messages.filter((m) => m.role === 'user' && m.source === 'voice').length, editedLines: messages.filter((m) => m.role === 'user' && m.edited).length },
  };
}

/** A chat-turn correction is only kept if it corrects what the learner actually just said. */
export function verifyCorrection(c: unknown, lastLearnerLine: string): Correction | null {
  if (!c || typeof c !== 'object') return null;
  const x = c as Partial<Correction>;
  const original = str(x.original, 400), better = str(x.better, 400), reason = str(x.reason, 600);
  if (!better || !isQuotedFrom(original, [lastLearnerLine])) return null;
  return { original, better, reason };
}
