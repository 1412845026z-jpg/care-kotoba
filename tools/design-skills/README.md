# 设计评审技能：impeccable 与 taste-skill（2026-10-24 用户要求接入）

用户要求接入这两个 GitHub 项目，方便以后对整个产品的视觉传达和审美做更专业的评价与把控。两份技能都原样放进了仓库，Claude Code 和 Codex 都能读到：

| 技能 | 来源（固定提交） | 许可 | Claude Code | Codex |
| --- | --- | --- | --- | --- |
| impeccable 4.7.1 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0（另含 MIT 的 modern-screenshot、ios/android 参考的 MIT 来源） | `.claude/skills/impeccable/` | `.agents/skills/impeccable/` |
| design-taste-frontend（taste-skill 2.1.4） | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | MIT | `.claude/skills/design-taste-frontend/` | `.agents/skills/design-taste-frontend/` |

- 每个文件的来源提交和 SHA-256 记在 `manifest.json`。
- 许可原文在 `docs/licenses/`（`IMPECCABLE_LICENSE-2.0.txt`、`IMPECCABLE_NOTICE.md`、`TASTE_SKILL_LICENSE.txt`、`MODERN_SCREENSHOT_LICENSE.txt`）。
- 这些文件不在本仓库里编辑。要升级时运行 `node tools/design-skills/vendor.mjs --impeccable <checkout> --taste <checkout>`；`--check` 检查文件是否被改动（unit 测试也会运行）。

## 用来做什么

| 想做的事 | 用哪个 | 说明 |
| --- | --- | --- |
| 整体的 UX 和视觉评审（层级、清晰度、情感） | impeccable `critique` | 按 `reference/critique.md` 打分并列出问题 |
| 技术质量（无障碍、性能、响应式） | impeccable `audit` | 与本仓库的 `verification/A11Y-001/audit.mjs` 互补 |
| 上线前的细节检查 | impeccable `polish` | 只改范围内的问题 |
| 记录或更新设计系统 | impeccable `document`（写 `DESIGN.md`） | 改了 `globals.css` 的颜色、字号、圆角、组件后同步更新 |
| 产品事实 | impeccable `init`（写 `PRODUCT.md`） | 产品事实变化时更新 |
| 浏览器实测的确定性检查 | taste-skill `scripts/inspect.mjs --app` | 不依赖其他包，用本机的 Chrome/Chromium，在 1440/768/390 三种宽度截图并按 app 规则判定。本应用是 Operate（app screen）类型，所以加 `--app` |
| app 画面的设计规则 | taste-skill `references/app-screens.md`、`references/critique.md` | 评审时的参照 |

两个技能都会先读仓库根目录的 `PRODUCT.md`（产品事实）和 `DESIGN.md`（当前的视觉系统）。这两个文件在 DESIGN-SKILLS-001 中写成，是以后评审和改动的共同依据。

## 本项目的使用规则

1. **产品约束优先于技能的审美偏好。** 以下几点不能为了好看而牺牲：
   - 手机优先；
   - 文字对比度达到 WCAG AA，点击区域至少 24px（A11Y-001/002）；
   - 注音可读；
   - 对外国介护职员使用平易、尊重、不催促的语气；
   - 所有场景都是虚构的；
   - 不显示能力认证类的分数。

   技能的建议与这些冲突时，按本项目的规则做，并在评审报告里写明。
2. **先评审，后改动。** 评审结论写进 `verification/` 或交接记录。视觉改动走单独的 PR，附截图和可读性检查（`verification/A11Y-001/audit.mjs`，390px 和 1280px），不在评审 PR 里顺手改界面。
3. **没有用户同意时，不做这些事：**
   - 运行 impeccable 的 launcher（`scripts/impeccable`）。它会下载并运行引擎二进制。按 SKILL.md 的 “Launcher unavailable” 流程直接读 `PRODUCT.md` 和 `DESIGN.md` 即可；
   - 安装 impeccable 的编辑钩子（每次编辑后自动运行引擎）；
   - `npx impeccable install`；
   - 用 taste-skill 的 `assets.mjs` 下载外部图片放进产品（需要另外确认图片许可和署名）。
   
   taste-skill 的 `inspect.mjs`、`lint.mjs` 只在本机运行，不访问外部网络，可以用。
4. **不改技能本身。** 要调整规则，写进本文件或 `DESIGN.md`。
5. **评审是参考意见。** AI 的审美评价不能代替用户和真实学员的判断。重要的方向选择（例如是否改用概念图的米色与明朝体标题）由用户决定。

## 怎么运行确定性检查（不花钱）

```sh
# 先启动应用：离线 harness（不需要 API 密钥）或开发服务器。以 harness 为例（另开一个终端）：
cd prototype && PORT=5180 node tests/harness/server.mjs        # 显示 harness ready: http://127.0.0.1:5180
# 再在仓库根目录运行（CHROME_PATH 指向本机的 Chrome/Chromium；找得到时可省略）：
CHROME_PATH=/path/to/chrome node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://127.0.0.1:5180/ --app --widths 1440,768,390 --out verification/<任务>/inspect
```

结果在 `--out` 目录：`report.json` 和三种宽度的截图。FAIL 表示没有达到 taste-skill 的 app 规则，但并不都要照改，判断时以上面的第 1 条为准。
