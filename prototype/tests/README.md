# Care Kotoba tests

Everything here runs without an API key, without network access to OpenAI and without cost.

```sh
cd prototype
node tests/run.mjs all  --report ../verification/G0-01/latest-tests.json   # static + unit + e2e
node tests/run.mjs unit                                                    # one group
node tests/run.mjs e2e --filter voice                                      # test-name filter
```

`--filter` is a regular expression for test names; only files that mention it are started (node:test 22.x
otherwise runs a file's `after` hook before its slow async `before` has finished and the process hangs). Each group
is stopped after `CK_TEST_TIMEOUT_SECONDS` (default 1800) and reported as failed, so a leaked resource cannot hang CI.
`setup()` closes the mock / harness / Chromium it already started when a later step fails (for example a missing
Chromium executable) and rethrows the original error; `e2e/setup.e2e.mjs` checks this.

Needs `esbuild` and `playwright` (with its Chromium) resolvable from `prototype/node_modules`. Both are pinned
devDependencies since CI-002 (esbuild 0.28.2, playwright 1.63.0); install the browser with
`pnpm exec playwright install chromium`. In sandboxes without registry access, point `CK_TOOL_NODE_MODULES` at a directory
that has them (e.g. `CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules`); project modules are always tried first.

## What each layer proves — and does not

| Layer | What runs | Proves | Does not prove |
| --- | --- | --- | --- |
| `static` (`harness/offline-static-check.mjs`) | esbuild parse of every TS/JS file; TypeScript strict check of `app/api/**` and the app's own `lib/` modules (works with the project's TypeScript 5.9 and with 6.x); components against a loose React shim **only when the real `@types/react` is not installed** (otherwise skipped — the project `tsc --noEmit` covers them); JSON validity; credential-pattern scan; model-ID inventory | No syntax errors; server code type-checks against a `cloudflare:workers` stub | It is not the project `tsc --noEmit` (CI runs that) |
| `unit` (`unit/*.test.mjs`) | Pure modules (transcript reducer, feedback quote check, storage sanitising, access tokens, content roles, cost estimate) bundled with esbuild, run with `node --test` | The logic itself | Anything about the framework or network |
| `e2e` (`e2e/*.e2e.mjs`) | The real `app/page.tsx` bundled by esbuild and rendered by React 19 in Chromium (390×844 phone and desktop); the real `app/api/**/route.ts` handlers in Node; `harness/mock-openai.mjs` instead of OpenAI | UI flows, request/response handling, access protection, feedback quote filtering, storage robustness | vinext/Next SSR, Cloudflare Workers runtime, real model output |
| voice e2e (`e2e/voice.e2e.mjs`) | A second Chromium page acts as the Realtime server over a **real loopback WebRTC connection** (`harness/realtime-sim.mjs`): answers the app's SDP offer, receives the `oai-events` data channel, sends an audio track and scripted GA Realtime events | Transcript ordering with late transcriptions, interruption marking, transcription failure, server hangup on finish, disconnect + resume, StrictMode connect, diagnostics export | OpenAI's actual event timing, VAD, recognition accuracy, audio quality, mobile Safari/Chrome behaviour, billing |

The harness (`harness/build.mjs`, `harness/server.mjs`) is not the production framework: no SSR, `lucide-react`
is replaced by placeholder icons when it is not installed, and `cloudflare:workers` env maps to `process.env`.
Real-device and real-AI checks follow `docs/09_REAL_DEVICE_VOICE_TEST.md`.

### Against a real dev server (BASE_URL mode)

The tests wait for the **readiness contract** `<html data-app-ready="true">` (set by `app/page.tsx` after
React has hydrated) before clicking anything; server-rendered buttons do nothing before that.

The test process cannot reconfigure a running dev server, so run it twice with a fixed mock port:

```sh
# 1) app + voice suites (access suite skips itself with a reason)
OPENAI_API_KEY=dummy OPENAI_BASE_URL=http://127.0.0.1:4010/v1 CK_ACCESS_POLICY=local pnpm dev --host 127.0.0.1
BASE_URL=http://127.0.0.1:5173 CK_MOCK_PORT=4010 node tests/run.mjs e2e

# 2) access suite as well: restart the dev server with an access code
OPENAI_API_KEY=dummy OPENAI_BASE_URL=http://127.0.0.1:4010/v1 CK_ACCESS_CODE=local-test-code pnpm dev --host 127.0.0.1
BASE_URL=http://127.0.0.1:5173 CK_MOCK_PORT=4010 CK_E2E_ACCESS_CODE=local-test-code node tests/run.mjs e2e
```

(Put the variables in `.dev.vars` if the dev server does not pick them up from the shell — ENV-001 found `.dev.vars` wins over `.env.local`.)
In run 2 the app/voice suites log in with `CK_E2E_ACCESS_CODE` first. "without an access code, AI routes only answer on
localhost" is harness-only (it reconfigures the server and spoofs the Host header; a Vite dev server answers an unknown
Host with its own HTML 403 before the app runs) and is skipped in BASE_URL mode.

Checked 2026-10-23 against the harness server started separately (not vinext): run 1 → 16 pass, 4 skipped; run 2 → 19 pass, 1 skipped.

### Voice tests need a normal network interface

The simulated Realtime peer is a second page in the same Chromium. In a network namespace whose only interface is
loopback, Chromium emits no ICE candidates and the data channel never opens (reproduced with `unshare -rn`). The tests
then fail with "no usable ICE host candidate … environment limitation"; that is not an app result. GitHub's standard
runners have a normal interface.
