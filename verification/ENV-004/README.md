# ENV-004: reproducible mock review

Source: PR #30, `621dec775d2b7d5ffbb20aa87c28c6640d41002b`.

- Local Node 24.19.0: frozen install, real TypeScript, production build, static zero errors, unit 71/71 passed. Local runtime differs from the standard runner's Node 22.
- Official Chromium v1243 download returned a truncated archive in this workspace. Local browser validation is not yet claimed.
- GitHub workflow `Pinned Claude mock verification` now accepts `workflow_dispatch` input `sha` (full 40-character commit SHA). On `codex/ENV-004` pushes it checks out `refs/pull/30/head` and records the resolved SHA/tree as `source.txt`; verify that SHA matches the intended reviewed commit before merging.
- The offline suite uses the harness. The real-dev suite starts actual Vinext/Cloudflare Workers with fake credentials and a loopback-only mock upstream, explicitly enabling the optional ASR and AI furigana switches only in temporary test configuration.
- Both browser suites must pass; real-dev skips that require harness reconfiguration are reported explicitly. These tests do not demonstrate real API behavior, real phone audio, or deployment readiness.

Local equivalents (from the repository root after frozen installation and Chromium installation in `prototype/`):

```sh
python3 scripts/ci/verify_claude.py --source /path/to/exact-checkout --mode offline --report-dir /tmp/env004-offline
python3 scripts/ci/verify_claude.py --source /path/to/exact-checkout --mode real-dev --report-dir /tmp/env004-real-dev
```

The temporary Worker guard and fake environment file are restored/removed in `finally`. Test reports include the source SHA/tree and network guard result. No new dependencies or paid API calls.

## Saved result

The initial standard-runner run completed with failure: offline 40/40 and unit 71/71 passed; real-dev was 34 pass, 2 fail, 4 skip. See `runner-initial/real-dev/tests.tap.txt` for exact pointer-interception traces and `runner-initial/source.txt` for source identity. Both failures are synthetic-crash tests blocked by the development error overlay. No business PR in the ordered chain was merged. Full interpretation and next action are in the ENV-004 handoff. Local ICE-related voice failures are saved separately under `local-offline`, `local-real-dev` and `local-ice-probe.json`.
