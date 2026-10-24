# Accessibility CI (offline mock)

Source: 8003f5845f7f5424e7f22296c9dbe93bd2c5119a; Node: v22.23.3.

Audit blocks on every raw contrast, targetsUnder24, or textUnder12px finding. Axe findings are informational; runtime failures fail the job.

| Viewport | Audit screens | Hard gate | Axe rule violations |
| --- | ---: | --- | ---: |
| 390x844 | 11 | pass | 17 |
| 1280x860 | 12 | pass | 21 |


The harness uses loopback mock AI and fallback fonts. This is not a real-device, screen-reader, or production-font audit.
