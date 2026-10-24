# 开源与免费资料复用评估（REUSE-001，2026-10-23，Claude）

机器可读清单：`research/reuse_candidates_2026-10-23.csv`。原有的基础设施候选（Expo、Supabase、LiveKit、Pipecat、OpenIAP、shadcn/ui、Playwright、promptfoo）见 `research/open_source_candidates.csv` 和 `docs/07`，这里不重复。本次只核对了主仓库或官网写的许可，**不是逐依赖的许可证审计**。

## 已经拿来用的

| 来源 | 怎么用 | 为什么这样用 | 证据 |
| --- | --- | --- | --- |
| **kuromoji.js**（Apache-2.0）＋ mecab-ipadic | 只作为**生成工具**：离线给 318 条固定文字（场景、开场白、参考句、目标、演示回复）生成注音，再人工修正 18 处，存成 `prototype/lib/furigana-data.ts`。界面在汉字上显示注音，默认开启，可在设置和练习页切换 | 运行时直接嵌入词典约 17 MB，对手机网页太重；kuromoji 自 2018 年没有更新，不适合作为生产依赖。离线生成没有运行时依赖，也方便审稿 | `tools/furigana/`；`tests/unit/furigana.test.mjs`（覆盖率、文字一致、读音为平假名、修正已生效）；e2e「furigana …」；许可文本见 `docs/licenses/` |
| **openai-agents-js**（MIT，OpenAI 官方） | 只作**参考**：对照了其 WebRTC 传输层。我们取 call_id、断线宽限、远端关闭的处理方式与它一致；发现一个缺口——AI 还在回答时输入文字，`response.create` 会被服务端拒绝，那句话得不到回复。参考它的 ResponseCreateSequencer 思路，在 `VoiceSession` 里**独立实现**了排队 | 没有复制代码，所以没有许可义务；为这个缺口新增了 e2e 测试，并确认去掉修复后测试会失败。2026-10-24 按 ENV-002 复核改为从**发出** `response.create` 起就算占用（第一版只在收到 `response.created` 后计数，确认前连续输入仍会发出两个 create），独立成纯逻辑模块并加单元测试 | `lib/response-sequencer.ts`、`lib/realtime-client.ts`；`tests/unit/response-sequencer.test.mjs`；e2e「a line typed while the AI is still answering …」 |
| **impeccable**（Apache-2.0，Paul Bakaus）与 **taste-skill**（MIT，Leonxlnx）——2026-10-24 用户要求接入 | 作为**设计评审技能**原样放进仓库：`.claude/skills/`（Claude Code）和 `.agents/skills/`（Codex）。根目录 `PRODUCT.md`、`DESIGN.md` 是共同依据；第一次评审见 `verification/DESIGN-BASELINE-001/` | 用于以后的视觉评审和把控：critique、audit、polish、document，以及 taste-skill 在浏览器里的确定性检查。没有放入编辑钩子和引擎二进制，因为钩子会在每次编辑后运行下载的程序，是否开启由用户决定 | `tools/design-skills/`（`vendor.mjs --check`、`manifest.json`、`README.md`）；`tests/unit/design-skills.test.mjs`；许可见 `docs/licenses/IMPECCABLE_*`、`TASTE_SKILL_LICENSE.txt`、`MODERN_SCREENSHOT_LICENSE.txt` |
| **ts-fsrs** 5.4.2（MIT，open-spaced-repetition）——2026-10-24 | 「ことばノート」的「今日の復習」：每条笔记一张 FSRS 卡，学员自评「まだ／もう少し／思い出せた」后排到之后的某一天；只存本机，不打分 | 成熟的间隔复习算法（Anki 生态采用的 FSRS），不必自己设计排程；没有传递依赖。用正式版 5.4.2，没用 6.0.0-beta。依赖由 Codex 加入（REVIEW-DEP-001，PR #47） | `lib/review.ts`、`components/review.tsx`；`tests/unit/review.test.mjs`、`tests/e2e/review.e2e.mjs`；许可见 `docs/licenses/TS_FSRS_LICENSE.txt` |

## 交给别人做，或等决定

| 来源 | 建议 | 负责与前提 |
| --- | --- | --- |
| **厚生劳动省「介護の日本語」教材、介護福祉専門用語集（14 种语言）、特定技能考试用书** | 2026-10-24补核：厚劳省自有网页默认PDL1.0不自动覆盖JACCW等第三方教材。免费阅读与商用全文/译文/录音/插图复制权分别判断。当前只核对主题、常用词及读音并写项目自己的情境与对话；不搬整书。具体已查来源见 `content/ssw-basic/sources.json`；旧“可以商用、可以改编”概括不能作为这些PDF的授权结论。 | **Codex（CONTENT-002）**：`content/` 归 Codex；Claude 的环境下载不了 mhlw.go.jp 的 PDF |
| 日本介护福祉士会「にほんごをまなぼう」 | 只写了「免费学习」，没有转载许可：只能链接推荐，不能复制 | — |
| **promptfoo**（MIT） | 用 Codex 已有的 `evals/samples.jsonl` 做替代模型的固定样本比较；OpenAI 弃用页也把它列为 Evals 的替代 | MODEL-001：Codex 可以先写配置；实际运行会调用付费模型，需要用户授权 |
| 固定参考句预生成音频（OpenAI TTS 一次性生成，或 VOICEVOX / Kokoro 离线生成） | 144 句参考句不必每次在线合成，还能避开 gpt-4o-mini-tts 在 2027-01-06 的停用。VOICEVOX 每个角色有单独条款、需要署名，声线偏动漫风，未必适合扮演老人；Kokoro 的日语质量未验证 | AUDIO-001：等用户选择声音和方式；用 OpenAI 一次性生成约 1 万字，费用极低，但仍需授权 |

## 不采用 / 只参考

- kuroshiro（MIT）：浏览器端实时注音，同样因为词典太大、长期不维护而不用。
- kotoba-whisper v2（Apache-2.0）：日语语音识别模型，需要 GPU 托管，暂时只作参考。
- onsei（MIT）：音调比对，作者自称是实验品；项目目前不评判发音。
- JMdict / KANJIDIC（CC BY-SA 4.0，允许商用）：App 要在「关于」页署名，派生数据要同许可分享，还得定期更新；做「点词查义」时再评估。
- Anki、LibreLingo（AGPL）、Yomitan（GPL）：许可凭记忆，没有重新核对。不要把代码并入闭源 App，只参考交互设计。

## 没有找到的

没有找到可以直接复用的「介护日语 + AI 口语陪练」开源项目。场景、反馈规则和语音闭环仍需自己做。
