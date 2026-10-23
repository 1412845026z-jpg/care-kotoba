# Care Kotoba tests

Everything here runs without an API key, without network access to OpenAI and without cost.

```sh
cd prototype
node tests/run.mjs all  --report ../verification/G0-01/latest-tests.json   # static + unit + e2e
node tests/run.mjs unit                                                    # one group
node tests/run.mjs e2e --filter voice                                      # test-name filter
```

Needs `esbuild` and `playwright` (with its Chromium) resolvable from `prototype/node_modules`.
They are **not yet in package.json**; until the build-owner adds them as devDependencies
(versions used so far: esbuild 0.28.2, playwright 1.63.0), point `CK_TOOL_NODE_MODULES`
at a directory that has them, e.g. `CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules`.

## What each layer proves — and does not

| Layer | What runs | Proves | Does not prove |
| --- | --- | --- | --- |
| `static` (`harness/offline-static-check.mjs`) | esbuild parse of every TS/JS file; TypeScript strict check of `app/api/**` and the app's own `lib/` modules; JSON validity; credential-pattern scan; model-ID inventory | No syntax errors; server code type-checks against a `cloudflare:workers` stub | Full project `tsc --noEmit` (needs `@types/react` etc. from the lockfile); React components are only parsed |
| `unit` (`unit/*.test.mjs`) | Pure modules (transcript reducer, feedback quote check, storage sanitising, access tokens, content roles, cost estimate) bundled with esbuild, run with `node --test` | The logic itself | Anything about the framework or network |
| `e2e` (`e2e/*.e2e.mjs`) | The real `app/page.tsx` bundled by esbuild and rendered by React 19 in Chromium (390×844 phone and desktop); the real `app/api/**/route.ts` handlers in Node; `harness/mock-openai.mjs` instead of OpenAI | UI flows, request/response handling, access protection, feedback quote filtering, storage robustness | vinext/Next SSR, Cloudflare Workers runtime, real model output |
| voice e2e (`e2e/voice.e2e.mjs`) | A second Chromium page acts as the Realtime server over a **real loopback WebRTC connection** (`harness/realtime-sim.mjs`): answers the app's SDP offer, receives the `oai-events` data channel, sends an audio track and scripted GA Realtime events | Transcript ordering with late transcriptions, interruption marking, transcription failure, server hangup on finish, disconnect + resume, StrictMode connect, diagnostics export | OpenAI's actual event timing, VAD, recognition accuracy, audio quality, mobile Safari/Chrome behaviour, billing |

The harness (`harness/build.mjs`, `harness/server.mjs`) is not the production framework: no SSR, `lucide-react`
is replaced by placeholder icons when it is not installed, and `cloudflare:workers` env maps to `process.env`.
Real-device and real-AI checks follow `docs/09_REAL_DEVICE_VOICE_TEST.md`.

### Against a real dev server

`BASE_URL=http://127.0.0.1:5173 node tests/run.mjs e2e` points the browser at a running `pnpm dev` instead of the
harness. Fix the mock port with `CK_MOCK_PORT=4010` and start the dev server with `OPENAI_BASE_URL=http://127.0.0.1:4010/v1`,
any dummy `OPENAI_API_KEY` and `CK_ACCESS_POLICY=local`. The voice tests also need the simulator, which works the same way. This path has not been run yet (task ENV-001).
