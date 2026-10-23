# REUSE-001 fix1｜输入排队竞态与注音字典查找（ENV-002 第 2、3 项）

- 作者与时间：Claude（Claude Code 云端会话），2026-10-24T00:50+09:00
- 仓库与工作分支：https://github.com/1412845026z-jpg/care-kotoba ，`claude/REUSE-001`，[PR #9](https://github.com/1412845026z-jpg/care-kotoba/pull/9)（**依赖 PR #5**）
- 依据：Codex 审查 `codex/ENV-002-review`（PR #11）@ `0393e85`，被测 head `a43e7ed`
- 本轮提交：`e67dc41`（合并更新后的 G0 分支）、`a8507d2`（两项修复）、其后的合并与记录提交；准确的 head 以 PR 页面为准
- 测试针对的提交：`a8507d2`（之后只合入了 G0 的文档提交，代码没变）
- 任务状态：review_ready
- 合并证据：未合并。先合并 PR #5，再合并本 PR，都用 merge commit

## 1. 输入排队竞态（P1）

**原因**：`activeResponses` 只在收到 `response.created` 后才加一。从发出 `response.create` 到收到确认之间，连续输入会再发 create，第二个被服务端拒绝，第二句话就没有回复。

**修法**：新建纯逻辑模块 `prototype/lib/response-sequencer.ts`（不依赖 DOM 和 WebRTC），`VoiceSession` 的开场、文字输入和回复结束后的补发都经过它。

- 从**发出** create 起就算占用（in flight），直到收到 `response.created` 或被拒绝。占用期间、有回复进行中、或学员正在说话（服务端 VAD 会自己生成回复）时，新请求都排队。
- 打字的那句话什么时候算「已有回复」：服务端先回 `conversation.item.added`、之后又出现 `response.created`。服务端按处理顺序发事件，所以这个回复一定看到了那句话，无论回复是我们请求的还是 VAD 自动生成的，都不再重复请求。服务端或模拟环境不回显 item 时，退而以「我们的 create 被确认」为准，在回复结束时再最终确认。
- 被拒绝（`conversation_already_has_active_response`）时，用 `error.event_id` 对应到我们的 create（现在每个 create 都带 `event_id`），把它负责的那些句子恢复为「待回复」，等当前回复结束后重发。没有已知进行中的回复时允许立即重试，但最多连续 3 次，防止服务端状态异常时死循环。
- 开场请求在已有回复进行时直接放弃，不排队，因为已经有人在回答了。
- 诊断日志新增 `responses`（in flight、进行中数量、待回复的句子、发送和被拒次数）。

**测试**：`prototype/tests/unit/response-sequencer.test.mjs` 共 11 个纯单元测试，不用 WebRTC：延迟确认、ENV-002 原样序列（确认延迟、多余的拒绝事件、服务端不回显 item）、开场未确认时输入、开场在已有回复时放弃、回复期间连续输入只补发一次、VAD 抢先导致被拒后重试、重试上限、说话期间不发送、空提交后放行、数据通道发不出去，以及一个用假数据通道的 `VoiceSession` 测试。这个 `VoiceSession` 测试在旧代码 `a43e7ed` 上失败。

## 2. 注音字典查找（P2）

`furiganaFor` 现在只认 `FURIGANA` 自身的字符串属性；`constructor`、`toString`、`__proto__`、`hasOwnProperty` 等，以及非字符串输入，一律按原文显示。AI 的回复也会经过同一函数，所以一起覆盖了。

**测试**：单元测试覆盖 9 个 Object.prototype 名称和 5 种非字符串输入；新增 e2e：笔记文字为 `constructor`、`toString`、`__proto__`、`hasOwnProperty`，注音开、关两种情况下笔记页都正常显示、没有 ruby、没有错误。旧代码上 e2e 卡在笔记页渲染，30 秒超时。

顺带检查了其他以存储数据为键的查找：场景都用 `scenes.find(s => s.id === …)`，`partners` / `partnerOverrides` 的键是内部生成的，转写状态的键是服务端 item id。没有同类问题，没有改动。

## 验证（Claude 沙箱，Node 22.22.0、Chromium 153、Playwright 1.63.0，未安装项目依赖）

| 检查 | 结果 |
| --- | --- |
| `CK_TOOL_NODE_MODULES=<tools> node tests/run.mjs all` | static 0 错误（23 个服务端 / 纯逻辑模块，含新模块；7 个组件）；unit 50/50；e2e 25/25（含语音模拟、新的 setup 和笔记测试）。报告：`verification/REUSE-001/fix1-tests.json` |
| Codex 的独立脚本 `verification/ENV-002/reproduce_edges.mjs`，在新代码上运行 | 2 句输入 → 2 个 create，2 个都被接受、0 个被拒，回复结束后发出后续请求；4 个注音输入都没有异常。输出：`verification/REUSE-001/fix1-codex-edges.json`（这是诊断输出，不是断言） |
| 反向验证 | 换回旧 `realtime-client.ts`，`VoiceSession` 单元测试失败；换回旧 `furigana.ts`，单元测试失败、笔记页 e2e 超时 |
| 项目 `pnpm install` / `tsc` / `build`、真实 dev | **未运行**（Claude 环境无法访问 npm）；需看 PR 上的 CI 和 Codex 复测 |

## 给 Codex

- 复测命令同 ENV-002。真实 dev 上新增的非语音用例：笔记的 Object.prototype 名称、setup 清理（2 项）。
- `reproduce_edges.mjs` 读的 `pendingResponseCreate` / `activeResponses` 字段已删除；新的状态在 `session.diagnostics().responses` 里，或直接用 `ResponseSequencer.state`。
- 没有新增依赖；锁文件、CI 都没动。

## 仍未验证

- 真实 OpenAI Realtime 是否在每次拒绝时都带 `error.event_id`，以及 `conversation.item.added` 和 `response.created` 的真实先后顺序。这些都按官方文档的事件格式实现，需要在 DEVICE-001 真机测试时看诊断日志确认。不带 `event_id` 时，只把拒绝算到仍在 in flight 的 create 上。
- 状态为 failed 的回复不会自动重试，以免持续失败时反复请求；界面照常显示错误。
- 语音完整组仍受 ENV-002 的 ICE 环境限制；标准 runner 复测归 Codex。
