# DESIGN-SKILLS-001｜接入 impeccable 与 taste-skill（Claude，2026-10-24）

- 用户指令（13:53）：「taste-skill 和 impact-clable（即 impeccable）接入这两个 GitHub 的功能，方便之后对整个产品的视觉传达、视觉审美进行更专业的评价和把控。」
- 分支：`claude/DESIGN-SKILLS-001`，基于 main `cecef27`。
- 没有改依赖、锁文件、CI、部署配置或应用代码。没有调用付费 API，没有部署。没有运行 impeccable 的引擎二进制，也没有安装它的钩子。

## 做了什么

| 部分 | 位置 | 说明 |
| --- | --- | --- |
| 原样放入的技能 | `.claude/skills/impeccable/`、`.agents/skills/impeccable/`（impeccable 4.7.1 @ `9368675`）<br>`.claude/skills/design-taste-frontend/`、`.agents/skills/design-taste-frontend/`（taste-skill 2.1.4 @ `6010f91`） | Claude Code 读 `.claude/skills/`，Codex 读 `.agents/skills/`（各自上游的目录约定）。约 9.5MB，没有改动 |
| 放入工具 | `tools/design-skills/vendor.mjs`、`manifest.json` | 记录来源提交和每个文件的 SHA-256；`--check` 检查文件是否被改动（unit 测试也会运行） |
| 许可 | `docs/licenses/IMPECCABLE_LICENSE-2.0.txt`、`IMPECCABLE_NOTICE.md`、`TASTE_SKILL_LICENSE.txt`、`MODERN_SCREENSHOT_LICENSE.txt` | impeccable 打包了 MIT 的 modern-screenshot（压缩文件里没有版权声明），所以另外从其仓库记录了 MIT 原文和版权行 |
| 使用规则 | `tools/design-skills/README.md`；`AGENTS.md` 新增一节 | 用来做什么、本项目的约束优先、先评审后改动；以及没有用户同意时不做的事：运行 launcher、安装钩子、下载外部图片 |
| 共同的设计依据 | 根目录 `PRODUCT.md`（impeccable `init` 格式）、`DESIGN.md`（`document` 扫描模式） | 依据 CLAUDE.md、产品与销售计划（PDF）和 `globals.css` 写成；推断的部分标为「待确认」 |
| 第一次评审 | `verification/DESIGN-BASELINE-001/` | taste-skill `inspect.mjs --app`（6 项 FAIL、4 项 WARN）＋按 impeccable critique 结构写的评审（27/40，5 个优先问题）。截图在 `screens/` 和 `inspect-home/` |
| 其他 | `.gitignore`（`.taste-skill/`、`.impeccable/`、引擎 `bin/`）；`research/REUSE_REVIEW_2026-10-23.md` 新增一行；`tests/unit/design-skills.test.mjs`（3 项） | |

## 关于引擎二进制和钩子

- impeccable 的 launcher（`scripts/impeccable`）第一次运行时，会从 GitHub Releases 下载对应平台的引擎二进制，校验同源的 sha256 后执行。
- 上游的钩子会在每次编辑和会话结束时运行这个引擎。
- 引擎是开源、免费的，但会在开发环境里自动下载并执行程序，所以没有默认开启，需要用户决定。
- 不开启时，impeccable 按 SKILL.md 的「Launcher unavailable」流程直接读 PRODUCT.md 和 DESIGN.md，评审和改动都能进行。缺的只是它的 62 条确定性检查，可以用 taste-skill 的 `inspect.mjs` 部分替代。

## 验证

- `node tools/design-skills/vendor.mjs --check`：4 个目录，共 195 个文件，全部一致。
- `python3 -I scripts/ci/scan_secrets.py`（包括新文件）：通过。
- static 0 错误。被测提交：`5294b8a`（之后的提交只改文档和评审材料）。
- unit 92/92（main 89 + 新 3）。e2e 没有重跑：这次没有改应用代码和测试工具。
- 评审中的 taste-skill 检查器：本机 Chromium（root 环境，用一个只加 `--no-sandbox` 的包装脚本启动），检查的是离线 harness，没有访问外部网络。

**不证明：** 两个技能在 Codex 中能否正确加载（需要 Codex 在自己的环境确认）；评审意见是否正确，这是 AI 的判断，需要用户和学员确认；真实应用的图标和字体效果（harness 使用替代图标和后备字体）。

## 给 Codex

1. 确认 Codex 能从 `.agents/skills/` 加载 `impeccable` 和 `design-taste-frontend`。在交接里写明 Codex 的版本和显示的技能列表。
2. `docs/07_OPEN_SOURCE_AND_NOTICES.md`（Codex 负责）补一行：impeccable、taste-skill 和 modern-screenshot 的许可与用途，引用 `docs/licenses/`。
3. 不要安装 impeccable 的钩子，也不要运行 `npx impeccable install`，除非用户同意。
4. 可选：在 CI 中运行 `node tools/design-skills/vendor.mjs --check`（unit 测试已经覆盖，可以不加）。

## 下一步（需要用户决定）

- 是否允许下载并运行 impeccable 的引擎（免费，开源），用于 62 条确定性检查和编辑后的自动检查。
- 按评审的哪几条改：建议先做 P1 的三条（首页第一屏、反馈页不以分数开头、最小字号和英文标签），分别提 PR。
- 是否转向概念图的视觉方向（暖米色、明朝体标题、场景插画）。
- 确认 `PRODUCT.md` 中标为「待确认」的内容。
