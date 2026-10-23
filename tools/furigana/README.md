# Furigana for fixed texts

`prototype/lib/furigana-data.ts` holds furigana for the app's **fixed** Japanese text: categories, variant labels,
scene titles, contexts, opening lines, reference phrases, goals and demo replies (318 texts as of 2026-10-23).
The app shows them as `<ruby>` when the learner's 「ふりがな」 preference is on (default on). AI-generated replies are not
annotated unless they exactly match a fixed text, or the server runs with `CK_AI_FURIGANA=1` (off by default): then
text-practice replies carry a model-written notation that the server accepts only if it reproduces the reply exactly and
puts hiragana readings on kanji (`validRuby` in `prototype/lib/furigana.ts`). Those readings are not reviewed.

## How it is made

1. `generate.mjs` collects the texts from `prototype/lib/content.ts` (single source) and tokenises them with
   **kuromoji.js 0.1.2** (Apache-2.0) and its bundled **mecab-ipadic-2.7.0-20070801** dictionary.
2. Each token's reading is aligned to its kanji (okurigana stay plain): `{温|あたた}かい`.
3. `overrides.json` replaces whole texts with hand-reviewed annotations (key = plain text). 18 corrections on
   2026-10-23, e.g. 口腔 → こうくう (care usage), 方 → かた (person), 後 → あと, 清拭 → せいしき, 一人/二人 → ひとり/ふたり,
   20分/30分 → じゅっぷん.
4. The unit test `prototype/tests/unit/furigana.test.mjs` fails when a fixed text has no entry, when an annotation does
   not reproduce its text, or when a reading is not hiragana. So after editing `content.ts`, regenerate.

kuromoji is a build-time tool only; nothing of it is shipped except the generated readings. Notices:
`docs/licenses/KUROMOJI_JS_LICENSE-2.0.txt`, `docs/licenses/MECAB_IPADIC_NOTICE.txt` (the IPADIC notice must accompany
copies of the dictionary data; keep it with the app's third-party notices when the app is released).

## Regenerate

kuromoji is not a project dependency (it is unmaintained since 2018 and only needed here). Use a checkout:

```sh
git clone --depth 1 https://github.com/takuyaa/kuromoji.js /tmp/kuromoji.js     # dict/ is included
git clone --depth 1 https://github.com/takuyaa/doublearray /tmp/doublearray
mkdir -p /tmp/kuro-nm && ln -s /tmp/kuromoji.js /tmp/kuro-nm/kuromoji && ln -s /tmp/doublearray /tmp/kuro-nm/doublearray
# kuromoji also needs `async` (any 1.x-3.x); point NODE_PATH at a node_modules that has it
NODE_PATH=/tmp/kuro-nm:<node_modules with async> node tools/furigana/generate.mjs --kuromoji /tmp/kuromoji.js
node tools/furigana/generate.mjs --kuromoji /tmp/kuromoji.js --check   # verify the committed file is current
```

Then read the diff of `prototype/lib/furigana-data.ts` and add corrections to `overrides.json`.

## Review status

Machine readings + review by Claude (2026-10-23). **A native-speaker Japanese teacher should review before release**,
especially readings that depend on context (方, 後, 何, 行き先) and counters/numbers.
