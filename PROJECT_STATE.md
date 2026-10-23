# Care Kotoba 当前进度

> 本文件是当前进度的唯一汇总（AGENTS.md）。2026-10-23 由 Claude 在导入原归档时按共享进度包模板初始化；以下内容只记录已核对的事实。

## 共享定位

| 字段 | 当前记录 |
| --- | --- |
| 共享仓库 URL | https://github.com/1412845026z-jpg/care-kotoba （Public，本轮收尾GitHub REST API private=false；本轮Codex未更改可见性） |
| 集成分支 | `main`（远端默认分支） |
| 本次状态核对的远端代码提交 | `main` = `c65c3e2a93ce1a790113bf831a31b1a4e1ff479e`（审稿台PR #15已合并；业务PR #5/#9未合并） |
| 核对时间与作者 | 2026-10-24T01:35:14+09:00，Codex（最终同步快照；用户要求01:50 JST停止本轮） |
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
| 导入后校验 | `python3 -I tools/verify_import.py`（含130个源码的 git blob 比对） | SYNC-001 分支 HEAD，见交接记录 | 见 handoffs/2026-10-23-SYNC-001-claude.md |
| TypeScript / 生产构建 | [main Actions run 39954687547](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954687547)；Node22.23.3 / pnpm11.25.0 / portable | `87b611863046f8bb0b602aeb1bfb9e1b60396432` | install、tsc、build、离线凭证扫描全部通过；不代表浏览器/真实语音通过 |
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
| G0-01 | 代码审计与基础修复、模拟语音闭环 | Claude | review_ready | PR #5 @ `3a3f1a9`，未合并 | ENV-003新head：真实install/tsc/build/static通过、unit34/34、离线模拟22/22、真实dev21通过1跳过；Cookie测试约定待修，真实AI/真机未验证 |
| CI-001 | GitHub Actions：`pnpm install --frozen-lockfile`、`tsc --noEmit`、`pnpm build`、无密钥扫描；不注入 secret | Codex | merged | `codex/CI-001`，[PR #3](https://github.com/1412845026z-jpg/care-kotoba/pull/3)；合并 `87b6118` | handoffs/2026-10-23-CI-001-results-codex.md；main CI 全绿（run 39954687547） |
| ENV-001 | 真实dev与环境变量/Cookie/响应头/sendBeacon | Codex | merged | 证据PR #7及PR #12，合并 `67fc7ab` | 环境矩阵见docs/10，标准runner补齐模拟语音；真实AI/真机未验证，Cookie测试另列待办 |
| ENV-002 | 复核G0 fix1与REUSE、交接确认的业务问题 | Codex | merged | PR #11；合并 `eada73b` | handoffs/2026-10-23-ENV-002-codex.md；复核证据已入main，不代表真实AI或真机验收 |
| REUSE-001 | 固定文字注音与Realtime输入排队 | Claude | review_ready | PR #9 @ `5b6146f`，依赖PR #5、未合并 | ENV-003确认旧竞争与笔记崩溃修复；unit50/50、离线模拟25/25、真实dev24通过1跳过；真实OpenAI事件时序仍待验 |
| DEPLOY-001 | 新私有 staging 方案（仅准备） | Codex | merged | PR #7；合并 `a79d9be`，方案已入main | docs/10_LOCAL_ENV_AND_DEPLOY.md；handoffs/2026-10-23-DEPLOY-001-codex.md；未部署，待另行授权 |
| CONTENT-001 | 12场景规格草稿与48条固定评测 | Codex | merged | `codex/CONTENT-001`，PR #6；合并 `e2a4f15` | handoffs/2026-10-23-CONTENT-001-codex.md；结构/引用/CI通过，专业审稿未完成 |
| OSS-001 | 公开前检查与Codex for OSS申请准备 | Codex | blocked | 准备材料PR #10已合并；申请暂停 | 当前REST private=false，已公开；本轮Codex未改设置，变更执行者未核实；许可证未定、表单未提交 |
| CI-002 | G0模拟测试接入常规main CI | Codex | blocked | 工具与独立验证已由PR #8/#12合并；常规接入等业务PR #5合并 | ENV-003已验证fixed-head全套模拟；Cookie确定性测试待Claude修正，业务合并后由Codex接入 |
| DEVICE-001 | 真机语音闭环测试（docs/09） | Claude + 用户 | blocked | — | docs/09_REAL_DEVICE_VOICE_TEST.md；等用户决定预算、密钥配置与staging |
| MODEL-001 | 替代型号的固定样本比较（文字 / 语音 / 转写 / TTS），停用日期前完成 | 待定 | blocked | — | docs/08 #7；`lib/models.ts`；需要用户授权API费用 |
| CONTENT-003 | 12场景/34术语/60评测的离线审稿台 | Codex | merged | PR #15；合并 `c65c3e2` | handoffs/2026-10-24-CONTENT-003-codex.md；CI39987425175通过；12项真实浏览器检查通过，390px无溢出；未接入学员端或专业审批 |
| EVAL-002 | 信息来源/核实状态的12条配对反馈评测草稿 | Codex | merged | PR #14；合并 `e65dab6` | handoffs/2026-10-24-EVAL-002-codex.md；CI39985347001通过；无模型调用，专业审稿未完成 |
| ENV-003 | Claude fix2/fix1固定head真实构建与回归复核 | Codex | merged | PR #12；合并 `67fc7ab` | handoffs/2026-10-24-ENV-003-results-codex.md；G0 unit34/34、离线22/22、dev21通过1跳过；REUSE unit50/50、离线25/25、dev24通过1跳过；全部模拟 |
| CI-003 | 标准runner固定head模拟语音复核 | Codex | merged | PR #12；合并 `67fc7ab` | handoffs/2026-10-24-CI-003-results-codex.md及ENV-003；最新run39982127800两job成功；Cookie测试待办保留 |
| CONTENT-002 | 34条术语草稿、12场景关联与资料来源复核 | Codex | merged | PR #13；合并 `37c0fc2` | handoffs/2026-10-24-CONTENT-002-codex.md；CI39980854437通过，尚未专业审稿或接入应用 |

历史开发待办见 `docs/04_BUILD_BACKLOG.md`；以上只列已领取或已安排的任务。

## 已确认的产品决定

| 日期 / 依据 | 决定 | 影响 |
| --- | --- | --- |
| 2026-10-23 归档所记录的用户要求 | 个人版拟在应用商店销售；企业版学习功能相同，增加管理和优惠套餐 | 新版本沿用同一学习核心，企业权限与管理需独立验收 |
| 2026-10-23 归档所记录的用户要求 | 项目需长期推进，开发预算应区别于未来用户运营成本 | 费用报告分开发测试与实际运行；价格假设不能当作已获批准套餐 |
| 2026-10-23 最新用户要求 | 先继续Care Kotoba开发，重新审核Claude整理后的仓库并提供转交反馈 | 本轮暂停公开/申请；不修改可见性，聚焦固定版本复测和缺陷交接 |
| 2026-10-23 用户本轮要求 | 尝试将仓库公开，以个人维护者申请Codex for Open Source；取代先前保持private的偏好 | 目前完成公开前准备；可见性变更、许可证与申请提交分别记录，不意味着获批或部署授权 |
| 2026-10-23 用户（Claude 会话） | Codex 与 Claude 只通过本仓库同步，按环境能力与文件归属分工（见上表） | 冻结文件在负责方分支合并前不由对方修改 |

## 当前阻塞与风险

- ENV-003已复核G0 `3a3f1a9`与REUSE `5b6146f`：旧竞态与笔记崩溃在独立诊断和模拟回归中已修复，标准runner完整模拟语音组通过；业务分支仍未合并，真实AI/真机未验证。Cookie编码测试仍待Claude修正，不能由本次全绿推断为已解决。

- **旧模型停用日期**（OpenAI 官方弃用页，2026-10-23 核对：https://developers.openai.com/api/docs/deprecations）：`gpt-4o-mini-tts` 各快照与 `tts-1` 于 2027-01-06 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4.1-mini-2025-04-14` 于 2027-01-14 停用（建议替代 `gpt-6-luna`）；`gpt-realtime-mini` 于 2027-01-20 停用（建议替代 `gpt-realtime-2.1-mini`）；`gpt-4o-mini-transcribe` 于 2027-02-26 停用（建议替代 `gpt-live-transcribe` 或 `gpt-transcribe`）。原型代码仍写死这些型号。迁移前需用固定样本做真实调用比较，这会产生 API 费用，需用户授权。
- Claude 的云端环境无法访问 npm 仓库，不能运行 `pnpm install`、完整 `tsc` 或 vinext 构建；真实构建结果依赖 CI-001 与 Codex 的环境。
- 真实 AI 与真机语音测试需要：可用的 API 余额、用户自行在部署平台配置的密钥、一个带访问保护的私有 HTTPS 测试环境。三者目前都未就绪。

## 最近交接

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





