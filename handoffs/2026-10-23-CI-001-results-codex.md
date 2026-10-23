# CI-001｜main 绿色的最终证据

- 作者：Codex，2026-10-23T12:41:38.595Z。
- 状态：CI 实现已 merged（PR #3）；本结果记录分支 `codex/CI-001-results`，推送后 review_ready。
- 开始时 main / 被测提交：`87b611863046f8bb0b602aeb1bfb9e1b60396432`。
- 原 CI 交接保持原样；本文件补充后续真实结果。

## 真实结果

[main push CI](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954687547) 已 completed / success。
job `120417460692`；Node **22.23.3**、pnpm **11.25.0**、profile **portable**。

| 实际命令（prototype/） | 结果 | 包装器真实耗时 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 | 19.308 秒 |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 | 7.330 秒 |
| `pnpm build` | exit 0 | 6.504 秒 |
| `python3 scripts/ci/scan_secrets.py`（根目录） | 182 跟踪文件及 ZIP 内条目扫描通过 | 小于 1 秒，未单独计时 |
| 扫描器合成样本保护测试 | 3 项通过 | 见 job 日志 |

[首次 PR CI](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954272675) 也通过（Node22；install20.287s、tsc9.862s、build9.615s）。
同一分支首次 push run `39954262765` 因 PR 并发规则 cancelled；其检查步骤实际均成功，最终验收只采用 success 的 PR/main run。
通用 GitHub fetch 的 job 日志 URL 返回不支持，改用专用 fetch_workflow_job_logs 成功读取；没有据失败请求猜测日志。

## 合并与范围

- PR #1 合并 `4118ed18f90b461f5304e2d107613a8f6e1a61f9`；保留原样导入 `77a0604`。
- PR #2 合并 `7854c7b90c5b022c7cb3210dfc4bae6026a48298`；SYNC-002 对同一 head 的 130 项独立核验已入 main。
- PR #3 合并 `87b611863046f8bb0b602aeb1bfb9e1b60396432`；main 的 push CI 如上通过。
- 此结果 PR 仅新增本文件、机器可读结果和整合任务状态；没有改变共享规则或应用代码。
- 已只读核实 Actions 付费预算为 0 并阻止付费用量；没有更改费用设置。没有用户 secret、OpenAI 调用、部署或付费 runner。

## 下一步与未验证

Claude 已推送 `claude/G0-01-voice-loop` @ `55f0ebb68c13283a6e6b523785668032bcbb70a7`，尚未读到该任务的完成交接/PR。
Codex 将验证真实 dev server；Claude 需把 G0-01 rebase/merge 最新 main，保留其本轮任务信息，避免旧 PROJECT_STATE.md 覆盖新状态。
G0-01 合并后才把其模拟测试加入 CI。构建与模拟测试不能证明真实 AI、麦克风、真机语音、企业隔离、支付、负载或商业可用性。
