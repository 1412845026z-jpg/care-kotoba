import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FURIGANA } from '@/lib/furigana-data';
import { parseRuby, plainOf, furiganaFor } from '@/lib/furigana';
import { scenes, variants, categories, demoReplies } from '@/lib/content';

const KANJI = /[㐀-䶿一-鿿豈-﫿々〆]/;
const fixed = [...new Set([
  ...categories.map((c) => c.name),
  ...variants.flatMap((v) => [v.label, v.sub]),
  ...scenes.flatMap((s) => [s.title, s.context, s.starter, ...s.phrases, ...s.goals]),
  ...Object.values(demoReplies).flat(),
])];

test('every fixed text with kanji has a furigana entry (regenerate with tools/furigana when content changes)', () => {
  const missing = fixed.filter((t) => KANJI.test(t) && !FURIGANA[t]);
  assert.deepEqual(missing, []);
});

test('each annotation reproduces its text exactly and uses hiragana readings on kanji bases', () => {
  for (const [text, notation] of Object.entries(FURIGANA)) {
    assert.equal(plainOf(notation), text);
    for (const seg of parseRuby(notation)) {
      if (typeof seg === 'string') continue;
      assert.match(seg.rt, /^[ぁ-ゖー]+$/, `${text}: reading "${seg.rt}"`);
      assert.ok(KANJI.test(seg.base), `${text}: base "${seg.base}" has no kanji`);
    }
  }
});

test('reviewed corrections are in place (care-field readings, 方=かた, 後=あと)', () => {
  assert.equal(FURIGANA['口腔ケア前の説明'], '{口腔|こうくう}ケア{前|まえ}の{説明|せつめい}');
  assert.ok(FURIGANA['聞こえにくい方への声かけ'].includes('{方|かた}'));
  assert.ok(FURIGANA['記録した後に、先輩へ報告します。'].includes('{後|あと}'));
  assert.ok(FURIGANA['清拭のお手伝いを申し出る'].startsWith('{清拭|せいしき}'));
  assert.ok(!Object.values(FURIGANA).some((n) => n.includes('{清|きよし}')));
});

test('parser splits notation into text and ruby segments; unknown text has no furigana', () => {
  assert.deepEqual(parseRuby('お{顔|かお}を{拭|ふ}く'), ['お', { base: '顔', rt: 'かお' }, 'を', { base: '拭', rt: 'ふ' }, 'く']);
  assert.equal(furiganaFor('AIが自由に作った文'), null);
  assert.ok(furiganaFor('そのタオルで何をするの？'));
});
