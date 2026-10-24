# Care Kotoba 当前进度

> 本文件是当前进度的唯一汇总（AGENTS.md）。2026-10-23 由 Claude 在导入原归档时按共享进度包模板初始化；以下内容只记录已核对的事实。

## 共享定位

| 字段 | 当前记录 |
| --- | --- |
| 共享仓库 URL | https://github.com/1412845026z-jpg/care-kotoba （Public，本轮收尾GitHub REST API private=false；本轮Codex未更改可见性） |
| 集成分支 | `main`（远端默认分支） |
| 本轮核对的业务集成提交 | `68f444ec92736e673047222dce48b950a2dd6c48`（#40固定SHA c663f56复测后按merge commit合并；对应被测树f8a768ee） |
| 核对时间与作者 | 2026-10-24 JST，Codex（#40免费语音固定源ENV/CSP与无API key探测已通过；docs/10免费手机方案及证据已合并PR #41（cecef27）；本补记只改文档状态） |
| 主要开发者 | 按下方「当前分工与文件归属」并行；同一文件同一时间只有一个负责人 |
| 同步接入状态 | 已双向读取：Codex 已独立核对 SYNC-001 @ `7fff8d12e51c8c8f9bdd7193997f94fde6b6d193`；合并状态见任务表 |
| 当前任务状态的唯一依据 | 本文件「当前任务」表 |
| 产品阶段 | 网页/PWA 原型（归档时可构建）；无商店App、无生产账户/数据库/支付 |

## 历史快照，仅供溯源

- 交接归档：`archives/Care_Kotoba_Claude_Handoff_2026-10-23.zip`，SHA-256 `b9aa73109a4b46eda7b7bf76f76b225d3ab940a57d2655f124ad3320eb238f12`，164个文件，已原样解压到仓库根。
- 共享进度包：`archives/Care_Kotoba_Shared_Progress_2026-10-23.zip`，SHA-256 `f9548e16a7aa3bf690cfe716b3847b5851de4d5aba143fdf83dc7d18299666a3`。
- 原 Sites 源码提交：`e643aed9b347cf5e1f157b4878626c6664063534`；130个原始跟踪文件位于 `prototype/`。它不是本仓库的提交，本仓库的新提交不会继承原提交的验证。
- 导入记录与校验入口：`verification/IMPORT_2026-10-23.json`、`tools/verify_import.py`。原 `ARCHIVE_MANIFEST.json` 与 `tools/verify_archive.py` 保持原样；因 CLAUDE.md 按要求追加了 `@AGENTS.md`，在导入后的提交上运行 `verify_archive.py` 会如实报告 CLAUDE.md 不一致，应改用 `verify_import.py`。
- 旧部署仍是独立的私有 Sites 版本；本仓库的更新不代表线上已同步，也不授权覆盖旧站点。

## 验证记录

| 项目 | 证据 | 被测提交 | 结果 |
| --- | --- | --- | --- |
| 两个ZIP完整性 | SHA-256、`zipfile.testzip()`、路径安全（无绝对路径/`..`/符号链接） | 导入前文件 | 通过 |
| 原样导入 | `python3 -I tools/verify_archive.py`（163个清单文件 + 130个原源码） | `77a0604`（claude/SYNC-001-import） | 通过，0错误 |
| 导入后校验 | `python3 -I tools/verify_import.py`（含130个源码的 git blob 比对） | SYNC-001 分支 HEAD，见交接记录 | 见 handoffs/2026-10-23-SYNC-001-claude.md；开发分支上改用 `--allow-changes`，列出有意修改的文件 |
| TypeScript / 生产构建 | [main Actions run 39954687547](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954687547)；Node22.23.3 / pnpm11.25.0 / portable | `87b611863046f8bb0b602aeb1bfb9e1b60396432` | install、tsc、build、离线凭证扫描全部通过；不代表浏览器/真实语音通过 |
| 离线测试（G0-01） | `node tests/run.mjs all`：静态检查 + 单元测试 + 浏览器 / 语音模拟测试（Claude 沙箱） | `55f0ebb` → `2bfe1a0` | 基线 5/20 → 首轮 20/20、unit 33/33 → fix2：unit 34/34、e2e 22/22；模拟环境，不是真实 AI 或真机；该历史阶段CI尚未接入；现已由CI-002接入 |
| 业务合并（G0-01 + REUSE-001） | PR #5、#9 以 merge commit 合并；合并后 main 的 CI；合并树与 Claude 离线测试过的树比较 | `8b55117` | main CI run 39998856202 success（install/tsc/build/数据校验）；main 树 `4d9137f` = 被测 `a242639` 树；离线 static 0 错误、unit 53/53、e2e 25/25（模拟，非真实 AI/真机） |
| 真实构建与 dev（G0-01） | Codex ENV-002：本机 frozen install、tsc、build、static、unit；真实 vinext dev + 本机 mock | `8bc1848` | 全部 exit0，unit 34/34；dev 完整组 11 通过、8 项语音失败（无可用 ICE 候选）、1 跳过；语音未验收 |
| 真实 AI / 语音 | 无成功端到端验收记录 | — | 未验证 |
| 企业账号与数据隔离 | 原型为虚构示例 | — | 未实现 |
| 支付/订阅/真机/负载/备份恢复 | — | — | 未实现、未验证 |

## 当前分工与文件归属（用户 2026-10-23 确认）

依据：用户在 Claude 会话中要求按环境能力分工、仅通过本仓库同步（2026-10-23 20:50–20:59 JST）。Claude 的环境不能安装 npm 依赖，Codex 的环境可以，所以真实构建、CI 与运行环境归 Codex。

| 区域 | 负责人 | 说明 |
| --- | --- | --- |
| `prototype/package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`vite.config.ts`、`next.config.ts`、`tsconfig.json`、`scripts/`、`worker/`、wrangler/Sites 配置、`.github/workflows/` | Codex | Claude 需要依赖时写在交接记录里 |
| `prototype/app/api/**`、`prototype/lib/**`、`prototype/components/**`、`prototype/app/page.tsx`、`prototype/app/layout.tsx`、`prototype/app/globals.css`、`prototype/public/sw.js`、`prototype/tests/**` | Claude | **G0-01 合并前冻结**，Codex 不修改；问题写进交接记录或 PR 评论 |
| `docs/02`、`docs/03`、`docs/06`，新增 `docs/08`、`docs/09` | Claude（本轮） | |
| `docs/01`、`docs/05`、`docs/07`，新增 `docs/10` 起 | Codex | |
| 新目录 `content/`（场景规格草稿）、`evals/`（固定评测样本） | Codex | 不改 `prototype/lib/content.ts`。接入方式（2026-10-24 用户选择预览入口）：`tools/core-scenarios/generate.mjs`（Claude）把 `content/scenarios` 生成为 `prototype/lib/core-scenarios-data.ts` / `-server.ts`。改内容的一方重新运行生成器（必要时也重新生成注音），不手改生成文件 |
| `CLAUDE.md`、`AGENTS.md`、本文件的规则部分 | 共享 | 规则修改需用户确认；任务表由执行合并的一方整合 |

## 当前任务

| ID | 任务 | 负责人 | 状态 | 工作分支 / PR | 最近交接与证据 |
| --- | --- | --- | --- | --- | --- |
| SYNC-001 | 导入原归档、合并共享规则、初始化本文件 | Claude | merged | `claude/SYNC-001-import`，[PR #1](https://github.com/1412845026z-jpg/care-kotoba/pull/1) | handoffs/2026-10-23-SYNC-001-claude.md |
| SYNC-002 | Codex 读取 SYNC-001 的同一提交，核对130项源码与导入记录 | Codex | merged | `codex/SYNC-002`，[PR #2](https://github.com/1412845026z-jpg/care-kotoba/pull/2)；合并 `7854c7b` | handoffs/2026-10-23-SYNC-002-codex.md；130/130 一致 |
| G0-01 | 代码审计与基础修复、模拟语音闭环 | Claude | merged | [PR #5](https://github.com/1412845026z-jpg/care-kotoba/pull/5)，head `a6c6f58`；合并 `0420ff7` | ENV-003（Codex，@`3a3f1a9`）真实install/tsc/build/static、unit34/34、离线22/22、真实dev21通过1跳过；之后的 COOKIE-ENCODING-001 修复（`89d8ad2`）离线 static 0 错误、unit 37/37、e2e 22/22，PR CI run 39998125919 通过。真实AI/真机未验证 |
| CI-001 | GitHub Actions：`pnpm install --frozen-lockfile`、`tsc --noEmit`、`pnpm build`、无密钥扫描；不注入 secret | Codex | merged | `codex/CI-001`，[PR #3](https://github.com/1412845026z-jpg/care-kotoba/pull/3)；合并 `87b6118` | handoffs/2026-10-23-CI-001-results-codex.md；main CI 全绿（run 39954687547） |
| ENV-001 | 真实dev与环境变量/Cookie/响应头/sendBeacon | Codex | merged | 证据PR #7及PR #12，合并 `67fc7ab` | 环境矩阵见docs/10，标准runner补齐模拟语音；真实AI/真机未验证，Cookie测试另列待办 |
| ENV-002 | 复核G0 fix1与REUSE、交接确认的业务问题 | Codex | merged | PR #11；合并 `eada73b` | handoffs/2026-10-23-ENV-002-codex.md；复核证据已入main，不代表真实AI或真机验收 |
| REUSE-001 | 开源 / 免费资料复用：固定文字注音、Realtime 输入排队、来源与许可清单 | Claude | merged | [PR #9](https://github.com/1412845026z-jpg/care-kotoba/pull/9)，head `a242639`；合并 `8b55117`（合并树与被测树 `4d9137f` 相同） | ENV-003（@`5b6146f`）unit50/50、离线25/25、真实dev24通过1跳过；合入 Cookie 修复与 main 后离线 static 0 错误、unit 53/53、e2e 25/25，PR CI run 39998437073 通过。真实OpenAI事件时序未验证 |
| DEPLOY-001 | 新私有 staging 方案（仅准备） | Codex | merged | PR #7；合并 `a79d9be`，方案已入main | docs/10_LOCAL_ENV_AND_DEPLOY.md；handoffs/2026-10-23-DEPLOY-001-codex.md；未部署，待另行授权 |
| CONTENT-001 | 12场景规格草稿与48条固定评测 | Codex | merged | `codex/CONTENT-001`，PR #6；合并 `e2a4f15` | handoffs/2026-10-23-CONTENT-001-codex.md；结构/引用/CI通过，专业审稿未完成 |
| OSS-001 | 公开前检查与Codex for OSS申请 | Codex | blocked | 准备材料PR #10已合并；2026-10-24申请已提交 | 仓库公开，许可证仍未确定；用户确认邮箱与条款后已提交，官方页面确认接收，等待外部审核；尚未获批。未在仓库记录个人邮箱 |
| CI-002 | G0模拟测试接入常规main CI | Codex | merged | PR #32，merge c917a68 | 已在完整业务树通过static0/unit71/e2e40；安装Chromium、600秒超时、循环回环fetch保护已接入常规CI；见handoffs/2026-10-24-CI-002-main-codex.md |
| DEVICE-001 | 付费真机语音闭环（docs/09 T1–T14） | Claude + 用户 | blocked | — | 用户12:54决定先免费；真实API预算/key未授权，T1–T14暂缓，免费F1–F10另列DEVICE-FREE-001 |
| MODEL-001 | 替代型号的固定样本比较（文字 / 语音 / 转写 / TTS），停用日期前完成 | 待定 | blocked | — | docs/08 #7；`lib/models.ts`；需要用户授权API费用 |
| CONTENT-003 | 12场景/34术语/60评测的离线审稿台 | Codex | merged | PR #15；合并 `c65c3e2` | handoffs/2026-10-24-CONTENT-003-codex.md；CI39987425175通过；12项真实浏览器检查通过，390px无溢出；未接入学员端或专业审批 |
| EVAL-002 | 信息来源/核实状态的12条配对反馈评测草稿 | Codex | merged | PR #14；合并 `e65dab6` | handoffs/2026-10-24-EVAL-002-codex.md；CI39985347001通过；无模型调用，专业审稿未完成 |
| ENV-003 | Claude fix2/fix1固定head真实构建与回归复核 | Codex | merged | PR #12；合并 `67fc7ab` | handoffs/2026-10-24-ENV-003-results-codex.md；G0 unit34/34、离线22/22、dev21通过1跳过；REUSE unit50/50、离线25/25、dev24通过1跳过；全部模拟 |
| CI-003 | 标准runner固定head模拟语音复核 | Codex | merged | PR #12；合并 `67fc7ab` | handoffs/2026-10-24-CI-003-results-codex.md及ENV-003；最新run39982127800两job成功；Cookie测试待办保留 |
| CONTENT-002 | 34条术语草稿、12场景关联与资料来源复核 | Codex | merged | PR #13；合并 `37c0fc2` | handoffs/2026-10-24-CONTENT-002-codex.md；CI39980854437通过，尚未专业审稿或接入应用 |
| CONTENT-REVIEW-001 | 用离线审稿台审阅 12 场景/34 术语/60 评测，导出意见 | Claude | merged | [PR #17](https://github.com/1412845026z-jpg/care-kotoba/pull/17)，merge 9088127 | verification/CONTENT-REVIEW-001/：建议修改 6、保留草稿 6；AI 审阅意见，不是专业审批；源数据未改，是否采纳由 Codex 决定 |
| FEEDBACK-GATE-001 | 反馈守门：删去由文字推断的发音评价、标出未修正的语音转写、每个画面的错误边界 | Claude | merged | [PR #18](https://github.com/1412845026z-jpg/care-kotoba/pull/18)，merge 3659709 | handoffs/2026-10-24-FEEDBACK-GATE-001-claude.md；离线 static 0 错误、unit 59/59、e2e 28/28；与 EVAL-002 的可确定门槛一致（发音 12/12、引用 6/6）；真实模型输出未验证 |
| A11Y-001 | 手机可读性：文字对比度达到 WCAG AA、最小字号、点击区域、输入框不触发 iOS 缩放、注音字号、窄屏溢出 | Claude | merged | [PR #19](https://github.com/1412845026z-jpg/care-kotoba/pull/19)，merge 8e0cb8f | verification/A11Y-001/：7 个画面的对比度问题 169→0（装饰符号除外），小于 24px 的点击区域 20→0；unit 59/59、e2e 28/28；真机观感未验证 |
| DEVICE-PREFLIGHT-001 | 免费的「音声テスト」：浏览器支持、服务器与访问码、WebRTC 候选、麦克风音量、扬声器；可保存 JSON，用于 DEVICE-001 之前 | Claude | merged | [PR #20](https://github.com/1412845026z-jpg/care-kotoba/pull/20)，merge 65bf52c | handoffs/2026-10-24-DEVICE-PREFLIGHT-001-claude.md；不调用 AI；unit 61/61、e2e 29/29（Chromium 假设备）；真机未验证 |
| ASR-CONF-001 | 识别置信度（转写 logprobs，`CK_ASR_LOGPROBS=1` 默认关闭）：不确定的句子提示学员确认，反馈不把它当语言错误 | Claude | merged | [PR #21](https://github.com/1412845026z-jpg/care-kotoba/pull/21)，merge a28f592 | handoffs/2026-10-24-ASR-CONF-001-claude.md；unit 67/67、e2e 30/30（模拟 logprobs）；阈值需在 DEVICE-001 T14 校准，真实 API 行为未验证 |
| DRILL-001 | 局部复练：反馈卡上的「この場面だけもう一度」，以对话到该处为上下文只重练一句 | Claude | merged | [PR #22](https://github.com/1412845026z-jpg/care-kotoba/pull/22)，merge def8d99 | handoffs/2026-10-24-DRILL-001-claude.md；unit 68/68、e2e 31/31（模拟 AI）；真实模型回应质量未验证 |
| VOICE-TIMER-001 | 语音练习最后 1 分钟显示倒计时（并用读屏提示），避免到时被突然结束 | Claude | merged | [PR #24](https://github.com/1412845026z-jpg/care-kotoba/pull/24)，merge 5fbbf06 | verification/VOICE-TIMER-001/；unit、e2e 通过（模拟时钟）；真机 T8 待验证 |
| A11Y-002 | 桌面布局的同类修正（侧边栏、右栏卡片的对比度与字号；所有宽度的点击区域）；`openScene` 测试辅助支持桌面布局 | Claude | merged | [PR #25](https://github.com/1412845026z-jpg/care-kotoba/pull/25)，merge b06d889 | verification/A11Y-001/README.md「A11Y-002」：1280px 下 7 个画面的对比度问题、小于 24px 的点击区域都降为 0；unit 69/69、e2e 32/32 |
| SMOKE-001 | 部署后用的接口冒烟脚本（`tools/smoke/api-smoke.mjs`）：默认只测免费接口，加 `--yes` 才调用对话/反馈/TTS | Claude | merged | [PR #26](https://github.com/1412845026z-jpg/care-kotoba/pull/26)，merge c9e6c10 | docs/09「部署后先跑的接口冒烟测试」；e2e 对 harness+mock 验证（不加 --yes 时 0 次 AI 请求、访问码不打印）；未对真实部署运行 |
| AI-FURIGANA-001 | 文字练习中 AI 回复的注音（`CK_AI_FURIGANA=1`，默认关闭）：模型写注音，服务端验证与原文完全一致才显示 | Claude | merged | [PR #27](https://github.com/1412845026z-jpg/care-kotoba/pull/27)，merge 01dff70 | 单元测试和 e2e 用模拟模型验证（错误的注音不显示）；真实模型的读音准确度和增加的输出费用未验证 |
| VOICE-CHECK-LINK-001 | 语音无法开始时，可以从错误提示直接打开免费的音声测试 | Claude | merged | [PR #28](https://github.com/1412845026z-jpg/care-kotoba/pull/28)，merge 0054d06 | e2e（模拟会话失败）通过 |
| LOCAL-DATA-001 | 设置里「この端末の学習データを削除」（两步确认）：删除笔记、记录、设置和访问码 cookie，适合机构里共用的设备 | Claude | merged | [PR #29](https://github.com/1412845026z-jpg/care-kotoba/pull/29)，merge a802321 | e2e 两项通过（本机数据清空；访问码失效） |
| NOTES-EXPORT-001 | 「ことばノート」可书出为文本文件；删除本机数据前的确认里提示先书出 | Claude | merged | [PR #30](https://github.com/1412845026z-jpg/care-kotoba/pull/30)，merge 4381de1 | e2e 通过（下载内容含表达、原来的说法、场景） |
| CONTENT-QA-001 | 术语只读第二道读音核对 | Claude + Codex合并 | merged | PR #23，merge f49f95a | 原CI通过，未改content/ |
| ENV-004 | 最新PR #30标准runner与真实dev复测、顺序合并记录 | Codex | merged | PR #31，merge2e9b5c5；最终证据/状态补记在codex/ENV-004-state | 固定主干4a851fd标准run40052153140：static0/unit71/离线40/真实dev36通过4明确跳过；全部指定PR顺序合并，见ENV-004-final交接 |
| CONTENT-004 | 按CONTENT-REVIEW-001修订场景/术语/评测 | Codex | merged | PR #34，merge4a851fd | 12场景/34术语/84转写+12配对=96评测；字段结构保留；提交后数据已跑生成器与--check（隔离环境），预览/注音接入仍归Claude；见CONTENT-004交接 |
| SEC-001 | docs/08 #16的Worker CSP等响应头 | Codex | merged | PR #33，merge86ebc70 | 完整业务树unit71/离线40/真实dev36通过4有原因跳过，7项CSP/API/注音/麦克风断言及模拟WebRTC通过；见SEC-001交接 |
| CORE-PREVIEW-001 | 默认隐藏的核心场景预览与生成器 | Claude + Codex复测 | merged | PR #35，head a4d7831；merge b038f60 | 独立run40058494059：static0/unit81/offline47/真实dev42通过5注明原因跳过，10项CSP检查通过；CORE-ENV-001交接 |
| CORE-EVAL-001 | 核心草稿的角色检查工具 | Claude + Codex复测 | merged | PR #37，head 2cf1a0e；merge b46bf98 | #35合并后独立run40058975902：static0/unit81/offline50/真实dev42通过8注明原因跳过；10项CSP检查通过，全部mock；dry-run及过期标志词检查0请求；真实服务器上的--yes评测保持blocked |
| CORE-ENV-001 | 核心预览/角色检查工具的独立ENV验收与合并证据 | Codex | merged | codex/CORE-ENV-001，PR #38；merge0901ddc | #35→#37顺序合并，证据/验证工具已进main；固定源两轮、最终证据CI/安全/固定源复测全通过；无新依赖/付费API/部署 |
| FREE-VOICE-001 | 免费真机测试方案与浏览器语音输入 | Claude + Codex复测 | merged | PR #40，head c663f56；merge68f444e | 独立run40063459564：static0/unit89/offline54/真实dev46通过8跳过，14项CSP检查及无API key探测通过；真实识别/可听朗读待F5/F6 |
| FREE-VOICE-ENV-001 | #40复测、免费手机A/C方案与证据整合 | Codex | merged | codex/FREE-VOICE-ENV-001，PR #41；mergececef27 | #40已合并，docs/10和证据/验证工具已进main；最终常规CI/安全/固定源均通过；无依赖/付费API/部署 |
| DEVICE-FREE-001 | 实际手机免费F1–F10（A/B可开始，C仅方案） | 用户 + Claude整理 + Codex支持 | queued | — | 无API key；记录Android/iPhone型号、浏览器与JSON。C需另行授权部署，Free容量/实际声音均未在真机或云端验收 |
| REVIEW-001 | 「ことばノート」间隔复习（ts-fsrs，MIT） | Claude（功能）+ Codex（依赖） | queued：先确认交互，再加入稳定版依赖 | — | research/REUSE_REVIEW_2026-10-23.md |
| AUDIO-001 | 固定参考句预生成音频（不再依赖在线 TTS，避开 2027-01-06 停用） | 待定 | blocked：等用户选择声音和方式（OpenAI 一次性生成 / VOICEVOX / Kokoro） | — | research/REUSE_REVIEW_2026-10-23.md |

历史开发待办见 `docs/04_BUILD_BACKLOG.md`；以上只列已领取或已安排的任务。

## 已确认的产品决定

| 日期 / 依据 | 决定 | 影响 |
| --- | --- | --- |
| 2026-10-23 归档所记录的用户要求 | 个人版拟在应用商店销售；企业版学习功能相同，增加管理和优惠套餐 | 新版本沿用同一学习核心，企业权限与管理需独立验收 |
| 2026-10-23 归档所记录的用户要求 | 项目需长期推进，开发预算应区别于未来用户运营成本 | 费用报告分开发测试与实际运行；价格假设不能当作已获批准套餐 |
| 2026-10-23 最新用户要求 | 先继续Care Kotoba开发，重新审核Claude整理后的仓库并提供转交反馈 | 本轮暂停公开/申请；不修改可见性，聚焦固定版本复测和缺陷交接 |
| 2026-10-23 用户本轮要求 | 尝试将仓库公开，以个人维护者申请Codex for Open Source；取代先前保持private的偏好 | 目前完成公开前准备；可见性变更、许可证与申请提交分别记录，不意味着获批或部署授权 |
| 2026-10-23 用户（Claude 会话） | Codex 与 Claude 只通过本仓库同步，按环境能力与文件归属分工（见上表） | 冻结文件在负责方分支合并前不由对方修改 |
| 2026-10-24 12:54 用户（Claude 会话）：「真机测试……能用免费的就用免费，需要付费的先往后靠」 | 真机测试先做不花钱的部分（docs/09「先做免费的真机测试」F1–F10）；真实 AI / Realtime / TTS 等付费测试（T1–T14、角色检查 `--yes`、MODEL-001）往后放，等用户另行授权 | 免费部署方式 C 仍需用户授权部署；浏览器语音识别由浏览器提供商处理声音，需告知并取得同意 |
| 2026-10-24 用户（Claude 会话）：「我先做可选的预览入口（推荐）」 | 12 个核心场景先作为「コア練習（草稿）」单独入口接进应用，默认隐藏，原有 48 个场景不动；GPT 同时按审阅意见修改内容 | 草稿不计入 48 场景进度；正式替换或合并原场景需另行决定，并需要专业审稿 |
| 2026-10-23 用户（Claude 会话）：「可以复用的就以合适方式拿过来并共享」 | 开源 / 免费资料按 research/REUSE_REVIEW_2026-10-23.md 处理；注音默认开启（Claude 的默认设定，可在设置中关闭，待教师和用户反馈） | 新增依赖仍由 Codex 加入；内容类资料由 Codex 负责 |

### 2026-10-24 后续内容修改要求（用户本轮指令）

- 改 `content/scenarios` 后先跑核心生成器，再重生注音并运行两个 `--check`；逐句检查机器读音，重点为夜中、一回、二人、後。改隐藏信息后还要不加 `--yes` 跑角色检查工具，检查过期标志词。
- `hidden_information[].leak_markers_ja` 结构提案已按最新用户指令暂缓，不实施，当前字段结构未改。

## 当前阻塞与风险

- 免费阶段之外的真实T1–T14、真实core-roleplay-check --yes、MODEL-001及付费托管均为blocked，不自动配置key、充值或升级。免费C也只做方案，部署仍待单独授权。

- ENV-004复测新head c3632f5通过（标准runner40050738078：static0、unit71、离线40、真实dev36通过4明确跳过）。指定业务链已全部合并；此前开发浮层失败是历史证据。真实AI/真机仍未验证。

- 指定业务链、CI-002、CONTENT-004和SEC-001均已合并。常规CI已接入static/unit/模拟浏览器；固定主干4a851fd通过完整复测。真实AI、真实事件顺序、真机、服务端强制时长与用量对账仍未验证。

- **旧模型停用日期**（OpenAI 官方弃用页，2026-10-23 核对：https://developers.openai.com/api/docs/deprecations）：`gpt-4o-mini-tts` 各快照与 `tts-1` 于 2027-01-06 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4.1-mini-2025-04-14` 于 2027-01-14 停用（建议替代 `gpt-6-luna`）；`gpt-realtime-mini` 于 2027-01-20 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4o-mini-transcribe` 于 2027-02-26 停用（建议替代 `gpt-live-transcribe` 或 `gpt-transcribe`）。原型代码仍写死这些型号。迁移前需用固定样本做真实调用比较，这会产生 API 费用，需用户授权。
- Claude 的云端环境无法访问 npm 仓库，不能运行 `pnpm install`、完整 `tsc` 或 vinext 构建；真实构建结果依赖 CI-001 与 Codex 的环境。
- 下述条件仅针对付费AI闭环；免费F1–F10不需要API余额，见DEVICE-FREE-001。真实 AI 与付费真机语音测试需要：可用的 API 余额、用户自行在部署平台配置的密钥、一个带访问保护的私有 HTTPS 测试环境。三者目前都未就绪（DEVICE-001）。
- G0-01 改了安全默认：没有配置访问码时，AI 接口只在 localhost 可用。部署时必须设置 `CK_ACCESS_CODE`，或者在确有平台访问控制时设置 `CK_ACCESS_POLICY=open`（docs/03 补充段落）。
- 服务端还不能强制结束被遗弃的语音会话，也没有与 OpenAI 用量对账（docs/08 #3，属于 G2）。

## 最近交接

- handoffs/2026-10-24-FREE-VOICE-ENV-001-codex.md：#40固定SHA验收、14项CSP/免费功能检查、无API key探测、Windows/Mac USB与Free私有staging方案及当前限制。

- handoffs/2026-10-24-FREE-VOICE-001-claude.md：免费真机测试路径（F1–F10）与「声で入力」；付费测试往后放。

- handoffs/2026-10-24-CORE-ENV-001-codex.md：#35/#37独立复测与顺序合并、10项CSP检查、角色工具0请求dry-run/过期标志词检查、后续内容生成/注音要求。

- handoffs/2026-10-24-CORE-EVAL-001-claude.md：核心草稿的角色检查工具（真实模型运行前的准备，需授权费用才运行）。

- handoffs/2026-10-24-CORE-PREVIEW-001-claude.md：核心场景草稿的可选预览入口（默认隐藏）、生成器、草稿用的 AI 指示；已吸收含 CONTENT-004 的 main 并重新生成。

- handoffs/2026-10-24-ENV-004-final-codex.md：本轮最终汇总、合并顺序、主干与待Claude的预览/注音接续。旧失败证据保留，已被c3632f5通过结果替代。

- handoffs/2026-10-24-ROUND-0243-claude.md：本轮（02:43 之后）所有 Claude PR 的汇总、合并顺序与给 Codex/用户的下一步。

- handoffs/2026-10-24-DRILL-001-claude.md：反馈卡上的局部复练（只重练一句）。

- handoffs/2026-10-24-ASR-CONF-001-claude.md：可选的识别置信度（默认关闭），真机 T14 校准阈值后再决定是否开启。

- handoffs/2026-10-24-DEVICE-PREFLIGHT-001-claude.md：设置里的免费音声测试，真机测试前先用它排除麦克风/扬声器/网络问题。

- handoffs/2026-10-24-A11Y-001-claude.md：手机可读性层（对比度、字号、点击区域、iOS 输入缩放、注音字号、360px 溢出），可整体回退。

- handoffs/2026-10-24-FEEDBACK-GATE-001-claude.md：文字反馈中的发音评价会被删去；未修正的语音转写在纠正卡上标明；标签页/练习界面各自的错误边界。

- handoffs/2026-10-24-MERGE-001-claude.md：COOKIE-ENCODING-001 修复、吸收 main、合并 PR #5/#9、内容审阅意见；CI-002 交回 Codex。

- handoffs/2026-10-24-REUSE-001-fix1-claude.md：按 ENV-002 修复 response.create 确认前的竞态和注音字典原型属性；附反向验证与 Codex 脚本结果。

- handoffs/2026-10-24-G0-01-fix2-claude.md：按 ENV-002 修复 e2e setup 失败不清理；测试组硬超时；--filter 只启动相关文件。

- handoffs/2026-10-24-STOP-0150-codex.md：本轮统一交接、已合并工作、固定被测SHA、Cookie测试待办与Claude接续顺序；用户指定01:50 JST停止执行。

- handoffs/2026-10-24-CONTENT-003-codex.md：可离线打开的审稿页、按资料版本保存和导出意见；不改变正式内容。

- handoffs/2026-10-24-EVAL-002-codex.md：12条配对评测草稿，分别检查来源、确认状态、范围、拒绝与转写不确定；无模型调用。

- handoffs/2026-10-24-ENV-003-results-codex.md：新Claude修复提交的真实构建、独立诊断与标准runner全部模拟组成功；保留Cookie测试待办。

- handoffs/2026-10-24-CONTENT-002-codex.md：34条术语、12场景关联；教材PDF第三方权利状态保留未确认，未复制定义或图像。
- PR #12 / CI-003：已运行标准runner；Cookie末尾字符变更可能保留相同签名字节，需Claude修测试，不能描述为已证实未授权访问。

- handoffs/2026-10-23-ENV-002-codex.md：新G0/REUSE真实复测结果、两项业务缺陷与测试清理建议；公开/申请暂停。

- handoffs/2026-10-23-OSS-001-codex.md：用户要求尝试公开并申请；已准备历史检查与真实申请草稿，尚未执行公开或提交表单。

- handoffs/2026-10-23-CI-002-codex.md：仅补齐模拟测试依赖；PR #7已合并，G0修复请求见PR #5 review5628888205。整体CI-002仍blocked。

- handoffs/2026-10-23-ENV-001-codex.md：真实框架/模拟上游的失败记录与下一步。
- handoffs/2026-10-23-DEPLOY-001-codex.md：新私有staging方案与官方价格；没有部署。
- handoffs/2026-10-23-CONTENT-001-codex.md：12场景/48样本由PR #6进入main，专业审稿未完成。

- handoffs/2026-10-23-SYNC-002-codex.md：独立读取 PR #1 @ `7fff8d12e51c8c8f9bdd7193997f94fde6b6d193`，175 个远端 blob 复核，130 项原源码完全一致。此记录不代表 CI 或真实语音已通过。
- handoffs/2026-10-23-SYNC-001-claude.md：原归档导入与共享规则合并；已由 PR #1 以 merge commit 合并 `4118ed1`，原样导入 `77a0604` 保留。
- handoffs/2026-10-23-CI-001-results-codex.md：main CI 真实结果、耗时与完整日志入口。
- handoffs/2026-10-23-G0-01-claude.md：代码审计与基础修复、离线测试、真机测试方案（PR #5，未合并到 `main`）。
- handoffs/2026-10-23-G0-01-fix1-claude.md：按 ENV-001 意见修复，附 Codex 复测命令（PR #5，未合并）。
- handoffs/2026-10-23-REUSE-001-claude.md：开源 / 免费资料复用（依赖 PR #5，未合并）。
