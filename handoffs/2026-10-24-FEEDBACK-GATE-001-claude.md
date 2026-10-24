# FEEDBACK-GATE-001｜反馈守门与错误边界

- 作者与时间：Claude（Claude Code 云端会话），2026-10-24 凌晨 JST
- 分支：`claude/FEEDBACK-GATE-001`，从 main `8b55117` 开出，之后合并了 `claude/MERGE-001-state`（PR #17，只有记录）。请先合并 PR #17，再合并本 PR。
- 代码提交：
  - `cb0469d`：发音评价守门
  - `2af0ad8`：语音转写标注
  - `634d2e9bcde7c8edd14054c44b61240e7f2b5762`：错误边界
- 测试针对的提交：`634d2e9`（之后只改了记录和 docs/08）
- 任务状态：review_ready

## 为什么做

CLAUDE.md 的教学原则：文字不能证明发音；转写不可靠时，不把它当作学员的错误；反馈只引用实际发话。EVAL-002 的配对评测把「无音频却评价发音」列为拒绝标签。另外 docs/08 #16 的错误边界原本列在下一轮。

## 改了什么

| 文件 | 改动 |
| --- | --- |
| `prototype/lib/feedback-quality.ts` | 新增 `claimsPronunciation` / `stripPronunciationClaims`，支持日、中、英：评价发音、口音、语调的句子删去，只说明「不评价发音」的句子保留。`verifyFeedback` 对标题、总结、优点、纠正理由、目标证据都应用；证据句被删时保留已核实的引用；纠正理由只谈发音的整条丢弃。`quality` 增加 `removedPronunciationClaims`、`droppedPronunciationOnlyImprovements`。`verifyCorrection` 同样处理对话中的纠正。纠正的原话如果只能对上**未修正的语音行**，标记 `fromVoice` |
| `prototype/app/api/feedback/route.ts`、`chat/route.ts` | 提示词改为：输入是文字，任何时候都不评论发音；服务端记录删除次数（只记数量，不记内容） |
| `prototype/components/practice.tsx` | 反馈页：删去发音评价时显示说明；`fromVoice` 的纠正卡标明「音声の聞き取り結果」，并提示「実際に言ったことと違う場合、このカードは気にしなくて大丈夫です」 |
| `prototype/components/screen-boundary.tsx`（新）、`app/page.tsx`、`globals.css` | 每个标签页和练习界面各包一个错误边界：只替换出错的画面，可以「もう一度表示する」或返回；切换标签页或换一次练习后自动复位。测试钩子 `window.__CK_CRASH_TEST__` 只在测试里设置 |
| `prototype/tests/**` | 单元测试覆盖三种语言的发音句、句子级删除、`verifyFeedback` 和 `verifyCorrection`、`fromVoice`；**与 EVAL-002 对齐的测试**直接读取 `evals/source-confidence/samples.jsonl`；e2e 覆盖模拟模型评价发音、语音行纠正标注、两种画面崩溃后恢复。离线 React 桩增加了 `Component` |
| `docs/08` #16 | 标为错误边界已加；安全响应头仍归 Codex |

## 验证（Claude 沙箱：Node 22.22.0、Chromium 153、Playwright 1.63.0；项目依赖未安装）

| 检查 | 结果 |
| --- | --- |
| `CK_TOOL_NODE_MODULES=<tools> node tests/run.mjs all` | static 0 错误（23 个模块，8 个组件）；unit 59/59；e2e 28/28；87 秒。报告：`verification/FEEDBACK-GATE-001/tests.json` |
| 与 EVAL-002 对齐 | 12 条草稿的候选反馈中：发音门槛判断全部与预期一致（12/12）；引用归属门槛适用的 6 条全部一致（6/6）。来源与核实、推断范围、尊重拒绝这三类门槛，需要模型或人来判断，代码没有覆盖 |
| 反向验证 | 换回 main 的 `feedback-quality.ts`，「feedback made from text never shows a pronunciation judgement」失败：「a pronunciation judgement reached the learner」 |
| 390px 截图 | 错误画面有 16px 边距，没有横向溢出（`verification/FEEDBACK-GATE-001/boundary-notes-390.png`，图标是测试环境的占位符） |
| 项目 tsc / build | 看本 PR 的 CI |

## 限制

- 发音检测靠关键词加否定句式，可能漏判（换个说法）或误删（例如在谈别的事时提到「アクセント」）。删掉的只是那一句，并且界面会说明。真实模型的输出没有验证过。
- `fromVoice` 只能区分「语音转写」和「学员修正过或打字的」，**不知道识别的置信度**。官方文档里有转写 logprobs（`include: ["item.input_audio_transcription.logprobs"]`），但社区有报告说这个字段时有时无，还有开启后出现白噪声的帖子，所以这一轮没有启用。可以在 DEVICE-001 真机测试时做 A/B，确认后再用来标记「不确定」。
- 错误边界不能接住事件处理函数和异步代码里的错误，只接渲染错误。

## 给 Codex

- 没有依赖需求。CI-002 接入后，这些测试会跟着 `node tests/run.mjs all` 一起运行。
- 内容审阅意见见 PR #17（`verification/CONTENT-REVIEW-001/`）。
