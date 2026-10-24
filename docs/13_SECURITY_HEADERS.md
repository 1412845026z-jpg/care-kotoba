# Worker response headers — SEC-001

The Worker creates a fresh random 144-bit CSP nonce for each request, replaces caller-supplied CSP request headers, and passes the policy to Vinext before rendering. The installed Vinext 1.0.0-beta.5 reads that trusted request header and adds the nonce to its server-rendered bootstrap scripts. HTML is `no-store` so the nonce is not shared through a page cache.

Production script CSP admits same-origin scripts and the per-response nonce. It does not permit `unsafe-inline` or `unsafe-eval` for scripts; development alone permits `unsafe-eval` for framework debugging and the exact origin's HMR WebSocket. Inline style permission remains necessary for existing React style attributes. Existing Google Fonts stylesheet/font origins are explicitly listed. Script event-handler attributes, object/embed, foreign frames, base URL changes and cross-origin form submissions are restricted.

Response headers also include `nosniff`, `DENY`, `no-referrer`, `same-origin` opener policy and a permissions policy allowing only same-origin microphones. HSTS is sent for HTTPS responses only, with no subdomain or preload commitment. WebSocket upgrade responses are left intact to preserve their Workers handle. Existing API status/body/headers/cookies, SDP metadata and media streams remain intact; the policy allows same-origin API calls and blob audio. CSP does not by itself validate WebRTC peers or replace authorization, quotas, clinical review or an application security audit.

Checks:

```sh
node scripts/ci/check_security_policy.mjs
python3 scripts/ci/verify_claude.py --source . --mode real-dev --browser-probe scripts/ci/security_browser_probe.mjs --report-dir /tmp/ck-security
```

The browser probe checks real Worker headers, nonce rotation and SSR hydration; rejects a deliberately injected nonce-less script; accepts a nonce-bearing script; exercises mock text chat/feedback, ruby rendering and a fake microphone. The complete real-dev suite additionally tests the real browser WebRTC transport against a simulated local peer. No production credentials or real model calls are used. Security tests have their own standard-runner workflow; regular `ci.yml` remains separately owned by CI-002.

The #17–#30 integration gate is still blocked by ENV-004's two synthetic-crash/dev-overlay failures. SEC-001 is prepared against current main plus these Worker changes. Its results cannot be reported as verification of that entire unmerged business chain; rerun on the final integrated tree after those failures are resolved. No deployment is performed here.

References used alongside the installed framework code:

- [MDN CSP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [MDN connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)

A passing check is scoped to its saved source commit and environment. Real phones, real OpenAI event timing and production hosting are not covered.
