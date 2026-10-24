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

In progress. Exact runner, counts, explained skips and merge SHAs will be appended after execution; Claude's CI results are background evidence, not Codex's independent retest.
