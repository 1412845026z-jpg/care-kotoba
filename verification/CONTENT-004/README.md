# CONTENT-004 review disposition

All changes are fictional drafts and remain pending two separate professional reviews.

| Review item | Change |
| --- | --- |
| Same resident, inconsistent side | CK-T016 and CK-I001/I002/I009/I010 now use left knee, matching CK-P01. |
| C group NPC voice | B2 stays in the senior-staff role; coaching remains in `coach_rule_zh`. B3 repeats actual content in short separate sentences. |
| Refusal scenes | CK-R01's neutral example no longer guesses the hidden sleep/rest reason. Every R B2/B3 is scenario-specific, with no coach-like resident speech. Nonpressuring follow-up remains acceptable without requiring an explanation. |
| Realistic errors | Added one subtle error per scene (E5), with precise evidence and one next step. |
| Repair over turns | E6 uses existing learner-transcript arrays for L1 then L2. Expected feedback cites each turn correctly and credits the repair while identifying the initial gap. |
| Simple correct Japanese | E7 accepts clear simpler wording. It is not rejected for lacking elaborate honorifics. |
| Terminology | Every card's example contains its headword. Pure katakana is unannotated; ケア retains katakana in mixed 口腔ケア. Revised cards increment to 0.1.1. |
| Compatibility | All scenario field names and nested object shapes remain unchanged; revised scenarios and references use 0.2.0. |

Evidence JSON files are data checks, not clinical, language-quality or model-quality validation. The review page has been regenerated. Core-scenario generation is pending because Claude's generator was not present on the synchronized refs; no substitute runtime module was invented. Text paragraph breaks do not prove actual audio playback slows down.

Later sync: provider CORE-PREVIEW-001 @78e25dd became available. Its exact generator and `--check` both passed against these revised sources in an isolated tree; see core-generator-compatibility.json. Post-merge runtime/furigana generation remains gated, because the provider depends on the paused #30 chain. Japanese 学員 and the P01 title have also been corrected, with affected entries at0.2.1.
