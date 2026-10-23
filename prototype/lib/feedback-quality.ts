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

// --- Pronunciation claims ------------------------------------------------------------------------
// Feedback is generated from TEXT (transcripts and typed lines); it cannot show how something was
// pronounced. A sentence that judges pronunciation, accent or intonation is removed; a sentence that
// only says pronunciation is NOT assessed is kept. (EVAL-002 tag: pronunciation_claim_without_audio.)
const PRONUNCIATION = /発音|発声|アクセント|イントネーション|抑揚|なまり|訛り|发音|發音|读音不准|語調|语调|声调|聲調|口音|pronunciation|pronounc|accent|intonation/i;
const NOT_ASSESSED = [
  /(発音|アクセント|イントネーション|抑揚)[^。．.!！?？\n]{0,24}(判断|評価|判定|採点|確認|分かり|わかり)[^。．.!！?？\n]{0,6}(でき)?(ません|ない|しない|していない)/,
  /(文字|テキスト|転写|書き起こし)(から|だけで|では)[^。．.!！?？\n]{0,20}(発音|アクセント|イントネーション)/,
  /(发音|發音|语调|声调|口音)[^。．.!！?？\n]{0,20}(无法|無法|不能|不会|不會|没有|沒有|未)[^。．.!！?？\n]{0,4}(判断|判斷|评价|評價|评估|評估|评分|評分|检查|檢查)/,
  /(无法|無法|不能|不会|不會|没有|沒有|未|不)[^。．.!！?？\n]{0,10}(判断|判斷|评价|評價|评估|評估|评分|評分)[^。．.!！?？\n]{0,10}(发音|發音|语调|声调|口音)/,
  /(文字|文本|转写|轉寫)[^。．.!！?？\n]{0,10}(无法|無法|不能)[^。．.!！?？\n]{0,10}(发音|發音)/,
  /\b(not|never|cannot|can't|can ?not|unable to|without audio)\b[^.!?\n]{0,40}\b(pronunciation|pronounc|accent|intonation)/i,
  /\b(pronunciation|accent|intonation)\b[^.!?\n]{0,40}\b(not|cannot|can't|isn't|is not|wasn't)\b[^.!?\n]{0,15}\b(assess|judg|evaluat|scor|check)/i,
];

/** True when the text judges pronunciation (as opposed to saying it is not assessed). */
export function claimsPronunciation(text: string): boolean {
  return sentences(text).some((x) => PRONUNCIATION.test(x) && !NOT_ASSESSED.some((r) => r.test(x)));
}

function sentences(text: string): string[] {
  return (text || '').match(/[^。．.!！?？\n]+[。．.!！?？]*|\n/g)?.filter((x) => x.trim()) || [];
}

/** Remove sentences that judge pronunciation; returns the text and how many sentences were removed. */
export function stripPronunciationClaims(text: string): { text: string; removed: number } {
  const parts = (text || '').match(/[^。．.!！?？\n]+[。．.!！?？]*\s*|\n/g) || [];
  let removed = 0;
  const kept = parts.filter((x) => {
    const claim = PRONUNCIATION.test(x) && !NOT_ASSESSED.some((r) => r.test(x));
    if (claim) removed++;
    return !claim;
  });
  return { text: kept.join('').trim(), removed };
}

/**
 * Keep only improvements whose `original` is the learner's own words; flag goals whose
 * evidence cannot be traced to a learner line. Never invents or upgrades anything.
 */
export function verifyFeedback(raw: Partial<FeedbackResult>, messages: FeedbackMessage[]): FeedbackResult {
  const learner = messages.filter((m) => m.role === 'user' && m.text?.trim()).map((m) => m.text);
  let pronunciation = 0;
  const clean = (v: unknown, max: number) => { const r = stripPronunciationClaims(str(v, max)); pronunciation += r.removed; return r.text; };
  const improvements = (Array.isArray(raw.improvements) ? raw.improvements : []).slice(0, 6).map((c) => {
    const reason = str(c?.reason, 600);
    const r = stripPronunciationClaims(reason);
    pronunciation += r.removed;
    // A correction whose only reason was a pronunciation judgement is not a text-based correction.
    return { original: str(c?.original, 400), better: str(c?.better, 400), reason: r.text, pronunciationOnly: !!reason.trim() && !r.text };
  });
  const kept = improvements.filter((c) => c.better && !c.pronunciationOnly && isQuotedFrom(c.original, learner)).slice(0, 3).map(({ pronunciationOnly: _p, ...c }) => ({ ...c, verified: true }));
  const dropped = improvements.filter((c) => !c.pronunciationOnly && !kept.some((k) => k.original === c.original && k.better === c.better)).map((c) => c.original);
  const goals = (Array.isArray(raw.goals) ? raw.goals : []).slice(0, 6).map((g) => {
    const rawEvidence = str(g?.evidence, 400);
    let evidence = clean(rawEvidence, 400);
    // If the removed sentence also carried the quoted learner words, keep the quotes themselves.
    if (!quotedSegments(evidence).length && quotedSegments(rawEvidence).length) evidence = quotedSegments(rawEvidence).map((q) => `「${q}」`).join('');
    const quotes = quotedSegments(evidence);
    const evidenceVerified = quotes.length > 0 ? quotes.every((q) => isQuotedFrom(q, learner)) : false;
    return { label: str(g?.label, 120), achieved: g?.achieved === true, evidence, evidenceVerified };
  });
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    heading: clean(raw.heading, 200),
    summary: clean(raw.summary, 1200),
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).filter((s) => typeof s === 'string').slice(0, 5).map((s) => clean(s, 400)).filter(Boolean),
    improvements: kept,
    goals,
    nextPhrase: str(raw.nextPhrase, 300),
    quality: { droppedUnquotedImprovements: dropped.length, removedPronunciationClaims: pronunciation, droppedPronunciationOnlyImprovements: improvements.filter((c) => c.pronunciationOnly).length, learnerLines: learner.length, voiceLines: messages.filter((m) => m.role === 'user' && m.source === 'voice').length, editedLines: messages.filter((m) => m.role === 'user' && m.edited).length },
  };
}

/** A chat-turn correction is only kept if it corrects what the learner actually just said. */
export function verifyCorrection(c: unknown, lastLearnerLine: string): Correction | null {
  if (!c || typeof c !== 'object') return null;
  const x = c as Partial<Correction>;
  const original = str(x.original, 400), better = str(x.better, 400), rawReason = str(x.reason, 600);
  const reason = stripPronunciationClaims(rawReason).text;
  if (!better || !isQuotedFrom(original, [lastLearnerLine])) return null;
  if (rawReason.trim() && !reason) return null; // the correction was only about pronunciation
  return { original, better, reason };
}
