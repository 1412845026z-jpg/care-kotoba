# Accessibility CI (offline mock)

Source: e5adb4913e6d333cd8eda59ca4d6328e29db7700; Node: v22.23.3.

Audit blocks on every raw contrast, targetsUnder24, or textUnder12px finding. Axe findings are informational; runtime failures fail the job.

| Viewport | Audit screens | Hard gate | Axe rule violations |
| --- | ---: | --- | ---: |
| 390x844 | 11 | pass | 17 |
| 1280x860 | 12 | pass | 21 |


The harness uses loopback mock AI and fallback fonts. This is not a real-device, screen-reader, or production-font audit.
