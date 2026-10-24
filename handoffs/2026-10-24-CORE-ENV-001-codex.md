# CORE-ENV-001 — fixed-source preview/evaluation review

Codex, 2026-10-24 JST. Branch `codex/CORE-ENV-001`, baseline main `c7a810acceb96bf08b2c42668258c47cbd9b689e`.

## Authorized work and merge gate

- Read the last section of Claude's CORE-PREVIEW-001 handoff, the CORE-EVAL-001 handoff on PR #37, and PR #35 comment 6379212206.
- Review PR #35 at exactly `a4d7831b437eeae7a6f3073742bdf820d0b38d37`: frozen install, TypeScript/build, static/unit, complete offline and real Vinext dev suites, SEC-001 policy/headers and core list/dialog/practice under enforced CSP.
- Only after that gate passes, merge #35 with a merge commit and expected-head lease. Then capture the latest #37 head, retest with mock AI only, and merge #37 with the same safeguards. Stop on a failed gate or conflict.
- No new dependencies or lockfile changes, no paid API, no deployment. Real-dev uses the local mock and loopback-only Worker guard. `core-roleplay-check --yes` must never target a real server; any active tool checks are confined to the offline harness/mock suite.
- The existing pinned-source workflow now accepts this task's explicit request file and includes the SEC-001 probe. The probe adds three core-preview CSP checks when the reviewed source contains the optional core feature.

## Future content edits (user instruction)

After editing `content/scenarios`, run `node tools/core-scenarios/generate.mjs`, regenerate furigana, and read the resulting annotations, especially 夜中 (よなか), 一回 (いっかい), 二人 (ふたり), 後 (あと, subject to context). Use the generators' `--check` modes as well. When hidden information changes, run `node tools/smoke/core-roleplay-check.mjs --base <any-address>` without `--yes`: this validates markers locally and lists stale markers without contacting that address.

## Optional schema proposal — awaiting user confirmation, not implemented

Add `leak_markers_ja` to each `hidden_information` entry and have the roleplay checker read those markers instead of its hardcoded map. This changes the content schema; first agree the array shape, validation and fallback/migration with the user and Claude. No such field is added by this task. Existing fields and content files remain unchanged.

## Verification and outcome

PR #35 passed independent run [40058494059](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/40058494059), Node22.23.3 / pnpm11.25.0, exact source `a4d7831b437eeae7a6f3073742bdf820d0b38d37`, tree `7dbe5c000f009a1814ef0c30947754273628ad58`:

- Frozen install, real TypeScript and production build passed (no deployment); static0, unit81/81, offline47/47.
- Real Vinext dev42 passed /0 failed /5 explained skips: Host/environment reconfiguration, harness bundle inspection and the three harness-only api-smoke cases. All these cases passed offline.
- SEC-001 policy preservation and all10 browser checks passed. Core mobile list/dialog/ruby, mock text practice/feedback and desktop UI had no normal-flow CSP violations; deliberate nonce-less injection was blocked and the valid nonce/microphone checks passed.
- Worker guard0 external attempts; temporary Worker edits restored byte-for-byte and dummy environment removed. Raw reports: `verification/CORE-ENV-001/runner-preview/`. Downloaded artifact SHA256 `866abeadc135329770ac68ca073b9d0b7203c90447cf1534ab483a3b878adb5f` verified before extraction.
- Core generator check fingerprint `396444ed86eeacf7`; existing 夜中/一回/二人 readings and contextual 後 readings reviewed (preview-readings.json). No content or generated file was modified.
- PR #35 merged with expected-head lease as `b038f60dceccf142232a8dfce890f23f196337e5`; its tree equals the independently tested source tree. No conflict.

PR #37 latest head captured after #35 merge: `2cf1a0e55741f260aed619e512c594b71153a97e`. Read-only merge rehearsal with main is conflict-free, tree `930af37293d8afc8b128d7321762cc07da95a422`. Retest in progress; do not merge until it passes. Active roleplay tool checks are offline harness+mock only; real-dev skips the harness-only tool cases. No real model calls.
