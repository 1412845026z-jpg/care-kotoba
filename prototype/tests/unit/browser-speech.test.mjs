// FREE-VOICE-001: free dictation through the browser's speech recognition (pure parts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestOf, isUnsure, markSent, dictationErrorText, DICTATION_UNSURE, dictationSupported, japaneseVoices, startDictation } from '@/lib/browser-speech';
import { verdict, overall } from '@/lib/voice-preflight';
import { sanitizePrefs, DEFAULT_PREFS } from '@/lib/storage';

const res = (items) => items.map(([transcript, confidence, isFinal]) => Object.assign([{ transcript, confidence }], { isFinal }));

test('best result: final parts are joined, interim kept apart, confidence is the lowest reported value', () => {
  const r = bestOf(res([['木村さんの、', 0.92, true], ['何の準備でしょうか。', 0.61, true], ['あの', 0.3, false]]));
  assert.equal(r.final.text, '木村さんの、何の準備でしょうか。');
  assert.equal(r.final.confidence, 0.61);
  assert.equal(r.interim, 'あの');
  // Safari often reports 0: unknown, not "very unsure".
  assert.equal(bestOf(res([['はい、分かりました。', 0, true]])).final.confidence, null);
  assert.deepEqual(bestOf([]).final, { text: '', confidence: null });
});

test('uncertainty: only a reported low confidence marks the line', () => {
  assert.equal(isUnsure(null), false);
  assert.equal(isUnsure(DICTATION_UNSURE - 0.01), true);
  assert.equal(isUnsure(DICTATION_UNSURE), false);
});

test('a sent line is recorded as voice (and unsure / corrected) only when it came from dictation', () => {
  assert.deepEqual(markSent('今は入りたくないのですね。', null), { source: 'text' });
  assert.deepEqual(markSent('今は入りたくないのですね。', { text: '今は入りたくないのですね。', confidence: 0.9 }), { source: 'voice' });
  assert.deepEqual(markSent('今は入りたくないのですね。', { text: '今は入りたくないのですね。', confidence: 0.3 }), { source: 'voice', asrUncertain: true });
  assert.deepEqual(markSent('今は入りたくないのですね', { text: '今は 入りたくないのですね', confidence: 0.3 }), { source: 'voice', asrUncertain: true }, 'spacing differences are not an edit');
  assert.deepEqual(markSent('今は入りたくないのですね。', { text: '今は入りたいのですね。', confidence: 0.3 }), { source: 'voice', edited: true }, 'a corrected line is trusted as the learner wrote it');
  assert.deepEqual(markSent('はい。', { text: '', confidence: null }), { source: 'text' });
});

test('error messages exist in Japanese, Chinese and English for every code', () => {
  for (const c of ['not-allowed', 'service-not-allowed', 'no-speech', 'network', 'audio-capture', 'something-else']) {
    const m = dictationErrorText(c);
    assert.ok(m.ja && m.zh && m.en, c);
  }
});

test('outside a browser nothing is available (no crash)', () => {
  assert.equal(dictationSupported(), false);
  assert.deepEqual(japaneseVoices(), []);
});

test('voice check: missing free extras are information, not warnings; available ones count as ok', () => {
  const none = verdict({ speech: { dictation: false, jaVoices: 0 } }, 'zh');
  assert.deepEqual(none.map((i) => [i.id, i.status]), [['dictation', 'info'], ['voice', 'info']]);
  assert.ok(none.every((i) => i.help));
  const full = verdict({ support: { secureContext: true, getUserMedia: true, rtc: true, audioContext: true }, speech: { dictation: false, jaVoices: 0 } });
  assert.equal(overall(full), 'ok', 'a device without browser dictation is still ready for voice practice');
  assert.equal(overall(none), 'skipped');
  assert.deepEqual(verdict({ speech: { dictation: true, jaVoices: 2 } }).map((i) => i.status), ['ok', 'ok']);
});

test('dictation consent is off by default and only true when stored as true', () => {
  assert.equal(DEFAULT_PREFS.dictationConsent, false);
  assert.equal(sanitizePrefs({ dictationConsent: true }).dictationConsent, true);
  assert.equal(sanitizePrefs({ dictationConsent: 'yes' }).dictationConsent, false);
});

test('startDictation: Japanese, interim while speaking, the final line once on the final event, never again at the end', () => {
  const made = [];
  globalThis.webkitSpeechRecognition = class { constructor() { made.push(this); } start() {} stop() {} abort() {} };
  try {
    const seen = [];
    const h = startDictation({ onInterim: (t) => seen.push(['interim', t]), onFinal: (r) => seen.push(['final', r.text, r.confidence]), onEnd: () => seen.push(['end']) });
    assert.ok(h);
    const rec = made[0];
    assert.equal(rec.lang, 'ja-JP');
    rec.onresult({ resultIndex: 0, results: res([['今日は', 0, false]]) });
    rec.onresult({ resultIndex: 0, results: res([['今日は入りたくないのですね。', 0.4, true]]) });
    rec.onend();
    assert.deepEqual(seen, [['interim', '今日は'], ['final', '今日は入りたくないのですね。', 0.4], ['end']]);
  } finally { delete globalThis.webkitSpeechRecognition; }
});
