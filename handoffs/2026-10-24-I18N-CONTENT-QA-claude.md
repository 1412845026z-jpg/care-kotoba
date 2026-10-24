# I18N-CONTENT-QA｜语言包主题 ID 校验与按实际来源核对的测试

- 作者与时间：Claude，2026-10-24T22:10+09:00
- 仓库与工作分支：https://github.com/1412845026z-jpg/care-kotoba ，`claude/I18N-CONTENT-QA`
- 开始时的集成分支 / 基准提交：`claude/SCENE-AV-APP-001` @ `5fb5dd8`（含 #62），并合并了 `codex/COORD-CLAUDE-002` @ `260bebb`（PROJECT_STATE 冲突已保留双方的行）
- 已推送代码提交：`68fb479`
- PR / 审查入口：见 PROJECT_STATE 本任务行
- 任务状态：review_ready
- 合并证据：未合并

## 结果与范围

依据：handoffs/2026-10-24-COORD-CLAUDE-002-codex.md「I18N-CONTENT-QA」。只改 Claude 的生成器与测试，未改 `content/`。

- `tools/ssw-basic-app/generate.mjs`：语言包里**未知的 topic ID 报错**（scene ID 原已报错）；`topics` / `scenes` 必须是按 ID 的对象，`lines` 必须是文本或 null 的列表；缺 `status` 报错（原有）。
- `prototype/tests/harness/basic-sources.mjs`：直接读 `content/ssw-basic`（catalog 内联键＋`locales/*.json`），算出每种语言实际提供了什么，以及按 App 规则某个辅助语言会看到哪种语言（例如 vi 缺译时为 en）。
- 单元测试：生成数据与上述来源逐项比对（每个场景的 title/goal/context/check、每句台词、每个主题），不再写死「只有中文」；每个语言包的审稿状态原样保留。新增：完整英语包被消费且保持 `draft_unreviewed`、中文状态不变；未知主题、错误形状、缺 status 被拒。
- 浏览器测试：越南语学员的期望由来源决定——有越南语就显示越南语，只有英语就显示英语（`lang="en"`），都没有才显示「还没有你的语言」；任何情况下不显示中文。

## 验证

| 检查 | 实际命令 / 方法 | 被测代码提交 | 结果与证据 |
| --- | --- | --- | --- |
| 离线全套 | `CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules node tests/run.mjs all` | `68fb479` | static 0；unit 119/119；e2e 84/84（模拟环境） |
| 反向对照 | 把生成数据中一句台词的 `tr` 改空后跑来源比对测试 | `68fb479` 工作树临时改动（已还原，`--check` up to date） | 测试失败，能抓到丢失的译文 |
| 有英语包时 | 临时写入覆盖 96 场的假 `en.json`，重跑生成器与相关 unit/e2e，之后删除并重生 | `68fb479` ＋临时文件 | 来源比对、基础课多语言、5 种语言界面对照全部通过；越南语学员看到英语说明且 `lang="en"` |

## 未完成与阻塞

- 无已知剩余项。真实英语包的接入单列 I18N-EN-APP-001（Codex 已推送 `codex/SSW-EN-001`）。

## 有效决定与下一步

- 语言包的字段检查由生成器负责（与 Codex 的 `tools/ssw-basic/check_locales.py` 互相独立，两边都检查）。
- 下一步：I18N-EN-APP-001（接入 `content/ssw-basic/locales/en.json`），随后 LICENSE-UI-002。

## 同步检查

- 分支已推送；基于 #63 的分支，**合并顺序：#62 → #63 → 本 PR**。
- 本分支包含 `codex/COORD-CLAUDE-002` 的提交，Codex 合并 COORD 时不会与本分支冲突。
