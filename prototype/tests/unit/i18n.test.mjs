// I18N-001: support languages. Japanese stays the base; ja/en/zh/vi/my/id can be chosen; a gap in vi/my/id falls
// back to English (marked lang="en"); Chinese is never shown under another language's label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, LOCALE_INFO, pick, UI, SAY, TOAST_GLOSS, languageName, isLocale, langTag } from '@/lib/i18n';
import { sanitizePrefs, DEFAULT_PREFS } from '@/lib/storage';
import { verdict } from '@/lib/voice-preflight';

const HAN = /[一-鿿]/, MY = /[က-႟]/, LATIN = /[A-Za-z]/;

test('six support languages, Japanese only by default; values stored by older versions stay valid', () => {
  assert.deepEqual([...LOCALES], ['ja', 'en', 'zh', 'vi', 'my', 'id']);
  assert.equal(DEFAULT_PREFS.locale, 'ja');
  for (const l of ['zh', 'en', 'ja', 'vi', 'my', 'id']) assert.equal(sanitizePrefs({ ...DEFAULT_PREFS, locale: l }).locale, l, l);
  for (const bad of ['fr', 'zh-CN', '', null, 3]) assert.equal(sanitizePrefs({ locale: bad }).locale, 'ja', String(bad));
  assert.ok(isLocale('my') && !isLocale('ko'));
  assert.equal(langTag('zh'), 'zh-Hans');
  assert.equal(langTag('xx'), 'ja');
  // Vietnamese, Burmese and Indonesian are marked as drafts until native speakers review them.
  assert.deepEqual(LOCALES.filter((l) => LOCALE_INFO[l].draft), ['vi', 'my', 'id']);
  assert.match(LOCALE_INFO.my.draft, MY);
});

test('pick: own language first; vi/my/id fall back to English marked en; never to Chinese; Japanese only shows ja text', () => {
  const t = { ja: 'やさしい日本語', en: 'English', zh: '中文' };
  assert.deepEqual(pick('zh', t), { text: '中文', lang: 'zh-Hans' });
  assert.deepEqual(pick('en', t), { text: 'English', lang: 'en' });
  assert.deepEqual(pick('ja', t), { text: 'やさしい日本語', lang: 'ja' });
  for (const l of ['vi', 'my', 'id']) assert.deepEqual(pick(l, t), { text: 'English', lang: 'en' }, l);
  assert.deepEqual(pick('vi', { ...t, vi: 'Tiếng Việt' }), { text: 'Tiếng Việt', lang: 'vi' });
  // Only Chinese available: nothing is shown in vi/my/id/en/ja (no silent relabelling).
  for (const l of ['vi', 'my', 'id', 'en', 'ja']) assert.equal(pick(l, { zh: '只有中文' }), null, l);
  assert.equal(pick('ja', { en: 'x', zh: 'y' }), null);
});

test('every interface gloss has en, zh, vi and id; each text is written in its own script', () => {
  const check = (where, entry, needZh = true) => {
    assert.ok(entry.en && (entry.zh || !needZh), `${where}: en and zh`);
    for (const [l, v] of Object.entries(entry)) {
      if (l === 'zh') assert.match(v, HAN, `${where}.zh`);
      if (l === 'my') assert.match(v, MY, `${where}.my is Burmese script`);
      if (l === 'en' || l === 'vi' || l === 'id') { assert.match(v, LATIN, `${where}.${l}`); assert.doesNotMatch(v.replace(/書き出す/g, ''), HAN, `${where}.${l} has no Chinese/kanji`); }
    }
  };
  for (const [k, e] of Object.entries(UI)) { check(`UI.${k}`, e); assert.ok(e.vi && e.id, `UI.${k}: vi and id drafts`); }
  // basicNoSupport and uiDraft are never shown in Chinese (the course has Chinese; Chinese UI is not a draft).
  for (const [k, e] of Object.entries(SAY)) check(`SAY.${k}`, e, !['basicNoSupport', 'uiDraft'].includes(k));
  for (const [ja, k] of Object.entries(TOAST_GLOSS)) { assert.ok(UI[k], `toast gloss ${k}`); assert.match(ja, /[ぁ-ん]/); }
});

test('AI explanations are requested in the chosen language; unknown values mean easy Japanese', () => {
  assert.equal(languageName('zh'), '简体中文');
  assert.equal(languageName('vi'), 'Tiếng Việt');
  assert.match(languageName('my'), /Burmese/);
  assert.equal(languageName('id'), 'Bahasa Indonesia');
  assert.equal(languageName('ja'), 'やさしい日本語');
  assert.equal(languageName('fr'), 'やさしい日本語');
});

test('voice test help: Chinese for zh, English for en/vi/my/id, none for Japanese only', () => {
  const r = { support: { secureContext: true, getUserMedia: true, rtc: true, audioContext: true } };
  const help = (l) => verdict(r, l).find((i) => i.key === 'support.ok')?.help;
  assert.match(help('zh'), HAN);
  for (const l of ['en', 'vi', 'my', 'id']) assert.equal(help(l), 'This browser supports voice practice.', l);
  assert.equal(help('ja'), undefined);
});
