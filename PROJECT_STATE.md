# Care Kotoba 当前进度

> 本文件是当前进度的唯一汇总（AGENTS.md）。2026-10-23 由 Claude 在导入原归档时按共享进度包模板初始化；以下内容只记录已核对的事实。

## 共享定位

| 字段 | 当前记录 |
| --- | --- |
| 共享仓库 URL | https://github.com/1412845026z-jpg/care-kotoba （private，经 GitHub REST API 核对） |
| 集成分支 | `main`（远端默认分支） |
| 本次状态核对的远端代码提交 | `main` = `a79d9be4bc4042e590f8f251db253f33acfd4b08`（导入、同步、CI、内容与ENV证据/部署方案已合并；G0未合并） |
| 核对时间与作者 | 2026-10-23T13:30:02.117Z，Codex（读取GitHub远端固定提交） |
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
| 离线测试（G0-01） | `node tests/run.mjs all`：静态检查 + 33项单元测试 + 20项浏览器 / 语音模拟测试（Claude 沙箱） | `55f0ebb` | 基线 5/20 通过 → 修复后 20/20；单元测试 33/33；模拟环境，不是真实 AI 或真机；CI 尚未运行这些测试（CI-002） |
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
| 新目录 `content/`（场景规格草稿）、`evals/`（固定评测样本） | Codex | 不改 `prototype/lib/content.ts`；接入方式之后约定 |
| `CLAUDE.md`、`AGENTS.md`、本文件的规则部分 | 共享 | 规则修改需用户确认；任务表由执行合并的一方整合 |

## 当前任务

| ID | 任务 | 负责人 | 状态 | 工作分支 / PR | 最近交接与证据 |
| --- | --- | --- | --- | --- | --- |
| SYNC-001 | 导入原归档、合并共享规则、初始化本文件 | Claude | merged | `claude/SYNC-001-import`，[PR #1](https://github.com/1412845026z-jpg/care-kotoba/pull/1) | handoffs/2026-10-23-SYNC-001-claude.md |
| SYNC-002 | Codex 读取 SYNC-001 的同一提交，核对130项源码与导入记录 | Codex | merged | `codex/SYNC-002`，[PR #2](https://github.com/1412845026z-jpg/care-kotoba/pull/2)；合并 `7854c7b` | handoffs/2026-10-23-SYNC-002-codex.md；130/130 一致 |
| G0-01 | 代码审计与基础修复、模拟语音闭环 | Claude | review_ready（等 Codex 真实 dev 复测） | `claude/G0-01-voice-loop`，PR #5（head 见 PR 页面；修复提交 `ca27d8e`） | handoffs/2026-10-23-G0-01-fix1-claude.md：就绪约定、BASE_URL 夹具、TS5.9 static 已修；离线 e2e 20/20、unit 34/34；BASE_URL（独立 harness 服务）local 16 通过+4 跳过、code 19 通过+1 跳过；只有 loopback 的环境下语音模拟无法连接（已复现，属环境限制） |
| CI-001 | GitHub Actions：`pnpm install --frozen-lockfile`、`tsc --noEmit`、`pnpm build`、无密钥扫描；不注入 secret | Codex | merged | `codex/CI-001`，[PR #3](https://github.com/1412845026z-jpg/care-kotoba/pull/3)；合并 `87b6118` | handoffs/2026-10-23-CI-001-results-codex.md；main CI 全绿（run 39954687547） |
| ENV-001 | 真实 dev server、环境变量、Cookie/响应头/sendBeacon | Codex | blocked | PR #7已合并（证据）；G0 PR #5待修复 | handoffs/2026-10-23-ENV-001-codex.md；文件注入与模拟挂断通过，浏览器17失败，Claude 已推送修复（见 G0-01 fix1 交接与复测命令），等 Codex 复测 |
| DEPLOY-001 | 新私有 staging 方案（仅准备） | Codex | merged | PR #7；合并 `a79d9be`，方案已入main | docs/10_LOCAL_ENV_AND_DEPLOY.md；handoffs/2026-10-23-DEPLOY-001-codex.md；未部署，待另行授权 |
| CONTENT-001 | 12场景规格草稿与48条固定评测 | Codex | merged | `codex/CONTENT-001`，PR #6；合并 `e2a4f15` | handoffs/2026-10-23-CONTENT-001-codex.md；结构/引用/CI通过，专业审稿未完成 |
| CI-002 | G0-01 模拟测试工具与CI接入 | Codex | blocked | `codex/CI-002-tooling`（仅依赖准备）；测试接入等G0合并和检查脚本修复 | handoffs/2026-10-23-CI-002-codex.md；esbuild0.28.2/playwright1.63.0；旧锁定包/snapshot不变；尚未启用all命令 |
| DEVICE-001 | 真机语音闭环测试（docs/09） | Claude + 用户 | blocked | — | docs/09_REAL_DEVICE_VOICE_TEST.md；等用户决定预算、密钥配置与staging |
| MODEL-001 | 替代型号的固定样本比较（文字 / 语音 / 转写 / TTS），停用日期前完成 | 待定 | blocked | — | docs/08 #7；`lib/models.ts`；需要用户授权API费用 |

历史开发待办见 `docs/04_BUILD_BACKLOG.md`；以上只列已领取或已安排的任务。

## 已确认的产品决定

| 日期 / 依据 | 决定 | 影响 |
| --- | --- | --- |
| 2026-10-23 归档所记录的用户要求 | 个人版拟在应用商店销售；企业版学习功能相同，增加管理和优惠套餐 | 新版本沿用同一学习核心，企业权限与管理需独立验收 |
| 2026-10-23 归档所记录的用户要求 | 项目需长期推进，开发预算应区别于未来用户运营成本 | 费用报告分开发测试与实际运行；价格假设不能当作已获批准套餐 |
| 2026-10-23 用户（Claude 会话） | Codex 与 Claude 只通过本仓库同步，按环境能力与文件归属分工（见上表） | 冻结文件在负责方分支合并前不由对方修改 |

## 当前阻塞与风险

- G0真实dev server浏览器3/20（17失败）；首次导航点击无效，等待React绑定再点可成功。static与TypeScript5.9.3不兼容。冻结文件由Claude修复后复测，不以构建绿色代替浏览器/真机验收。

- **旧模型停用日期**（OpenAI 官方弃用页，2026-10-23 核对：https://developers.openai.com/api/docs/deprecations）：`gpt-4o-mini-tts` 各快照与 `tts-1` 于 2027-01-06 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4.1-mini-2025-04-14` 于 2027-01-14 停用（建议替代 `gpt-6-luna`）；`gpt-realtime-mini` 于 2027-01-20 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4o-mini-transcribe` 于 2027-02-26 停用（建议替代 `gpt-live-transcribe` 或 `gpt-transcribe`）。原型代码仍写死这些型号。迁移前需用固定样本做真实调用比较，这会产生 API 费用，需用户授权。
- Claude 的云端环境无法访问 npm 仓库，不能运行 `pnpm install`、完整 `tsc` 或 vinext 构建；真实构建结果依赖 CI-001 与 Codex 的环境。
- 真实 AI 与真机语音测试需要：可用的 API 余额、用户自行在部署平台配置的密钥、一个带访问保护的私有 HTTPS 测试环境。三者目前都未就绪（DEVICE-001）。
- G0-01 改了安全默认：没有配置访问码时，AI 接口只在 localhost 可用。部署时必须设置 `CK_ACCESS_CODE`，或者在确有平台访问控制时设置 `CK_ACCESS_POLICY=open`（docs/03 补充段落）。
- 服务端还不能强制结束被遗弃的语音会话，也没有与 OpenAI 用量对账（docs/08 #3，属于 G2）。

## 最近交接

- handoffs/2026-10-23-CI-002-codex.md：仅补齐模拟测试依赖；PR #7已合并，G0修复请求见PR #5 review5628888205。整体CI-002仍blocked。

- handoffs/2026-10-23-ENV-001-codex.md：真实框架/模拟上游的失败记录与下一步。
- handoffs/2026-10-23-DEPLOY-001-codex.md：新私有staging方案与官方价格；没有部署。
- handoffs/2026-10-23-CONTENT-001-codex.md：12场景/48样本由PR #6进入main，专业审稿未完成。

- handoffs/2026-10-23-SYNC-002-codex.md：独立读取 PR #1 @ `7fff8d12e51c8c8f9bdd7193997f94fde6b6d193`，175 个远端 blob 复核，130 项原源码完全一致。此记录不代表 CI 或真实语音已通过。
- handoffs/2026-10-23-SYNC-001-claude.md：原归档导入与共享规则合并；已由 PR #1 以 merge commit 合并 `4118ed1`，原样导入 `77a0604` 保留。
- handoffs/2026-10-23-CI-001-results-codex.md：main CI 真实结果、耗时与完整日志入口。
- handoffs/2026-10-23-G0-01-claude.md：代码审计与基础修复、离线测试、真机测试方案（PR #5，未合并到 `main`）。
- handoffs/2026-10-23-G0-01-fix1-claude.md：按 ENV-001 意见修复，附 Codex 复测命令（PR #5，未合并）。
