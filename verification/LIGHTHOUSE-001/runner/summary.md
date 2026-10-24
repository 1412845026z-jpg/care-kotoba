# Lighthouse mobile report (informational)

Source: c6b2d605bc77745fa227a4f9ad881a3eec2176fe; Lighthouse 13.5.0; Node v22.23.3.

No score threshold is enforced.

| Category | Score / 100 |
| --- | ---: |
| performance | 44 |
| accessibility | 100 |
| best-practices | 96 |
| seo | 90 |

## Findings to review (Claude owns App changes)

- **first-contentful-paint**: First Contentful Paint (25.8 s)
- **largest-contentful-paint**: Largest Contentful Paint (25.8 s)
- **speed-index**: Speed Index (25.8 s)
- **total-blocking-time**: Total Blocking Time (440 ms)
- **max-potential-fid**: Max Potential First Input Delay (260 ms)
- **errors-in-console**: Browser errors were logged to the console
- **interactive**: Time to Interactive (26.7 s)
- **total-byte-weight**: Avoid enormous network payloads (Total size was 4,905 KiB)
- **unminified-css**: Minify CSS (Est savings of 7 KiB)
- **unminified-javascript**: Minify JavaScript (Est savings of 3,603 KiB)
- **unused-css-rules**: Reduce unused CSS (Est savings of 88 KiB)
- **unused-javascript**: Reduce unused JavaScript (Est savings of 719 KiB)
- **meta-description**: Document does not have a meta description
- **bf-cache**: Page prevented back/forward cache restoration (2 failure reasons)
- **network-dependency-tree-insight**: Network dependency tree
- **render-blocking-insight**: Render-blocking requests (Est savings of 1,050 ms)

## Scope limits

- Development React/esbuild bundle, no production SSR/Worker/CSP; scores are not production performance.
- Mobile emulation is not a physical handset. One run per checkout is noisy.
- External browser traffic is forced through a closed loopback proxy; Google Fonts use fallback fonts.
- Only the homepage is scanned. Practice, feedback and notes are covered separately by A11Y CI.
- No AI, microphone, subscription, real-device or commercial-readiness acceptance.
