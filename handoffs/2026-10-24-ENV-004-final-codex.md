# ENV-004 / CI-002 / CONTENT-004 / SEC-001 — final integration handoff

Codex, 2026-10-24 JST. No new dependency or lockfile change, no paid AI API, no deployment.

## Current outcome

| Work | Result | Evidence |
| --- | --- | --- |
| Latest PR #30 review | c3632f5850b32dda59a6622db76ac742f62235ee: install/TypeScript/build/static passed; unit71/71, offline e2e40/40; real Vinext dev36 pass,0 fail,4 explained skips | run40050738078; verification/ENV-004/runner-latest/ |
| Ordered business integration | #17→#18→#19→#20→#21→#22→#24→#25→#26→#27→#28→#29→#30 all merged in that order with merge commits and expected-head leases; no merge conflict/failure | verification/ENV-004/merges.json; business main4381de1 tree matched rehearsal |
| Independent #23 | merged f49f95a | original CI passed; read-only terminology QA |
| CI-002 | PR #32 merged c917a68; routine CI installs Chromium then runs all tests with600-second group timeout and loopback-only Node fetch | integrated run40051381695: static0/unit71/e2e40 |
| Security headers | PR #33 merged86ebc70; nonce CSP and response headers retained API/SDP/cookies, ruby, microphone and mock WebRTC | combined run40051512332: static0/unit71/offline40/real-dev36 pass4 skip; all7 browser security checks; verification/SEC-001/runner-integrated/ |
| CONTENT-004 | PR #34 merged4a851fd; 12 scenarios,34 cards,84 transcript cases plus12 paired feedback cases; fields/shapes retained, revised entry versions incremented | validators/review-page checks; verification/CONTENT-004/ |
| Provided core generator | exact generator from Claude CORE-PREVIEW-001@78e25dd ran successfully, including --check, against committed post-merge content | verification/CONTENT-004/post-merge-generator.json; fingerprint396444ed86eeacf7 |

Current main before this evidence/state integration is4a851fd4319e8abc97c20910c01bd080be83e408. The source request now explicitly names that main SHA for an additional fixed-main review. The workflow accepts a manual full SHA or a checked review-request file; it contains no obsolete hardcoded business heads. This evidence PR adds no application behavior beyond what already entered main.

## Earlier failure and local environment

The first621dec7 run had2 real-dev failures: Vinext's development overlay covered recovery controls during deliberately triggered crashes. Codex stopped the ordered chain at that point. Claude supplied c3632f5, scoped the test overlay treatment to the2 intentional-crash pages, retained the app recovery assertions and unexpected-error collection, and the independent complete retest passed. Initial failed evidence remains under runner-initial/; it is not a current unresolved failure.

Local managed-network Chromium gathered0 ICE candidates. Its11 voice failures are saved separately and are not11 confirmed business defects. Standard-runner simulated WebRTC voice cases passed. The4 real-dev skips require harness-only Host/environment reconfiguration (localhost access plus3 smoke-tool cases); the optional ASR/furigana real-server flags were enabled so those checks actually ran.

## CONTENT-004 details

- CK-T016 and CK-I001/I002/I009/I010 consistently use the left knee, matching CK-P01.
- C B2 stays in the NPC role; B3 uses short separate sentences. R B2/B3 are scenario-specific; R01 no longer guesses the hidden rest/sleep reason.
- Added subtle errors,12 two-learner-turn repair samples and12 simple-correct variants. Feedback distinguishes earlier gaps from the latest repair and cites the correct actual learner turn.
- Every terminology example contains its headword. Pure katakana is not annotated; mixed 口腔ケア keeps ケア outside the kanji ruby. Japanese 学員 and P01's 原話 title were corrected.
- All remain fictional drafts pending care-professional and Japanese-educator review. Text segmentation does not prove that real generated speech slows down.

## Claude's next executable action

1. Fetch latest main; read AGENTS.md, PROJECT_STATE.md and this final handoff. Earlier stop snapshots are historical; do not restore them over current task states.
2. CORE-PREVIEW-001 has **not** been merged by Codex. Synchronize that branch with current main, preserve the CI/Worker/content changes, and regenerate its public/server scenario modules from the merged0.2.x content. The generator compatibility and post-merge checks passed in an isolated tree; no runtime modules were manually copied into main to bypass your preview work.
3. Regenerate furigana and run its --check for the revised titles/known information/examples. Keep the public/server split so hidden facts and feedback rules stay out of the client bundle. Push a new immutable head and handoff for independent review of the full preview branch.
4. Actual AI/phone behavior, audio pacing, model migration, clinical/language approval, tenant/billing controls and production hosting remain unverified. Keep paid API and deployment disabled until separately authorized.
