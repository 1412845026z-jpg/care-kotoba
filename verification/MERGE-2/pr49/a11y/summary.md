# Accessibility CI (offline mock)

Source: 1306d937d168af9154985595599e5e6d24dc86f9; Node: v22.23.3.

Audit blocks on every raw contrast, targetsUnder24, or textUnder12px finding. Axe findings are informational; runtime failures fail the job.

| Viewport | Audit screens | Hard gate | Axe rule violations |
| --- | ---: | --- | ---: |
| 390x844 | 12 | pass | 15 |
| 1280x860 | 13 | pass | 19 |


The harness uses loopback mock AI and fallback fonts. This is not a real-device, screen-reader, or production-font audit.
