# Isolated Lighthouse tooling

Lighthouse **13.5.0**, Apache-2.0; official release/source commit
[`cb853a38a6410617518b363590c967b3fe211949`](https://github.com/GoogleChrome/lighthouse/tree/cb853a38a6410617518b363590c967b3fe211949).
Checked 2026-10-24 (Japan time). Node >=22.19.

This manifest and npm v3 lock are independent of `prototype/package.json` and
`prototype/pnpm-lock.yaml`. CI copies them into `$RUNNER_TEMP/lighthouse-tools`
and uses `npm ci --ignore-scripts --no-audit --no-fund`. All 114 npm package
versions and archive integrities are frozen; no `npx latest`, global install,
remote scoring, PageSpeed Insights API, upload service, account, token or billable
AI request is used. Updating the tool requires a reviewed lock change.

The original upstream Lighthouse LICENSE is retained at
`docs/licenses/LIGHTHOUSE_LICENSE.txt`. The runner also records every locked
package's name/version/integrity/license and copies 114 actual LICENSE / NOTICE
files into its artifact. The frozen tree reports MIT, Apache-2.0, ISC, BSD-3-Clause,
BSD-2-Clause, 0BSD, MPL-2.0 and `(MIT OR CC0-1.0)` licenses; no GPL/AGPL dependency
was selected. Tool code is unmodified and is never bundled into the App.

Run locally after frozen App/tool installation and Playwright Chromium install:

```sh
npm ci --prefix scripts/ci/lighthouse-tools --ignore-scripts --no-audit --no-fund
node scripts/ci/record_lighthouse_toolchain.mjs scripts/ci/lighthouse-tools lighthouse-results
node scripts/ci/run_lighthouse.mjs --out lighthouse-results
```

The default browser is the App's pinned Playwright Chromium. A sandbox with only
headless-shell may explicitly set `CK_LIGHTHOUSE_CHROME` to that local executable;
CI uses the full Chromium installation. The script clears inherited AI keys,
provider URLs, `BASE_URL`, CK flags and `NODE_OPTIONS` before starting the offline
harness. Node TCP/fetch remain loopback-only, while browser external traffic is
forced through a closed loopback proxy. Google Fonts therefore use fallback fonts.

Only homepage navigation is scanned in **mobile emulation** with the default
Lighthouse simulated mobile throttling. The React/esbuild development bundle,
inline source maps, no-store responses, harness shell and absent Worker headers
make production performance/SEO/security conclusions inappropriate. No score or
finding blocks CI. A broken report exits nonzero and is visible, but the whole
diagnostic job has `continue-on-error: true`; it cannot bypass the separate normal
CI or A11Y hard gate. JSON, HTML, provenance and notices are retained for 7 days.
