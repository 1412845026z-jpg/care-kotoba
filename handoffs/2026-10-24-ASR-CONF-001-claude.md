# ASR-CONF-001｜识别置信度（可选，默认关闭）

- 作者与时间：Claude（Claude Code 云端会话），2026-10-24 凌晨 JST
- 分支：`claude/ASR-CONF-001`，从 `claude/DEVICE-PREFLIGHT-001` 开出。合并顺序：#17 → #18 → #19 → #20 → 本 PR
- 代码提交：`1b7d29e`（测试针对这个提交）
- 任务状态：review_ready

## 为什么做

CLAUDE.md 要求转写不够可靠时先确认或标为不确定。上一轮 `fromVoice` 只能区分「语音」和「打字/改过」，不知道识别器自己有多确定。OpenAI Realtime 可以在转写事件里返回 token logprobs。这个字段已对照 openai-node 2026-10-23 的类型核实：会话参数 `include: ["item.input_audio_transcription.logprobs"]`，`conversation.item.input_audio_transcription.completed.logprobs = [{token, logprob, bytes}]`。

社区有人报告这个字段时有时无，也有人报告开启后出现噪音，所以**默认关闭**，用环境变量 `CK_ASR_LOGPROBS=1` 打开，等真机验证。

## 做了什么

- `lib/asr-confidence.ts`：用几何平均概率、最低 token 概率和低概率 token 算出置信度。平均 < 0.8 或任一 token < 0.3 视为「不确定」。这两个阈值是初始猜测，需要校准。
- 会话路由在开关打开时加入 `include`；`/api/health` 显示 `voice.asrLogprobs`。
- 转写状态把置信度存在每句学员语音上。聊天里不确定且没被修改的句子显示「聞き取りに自信がありません。言ったことと違えば、修正してください。」，并附中文或英文说明。
- 反馈请求为这些句子加上 `asrUncertain`，提示词要求不要把它们的措辞当成语言错误。`verifyFeedback` 给对应的纠正标 `uncertainTranscript`，卡片说明这句话可能不是学员实际说的。
- 诊断日志每句记录 `asrMean` / `asrMin`，只有数字，不含文字，用于校准。
- docs/09 新增 T14：开启后做 A/B，检查清楚的句子会不会误报、含糊的句子能不能标出，留意噪音和 logprobs 缺失。

## 验证（Claude 沙箱，模拟 Realtime 对端发送模拟 logprobs）

`node tests/run.mjs all`：static 0 错误（25 个模块），unit 67/67，e2e 30/30。报告：`verification/ASR-CONF-001/tests.json`。

- 单元测试覆盖：无效或缺失的 logprobs、确定与不确定的句子、转写状态、反馈标注、开关、诊断日志不含文字。
- e2e 覆盖：会话请求带上 `include`；模拟一句低置信度的「右膝」后，聊天出现提示；反馈请求带 `asrUncertain`；纠正卡显示不确定说明。

## 未验证

真实 API 是否稳定返回 logprobs、开启后的音质影响、阈值是否合适、哪些转写模型支持（预计 gpt-4o-mini-transcribe 支持，whisper-1 不支持）。这些都要在 DEVICE-001 里确认后，再决定是否默认开启。
