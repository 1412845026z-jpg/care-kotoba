# MERGE-2 交付证据

2026-10-24 JST；全部免费。#46→#49已按用户顺序合并，#53独立Lighthouse随后合并；各实际SHA、CI源与任务分支提交见 `integration.json`。

| 检查 | 固定CI源 / 运行 | 结果 |
| --- | --- | --- |
| #46 | e5adb491合成源，run40076990478 | install/TypeScript/build、static0、unit92/92、模拟e2e58/58；390与1280屏幕11/12，三项硬门全部0 |
| #49 | 1306d937合成源，run40077969512 | install/TypeScript/build、static0、unit99/99、模拟e2e62/62；屏幕12/13，三项硬门全部0 |
| Lighthouse #53 | c6b2d605合成源；CI40078527301 / report40078527309 | 两个常规job与诊断job成功；手机开发harness44/100/96/90，无分数硬门 |
| 免费指南 | 实际main6148494 / DEVICE-FREE-GUIDE-001 runner | 无key真实dev走通；Worker外部fetch尝试0、付费API0；假麦克风/假识别，非真机 |

`pr46/` 与 `pr49/` 保存原始audit/axe及mock-tests报告。Lighthouse的原始HTML、JSON和114份许可在 `../LIGHTHOUSE-001/runner/raw-artifact.zip`，旁边有可直接读的摘要/网络/版本记录。ZIP哈希是312b896247e681faf7bde5b204e150d24e3aef663999aa7cd60004892f674408。

A11Y三项通过不是完整WCAG验收。axe六页最新#49仍有15/19个规则实例（#46为17/21），给Claude的既有问题继续保留；手机指南还观察到会话类型选择收起后焦点落到BODY。Lighthouse仅首页、后备字体、开发harness，不能把44性能分、开发bundle大小、no-store或SEO shell结论移到正式生产。真实AI、真机、听感及法律税务签核均未通过本轮完成。
