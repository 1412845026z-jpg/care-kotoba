# CONTENT-004 — content review revisions (in progress)

- Owner Codex, branch `codex/CONTENT-004`, started from verified main `8b55117`; fast-forwarded to current main `f49f95a` before publishing; the ordered business merges remain paused by ENV-004.
- All existing scenario/evaluation/terminology fields and their shapes remain unchanged. The existing `learner_transcript[]` represents multiple learner turns; no NPC turn object or new field is introduced. Expected feedback distinguishes the earlier mistake from the latest repair and cites both actual learner turns.
- Schema constraints change only to admit incremented semantic versions, additional E5–E7 IDs, and katakana in `reading_ja`. Pure katakana keeps its original spelling; mixed 口腔ケア preserves ケア and the review page annotates only 口腔. No structure migration.
- Revised scenarios and scenario-linked samples move to 0.2.0. Revised terminology cards and the four left-knee paired samples increment to 0.1.1; untouched cards/paired samples retain their prior version.
- Validated coverage: 12 scenarios; 34 cards; 84 transcript samples (original 48 + 12 subtle errors + 12 two-turn repairs + 12 plain-but-correct variants), plus 12 paired feedback samples.
- All material remains fictional draft pending separate care-worker and Japanese-educator review. Neither AI review nor schema validation constitutes professional approval.
- C02's ellipsis is a text-only ambiguity marker, not evidence of generated noisy/fast speech. B3 uses short sentences and paragraph breaks; actual speech-rate/turn pacing is an application integration responsibility and has not been validated by editing data alone.
- After Claude's `tools/core-scenarios/generate.mjs` is available and merged, run it and its `--check`, then regenerate/check the offline review page. Generator unavailable at task start; do not invent an alternative module contract.
- No new dependency, paid API call or deployment.

## Validation and remaining generator gate

- `python3 evals/validate.py`: 12 scenarios / 84 samples, zero errors.
- `python3 content/terminology/validate.py`: 34 cards, zero errors; all examples contain their headword.
- `python3 evals/source-confidence/validate.py`: 12 paired samples, zero errors. CK-I001/I002/I009/I010 now consistently use left knee.
- `python3 content/review/build.py` and `--check`: 12 / 34 / 96, source digest updated. Three existing evidence/ASR guard tests passed.
- Real Chromium review-page check: 96 displayed samples, zero page errors, pure katakana receives no ruby. The mixed 口腔ケア card keeps ケア outside the kanji ruby.
- `tools/core-scenarios/generate.mjs` is absent from current main and PR #30; checked again after syncing. **Generation and --check have not run.** Once Claude provides/merges the generator, rerun both on this content commit; do not mark application preview integration complete now.
- Schema IDs/shapes remain compatible; only version/ID/kana value constraints broaden. The existing array models two learner turns, not a fabricated intervening NPC utterance.
- No paid API calls; all sample feedback is authored data, not model output.
