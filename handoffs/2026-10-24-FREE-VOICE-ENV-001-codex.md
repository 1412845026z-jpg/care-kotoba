# FREE-VOICE-ENV-001 — independent fixed-source review and free phone plan

Codex, 2026-10-24 JST. Branch `codex/FREE-VOICE-ENV-001`, baseline main `11148e7c0a9ab291a990b09832e1c2103742255f`.

- Read PROJECT_STATE.md on #40 including the 12:54 decision, Claude's FREE-VOICE-001 handoff and docs/09's free F1–F10 section.
- Immutable source: PR #40 `c663f5603685a858cd5c1cc007ed500078c1531f`. Review frozen install, real TypeScript/build, static/unit, complete offline and real-dev mock suites and SEC-001 headers. Recognition remains the test's fake recogniser; the synthesis spy invokes the native browser API but does not establish audible Japanese speech or phone accuracy.
- An additional real-dev probe runs without even a dummy API key, checks /api/health configured=false and the free demo/recognition/speech fallback, with no upstream AI request. Temporary source/env must be restored. Merge #40 using a merge commit and an expected-head lease only after passing.
- docs/10 will describe Windows/macOS Android USB forwarding (A) and a no-key Workers Free/Access Free staging plan (C), documentation only. Existing CK_ACCESS_CODE protects AI routes, not the full HTML app; private staging requires full-site Access or a separately designed full-site gate.
- No dependencies or lockfile changes, no paid API, no deployment. Live T1–T14, live core-roleplay-check with --yes, MODEL-001 and paid hosting are blocked. Existing --yes test cases remain confined to offline harness/mock, never a real server.
- `leak_markers_ja` proposal is deferred; no schema or content change.

## Result

Independent [run40063459564](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/40063459564) passed on Node22.23.3 / pnpm11.25.0, exact source `c663f5603685a858cd5c1cc007ed500078c1531f`, source tree `f8a768ee23ae7b9e297232a3623b831b5850cfd4`.

- Frozen install, real TypeScript, production build, core generator and security policy checks passed; static0, unit89/89, offline54/54.
- Real Vinext dev46 passed /0 failed /8 explained skips: Host/env reconfiguration, harness bundle inspection and six harness-only smoke-tool cases. All passed offline. The four new dictation tests ran on real dev with the same fake recogniser as offline.
- All14 SEC-001/CSP/browser checks passed. Consent, fake Japanese dictation, editing and demo submission had no CSP violations. Same-origin microphone is permitted. No header relaxation or production security change was needed.
- Additional no-key real-dev probe: health configured=false, no dummy or real OPENAI_API_KEY, free demo/recognition/native speechSynthesis API reached; upstream AI calls0 and Worker external attempts0. This run did issue /api/speech locally, which returned unavailable and triggered device fallback; it did not call the AI provider.
- The headless runner's native synthesiser emitted `synthesis-failed` after the API invocation. No CSP violation or policy denial was observed. Audible Japanese speech and real recognition accuracy remain **unverified F5/F6**, not counted as physical-device passes.
- Both real-dev runs restored Worker bytes and removed temporary fake env; offline and real-dev use local mock only. Live --yes was not run.
- Artifact12548571663 SHA256 `6a5ed8b77660700098784b8745608b4b025c5a39b208266b2bef4b7c660dd74a` verified before extraction. Raw reports are under verification/FREE-VOICE-ENV-001/runner/.
- PR #40 head remained c663f56 before merge; merged with merge commit and expected-head lease as `68f444ec92736e673047222dce48b950a2dd6c48`. Merge tree equals reviewed source. No conflict or failed gate.

## Free phone plan and current boundaries

- docs/10 now has independent Windows/PowerShell and macOS/Terminal steps: fresh checkout, no key in process or files, health configured=false, local127.0.0.1:5173, Android USB debugging, Chrome Port forwarding5173→localhost:5173, phone http://localhost:5173, cleanup and F1–F10 evidence. Actual Windows/Mac-to-phone connection remains for the user to perform.
- C is a plan only: new Free-account Worker, Free Access allowlist, All traffic protection, URL initially disabled, no API key/proxy/mock values, independent code/signing secrets, authenticated health configured=false. Free100k/day and10ms CPU limits were rechecked; actual cloud fit is unverified, no automatic Paid upgrade. Existing app code alone is not a whole-site gate. Worker-level Access currently blocks WebSocket upgrades; only production free-demo paths are in this plan.
- Removed the obsolete active plan to configure an AI key and execute paid testing. No deployment or provider-key command was added to CI. T1–T14, live roleplay --yes and MODEL-001 remain blocked; F1–F10 is queued for physical-device results, C also waits for deployment authorization.
- `leak_markers_ja` is deferred by the latest user instruction; it supersedes the earlier proposal. No content schema change.
- Documentation/tooling/evidence integration preserves the reviewed application/content/dependency trees. This does not verify actual phone/browser-provider behaviour, Access setup, cloud Free performance or deployment.
