# START-FLOW-001｜开始练习一步到位、辅助语言标记（Claude，2026-10-24）

- 用户指令（15:07 / 15:11「开始」）：按 Claude 提出的分工开始；GitHub 上可用的开源代码可以直接复用。本任务对应 DESIGN-BASELINE-001 P1-1 剩下的一半：开始练习前的选择过多。
- 分支：`claude/START-FLOW-001`，基于 `claude/DEAI-001`（a567b8d，PR #44 未合并）。**PR 的 base 是 `claude/DEAI-001`**：合并顺序 #43 → #44 → 本 PR（前一个合并后把 base 改为 main）。
- 没有改依赖、CI、部署配置；没有调用付费 API。

## 做了什么

- **场景说明弹窗**：原来要先在 4 张「会話のタイプ」卡片里选一个，再选练习方式。现在默认「穏やかな会話」，显示为一行「会話のタイプ　穏やかな会話　まずは、ゆっくり　［変える］」；点「変える」才展开 4 个选项（`role="radiogroup"`，选项是 `role="radio"` + `aria-checked`），选完自动收起。每次打开场景都回到默认。「音声でAIと話す」「文字で練習」在 390×844 的第一屏内，一次点击开始。核心草稿场景不显示这一行（和以前一样没有类型选择）。
- **辅助语言标记**：新增 `Support` 组件（`components/ui.tsx`），把 14 处 JSX 里的 `{support(...)}` 换成 `<Support …/>`，输出 `<span lang="zh-Hans">` 或 `lang="en"`，让中文用简体字形显示、读屏软件切换语言。设置里的英文副标签、语言选项、顶栏的语言按钮也加了 `lang`。拼接成字符串的两处（`setError(... + support(...))`）保持原样。
- 场景说明标题改为正文墨色（DEAI 的遗漏）。

文件：`prototype/app/page.tsx`、`prototype/components/{ui,practice,line-drill}.tsx`、`prototype/app/globals.css`（末尾「START-FLOW-001」一段）、`prototype/tests/e2e/start-flow.e2e.mjs`（新增 4 项）、`verification/START-FLOW-001/`。

## 验证

- 代码提交 `3631b6b`。`node tests/run.mjs all`（离线 harness，模拟 AI）：static 0、unit 92/92、e2e 58/58（54 + 新增 4），在提交前的工作区运行，内容与 `3631b6b` 相同。
- 新增 e2e：默认类型和第一屏按钮位置；换成「断られたら？」后，发给模拟 AI 的指令里确实带上该类型；关掉再打开回到默认；辅助语言文字的 `lang`（中文 / 英文）。
- `verification/A11Y-001/audit.mjs`：390px 11 个画面、1280px 12 个画面，对比度、24px 以下目标、12px 以下文字全部 0（`verification/START-FLOW-001/a11y-*.json`）。
- 截图：`verification/START-FLOW-001/screens/`（收起、展开、桌面）。图标是 harness 的替代方块。

**不证明：** 真机上的操作感；学员是否更快开始（需要试用观察）。

## 给 Codex

- 按顺序合并：#43 → #44 → 本 PR。`scripts/ci/security_browser_probe.mjs` 里「核心草稿没有 `.variant-grid`」的断言仍然成立（普通场景也只在点「変える」后才出现 `.variant-grid`）。
- REVIEW-DEP-001（ts-fsrs 5.4.2）合并后告诉 Claude（交接或 PR 评论），Claude 接着做 REVIEW-001。

## 下一步

- Claude：REVIEW-001（ことばノート 的复习），等 ts-fsrs 依赖合并。
