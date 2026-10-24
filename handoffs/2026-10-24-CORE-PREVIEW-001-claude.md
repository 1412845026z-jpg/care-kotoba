# CORE-PREVIEW-001｜核心场景草稿的可选预览入口（Claude，2026-10-24）

- 用户决定（2026-10-24 08:23 之后，Claude 会话）：「我先做可选的预览入口（推荐）」，即作为「コア練習（草稿）」单独入口接进 App，默认隐藏，原有 48 个场景不动；GPT 同时按审阅意见修改内容。
- 分支：`claude/CORE-PREVIEW-001`，基于链条顶端 `claude/NOTES-EXPORT-001`（PR #30 head `621dec7`）。需要在 #30 之后合并。
- 被测提交：代码 `65824d7`（之后的提交只改文档）。
- 没有改依赖、锁文件、CI、部署配置，也没有改 `content/`（只读）。没有调用付费 API，没有部署。

## 做了什么

| 部分 | 文件 | 说明 |
| --- | --- | --- |
| 生成器 | `tools/core-scenarios/generate.mjs`、`README.md` | 从 `content/scenarios/CK-*.json` 生成两份文件，带 `--check`。字段缺失或分支引用错误时不写文件并列出问题。「学員」在浏览器端显示为「あなた」，每次运行报告替换次数（目前 6 处）。 |
| 生成结果 | `prototype/lib/core-scenarios-data.ts`（浏览器）、`prototype/lib/core-scenarios-server.ts`（只在服务端） | 隐藏信息、分支、反例、反馈规则、迁移题只在 server 文件里。unit 测试和 e2e 测试都确认它们不在浏览器端的数据和 harness bundle 里。 |
| 场景映射 | `prototype/lib/core-scenarios.ts` | 转成 `Scene`（分类 `core`）。角色映射：先輩介護職→先輩スタッフ，看護師→看護スタッフ，リーダー→リーダー，利用者→「利用者さん」（草稿没有名字，应用也不补名字）。`findScene` / `findCategory` / `isBaseScene` 同时查两套场景。 |
| AI 指示 | `prototype/lib/core-prompt.ts`、`lib/ai-server.ts`、`app/api/feedback/route.ts` | 草稿场景不使用 4 种会话模式，改用草稿自己的指示，见下一节。 |
| 界面 | `app/page.tsx`、`components/ui.tsx`、`components/practice.tsx`、`app/globals.css`、`lib/storage.ts`、`lib/content.ts` | 见再下一节。 |
| 注音 | `tools/furigana/generate.mjs`、`overrides.json`、`lib/furigana-data.ts` | 新增草稿的 100 句（318→418）。机器读音人工核对后改了 8 句：原話 げんわ，後 あと，夜中 よなか，二人 ふたり，一回 いっかい，全夜 ぜんや。 |
| 测试 | `tests/unit/core-scenarios.test.mjs`（9 项）、`tests/e2e/core-preview.e2e.mjs`（6 项）、`voice.e2e.mjs` 新增 1 项、`helpers.mjs` 新增 `openCoreScene` | 另修了 `tests/run.mjs --filter` 的一个漏洞：只在注释里匹配的过滤词仍会挂起（node 22 的 hook 竞争），现在改为按测试名选择文件。 |
| 可读性检查 | `verification/A11Y-001/audit.mjs` | 新增 3 个画面：首页入口、草稿列表、草稿说明。390px 和 1280px 下对比度问题和小于 24px 的点击区域都是 0。 |

### 草稿场景的 AI 指示

1. 角色知道隐藏信息，但只有学员的发话符合「揭示」分支时才说出；揭示之前不暗示、不确认，也不放进建议和纠正里。场景没有设定的原因、诊断、时间、数量一律不补造。
2. 分支的参考回复只提供意思，角色用自己的话说。下面两条护栏优先于参考回复：
   - 不用教练口吻，提示放到对话后的反馈里。这是因为 C 组 B2「依頼の内容をもう一度確認しましょう…」是教练口吻（CONTENT-REVIEW-001 第 3 条）。
   - 学员请求放慢或重说时，真的放慢并分段（第 4 条）。
3. 按技能补充：
   - 问清：只答应或自行补出细节时，不确认这些猜测；
   - 尊重拒绝：接受拒绝就算成功，不要求问出理由；受到施压（包括软性施压）时继续礼貌地拒绝；不施压的「之后再来」可以接受；
   - 报告：不提供原因、诊断、趋势或照护判断。
4. 反馈会收到场景的反馈规则、反例（只用来识别类似发话，不推荐）、例句，并且被要求：对话里没有揭示的隐藏信息，不能要求学员知道。
5. 语音会话沿用同一份指示。开场白写成「Opening line (your first utterance…)」，所以 session 追加的「最初の発話（Opening line）を一度だけ話して」仍然有效（voice e2e 已验证）。

这些护栏只是运行时的补救，内容本身仍需 GPT 修改（见下文）。真实模型会不会遵守，还没有验证。

### 界面

- 默认隐藏。打开方式有两种：「設定」→「コア練習（草稿）」→「シーン一覧に表示する（審稿前の草稿）」；或打开 `/?core=1`。设置保存在本机。
- 打开后：
  - 首页在「働く場面から探す」下面多一个虚线框入口；
  - 场景页多一个「コア練習（草稿）12」标签，列表上方显示审稿前的说明（日文加辅助语言）；
  - 卡片贴纸显示「草稿」；
  - 「すべて」和库的统计仍然是 48 个场景、144 个参考表现。
- 草稿的说明弹窗不显示会话模式，改为显示「草稿 v0.1.0 · 技能」和审稿前提示。
- 学习记录：草稿的练习进入历史，但不计入「練習したシーン / 48」，也不计入各分野的 n/6。笔记和历史在预览关闭后也能找到草稿场景。
- 服务端不检查预览开关（它只是界面选项），任何场景 id 都能调用。这一点和原有场景相同，都受访问码和限流保护。

## 验证

被测提交：`65824d7`（Claude 沙箱：Node v22.22.0、Chromium 153 headless、Playwright 1.63.0、esbuild 0.28.2；AI 和 Realtime 对端都是模拟的）。

| 命令 | 结果 |
| --- | --- |
| `node tools/core-scenarios/generate.mjs --check` | up to date，12 个场景，sha256 `c57be454b6246781` |
| `node tools/furigana/generate.mjs --kuromoji <dir> --check` | up to date（418 句） |
| `cd prototype && CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules node tests/run.mjs all` | static 0 错误；unit 80/80（原 71 + 新 9）；e2e 47/47（原 40 + 新 7），e2e 用时 160s |
| `node ../verification/A11Y-001/audit.mjs`（390px 和 `CK_AUDIT_VIEWPORT=1280x860`） | 10 个画面，对比度问题 0，小于 24px 的点击区域 0，无横向溢出 |

之后的 `86bb4a9`：多行的草稿回复（CONTENT-004 的 B3 改成了分行）在指示里合成一行引用。重新运行 static 0、unit 81/81、与草稿相关的 e2e 7/7。这次只改了指示文字的格式，没有重跑全部 e2e。GitHub CI（install/tsc/build）在 `c3632f5` 和 `dc5b7e6` 上都通过。

**不证明：**

- 真实模型是否遵守隐藏信息和不施压的规则；
- 草稿的教学效果和日语自然度；
- vinext 的真实构建和 dev（Claude 环境不能安装依赖，要靠 CI 和 Codex 复测）。

## 另：ENV-004 的两项失败已修正（提交在 #30 分支）

Codex ENV-004（run 40048821852，真实 vinext dev）中两个故意制造崩溃的测试失败：错误边界已经接住错误后，vinext 的开发用错误覆盖层 `#__vinext_dev_error_overlay_root` 仍盖住页面并拦截点击。

- 修正提交：`c3632f5`，在 `claude/NOTES-EXPORT-001` 上，PR #30 的新 head。
- 做法：这两个测试检查的是我们自己的错误边界（生产构建中学员看到的界面），所以测试里用只作用于测试的样式隐藏开发覆盖层。在 harness 里会插入一个和 vinext 相同的全屏元素，证明隐藏有效。
- 对照：不隐藏时，harness 中重现了与 ENV-004 完全相同的 `intercepts pointer events` 失败；隐藏后通过。
- 真实 dev 中如果出现覆盖层，日志会输出一行说明。
- `c3632f5` 上的离线结果：static 0，unit 71/71，e2e 40/40。真实 dev 需要 Codex 用新 head 重新运行 ENV-004，Claude 环境不能运行 vinext。
- 本分支已经合并 `c3632f5`（merge `5113de4`）。在 `5113de4` 上重新运行全部离线测试：static 0，unit 80/80，e2e 47/47。

## 给 Codex / GPT

1. 合并顺序：本 PR 依赖 #30，排在链条最后。
2. 修改 `content/scenarios` 后，先运行 `node tools/core-scenarios/generate.mjs`。如果标题、场景、开场白、目标或例句变了，还要重新生成注音（tools/furigana/README.md）。否则 unit 测试会失败，并列出缺少注音的句子。可以重新运行生成器，但不要手改生成的文件。
3. 内容建议，在 CONTENT-REVIEW-001 之外新增两条：
   - 「学員」→「学習者」或第二人称；
   - P01 标题的「原話」不是自然的日语，建议改为「本人の言葉のまま」。
4. 新增角色时，告诉 Claude 在 `coreCasts` 加映射，或在交接里写明。

## 下一步（可执行）

- GPT 改完内容并合并后，Claude 重新生成，再看一遍草稿画面。
- 用户授权 API 费用以后（MODEL-001），用固定样本检查真实模型：隐藏信息有没有提前泄露，施压时会不会让步。这些检查可以写进 `evals/`，由 Codex 负责。
