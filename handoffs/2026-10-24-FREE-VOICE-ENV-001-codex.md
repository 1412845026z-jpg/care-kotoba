# FREE-VOICE-ENV-001 — independent fixed-source review and free phone plan

Codex, 2026-10-24 JST. Branch `codex/FREE-VOICE-ENV-001`, baseline main `11148e7c0a9ab291a990b09832e1c2103742255f`.

- Read PROJECT_STATE.md on #40 including the 12:54 decision, Claude's FREE-VOICE-001 handoff and docs/09's free F1–F10 section.
- Immutable source: PR #40 `c663f5603685a858cd5c1cc007ed500078c1531f`. Review frozen install, real TypeScript/build, static/unit, complete offline and real-dev mock suites and SEC-001 headers. Recognition remains the test's fake recogniser; the synthesis spy invokes the native browser API but does not establish audible Japanese speech or phone accuracy.
- An additional real-dev probe runs without even a dummy API key, checks /api/health configured=false and the free demo/recognition/speech fallback, with no upstream AI request. Temporary source/env must be restored. Merge #40 using a merge commit and an expected-head lease only after passing.
- docs/10 will describe Windows/macOS Android USB forwarding (A) and a no-key Workers Free/Access Free staging plan (C), documentation only. Existing CK_ACCESS_CODE protects AI routes, not the full HTML app; private staging requires full-site Access or a separately designed full-site gate.
- No dependencies or lockfile changes, no paid API, no deployment. Live T1–T14, live core-roleplay-check with --yes, MODEL-001 and paid hosting are blocked. Existing --yes test cases remain confined to offline harness/mock, never a real server.
- `leak_markers_ja` proposal is deferred; no schema or content change.

## Result

In progress. Runner evidence, counts, skips and merge SHA will be recorded after execution. The two phone setup methods are plans, not completed physical-device or cloud acceptance.
