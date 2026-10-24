// Free voice input and output that the phone's browser already provides (no AI call, no cost to the app):
//  - dictation through the Web Speech API (SpeechRecognition / webkitSpeechRecognition), Japanese;
//  - Japanese text-to-speech voices (speechSynthesis), already used as the fallback in components/ui.tsx.
// The browser vendor may process the audio on its servers (Chrome: Google; Safari: Apple), so the app asks
// once per device before the first use (prefs.dictationConsent) and says so. Care Kotoba receives text only.
// Recognition can be wrong: a line with a low reported confidence is marked asrUncertain like a Realtime
// transcript, so the learner is asked to check it and feedback does not call it a language error.
// Pure parts (best result, uncertainty, marking) are unit-tested; the browser wrapper is covered by e2e
// with a fake SpeechRecognition.

/** Below this reported confidence a dictated line is marked uncertain. Browsers that report 0 (unknown) are not marked. */
export const DICTATION_UNSURE = 0.5;

export type DictationResult = { text: string; confidence: number | null };
type Alternative = { transcript?: string; confidence?: number };
type ResultList = ArrayLike<ArrayLike<Alternative> & { isFinal?: boolean }>;

/** Joins the best alternative of each result; confidence = lowest reported value (null when the browser reports none). */
export function bestOf(results: ResultList, from = 0): { final: DictationResult; interim: string } {
  let text = '', interim = '', min: number | null = null;
  for (let i = from; i < results.length; i++) {
    const r = results[i], alt = r?.[0];
    const t = (alt?.transcript || '').trim();
    if (!t) continue;
    if (r.isFinal) {
      text += t;
      const c = typeof alt?.confidence === 'number' && alt.confidence > 0 ? alt.confidence : null;
      if (c !== null) min = min === null ? c : Math.min(min, c);
    } else interim += t;
  }
  return { final: { text, confidence: min }, interim };
}

export const isUnsure = (confidence: number | null) => confidence !== null && confidence < DICTATION_UNSURE;

/** How a sent line is recorded: dictated text is a voice transcript; changed before sending = corrected by the learner. */
export function markSent(sent: string, dictated: DictationResult | null): { source: 'voice' | 'text'; edited?: true; asrUncertain?: true } {
  if (!dictated || !dictated.text.trim()) return { source: 'text' };
  const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, '').trim();
  if (norm(sent) !== norm(dictated.text)) return { source: 'voice', edited: true };
  return { source: 'voice', ...(isUnsure(dictated.confidence) ? { asrUncertain: true as const } : {}) };
}

type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ResultList }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const dictationSupported = () => typeof window !== 'undefined' && !!ctor();

/** Japanese voices the device can speak with (may be empty until the browser has loaded its voice list). */
export function japaneseVoices(): string[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('ja')).map((v) => v.name);
}

/** Waits briefly for the voice list (Chrome loads it asynchronously). */
export function loadJapaneseVoices(timeoutMs = 1500): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([]);
    const now = japaneseVoices();
    if (now.length || window.speechSynthesis.getVoices().length) return resolve(now);
    const done = () => { clearTimeout(t); window.speechSynthesis.removeEventListener?.('voiceschanged', done); resolve(japaneseVoices()); };
    const t = setTimeout(done, timeoutMs);
    window.speechSynthesis.addEventListener?.('voiceschanged', done);
  });
}

export type DictationHandle = { stop: () => void; abort: () => void };

/**
 * Starts one dictation (Japanese, stops after the learner pauses). onInterim shows text while speaking;
 * onFinal gets the whole recognised line once it is final; onError gets the browser's error code ('not-allowed',
 * 'no-speech', 'network', 'audio-capture', ...); onEnd always runs last.
 */
export function startDictation(h: { onInterim?: (t: string) => void; onFinal: (r: DictationResult) => void; onError?: (code: string) => void; onEnd?: () => void }): DictationHandle | null {
  const C = ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = 'ja-JP'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  // The final line is delivered when the recogniser marks it final (not at onend), so a learner who starts
  // correcting the text right away is never overwritten by a late end event.
  let delivered = '';
  rec.onresult = (e) => {
    const { final, interim } = bestOf(e.results, 0);
    if (interim) h.onInterim?.(final.text + interim);
    else if (final.text && final.text !== delivered) { delivered = final.text; h.onFinal(final); }
  };
  rec.onerror = (e) => h.onError?.(e?.error || 'error');
  rec.onend = () => h.onEnd?.();
  try { rec.start(); } catch { h.onError?.('start-failed'); h.onEnd?.(); return null; }
  return { stop: () => { try { rec.stop(); } catch {} }, abort: () => { try { rec.abort(); } catch {} } };
}

/** Learner-facing message for a dictation error (Japanese; support language added by the caller). */
export function dictationErrorText(code: string): { ja: string; zh: string; en: string } {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed': return { ja: 'マイクか音声入力が許可されていません。ブラウザの設定を確認してください。', zh: '麦克风或语音输入没有被允许，请检查浏览器设置。', en: 'Microphone or speech input is not allowed. Check the browser settings.' };
    case 'no-speech': return { ja: '声が聞こえませんでした。もう一度どうぞ。', zh: '没有听到声音，请再试一次。', en: 'No speech was heard. Please try again.' };
    case 'network': return { ja: '音声入力の通信ができませんでした。文字で入力できます。', zh: '语音输入连不上网络，可以改用文字输入。', en: 'Speech input could not connect. You can type instead.' };
    case 'audio-capture': return { ja: 'マイクが見つかりません。', zh: '找不到麦克风。', en: 'No microphone was found.' };
    default: return { ja: '音声入力を使えませんでした。文字で入力できます。', zh: '无法使用语音输入，可以改用文字输入。', en: 'Speech input did not work. You can type instead.' };
  }
}
