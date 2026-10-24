# REAL-AI-PILOT-PLAN-001 — 首次真实 AI 小规模试验计划（Codex）

- 基准 main `a3b006095580b234e51100ac70565a7d6a296e12`；工作分支 `codex/REAL-AI-PILOT-PLAN-001`。此交接为文档工作，实际文档提交/推送号由整合者在提交后补记；不把本地草稿标成已推送。计划见 `docs/15_REAL_AI_PILOT_PLAN.md`。
- 读取 AGENTS/PROJECT_STATE、最新 ASSET-SOURCES 交接、CORE-EVAL/FREE-VOICE-ENV 交接、docs/08/09/05，检查现有型号、计价、语音诊断、chat/feedback/session/speech 路由和两个 smoke 工具。没有修改产品目录或依赖。
- 官方 OpenAI 文档于 2026-10-24 核对（OpenAI Docs 技能，只读文档）：现文字、转写、TTS token价；Realtime2.1mini价；token/分钟与历史重输入；停用时间、数据保留和可选硬限额。各来源的完整官方 URL/查阅日在计划末表；未依据未打开的搜索摘要写结论。
- 计划包含1次接口冒烟（2文字＋1句TTS）、12场景各一次核心探测（28文字、逐场景小批）、3次文字练习（各≤3分钟/4回合）、3次实时语音（各≤2分钟/最多4次AI回复）及各反馈。共48次文字模型调用，3条语音连线合计≤6分钟。阶段间人工查账，无自动付费workflow或循环。
- 无缓存折扣、预算汇率200JPY/USD（假设而非市价）：条件估算 $0.46922≈¥93.84，20%预留后¥112.61、向上取¥113。建议用户另行批准一次性¥1,000额度；人工停止线$1、建议专用项目$3硬限额/告警，并明确传播延迟/在途调用，不承诺绝对日元硬上限。本轮不充值、不开通收费服务、不部署。
- **没有获准执行**：T1–T14、真实 `--yes`、MODEL-001等继续 blocked。用户自行在平台 secret 设置密钥，不能贴聊天/文档/Git；本任务没读、建、配任何密钥。没有运行两个工具的付费路径，也没调用真实服务器的免费health。

## 真实执行前仍要解决

1. 当前官方 `gpt-realtime-mini` 型号页只列文字价，现价格页只列新实时mini音频价；旧实时音频$10/$20仅沿用现代码对新型号的价格假设，**不是已核实旧型号价**。未确认旧型号适用价前语音不执行，不能自动换型号。首次真实测试还是需用户预算和环境授权。
2. 新官方确认：`gpt-realtime-2.1-mini` **不支持 `/v1/audio/speech`**，TTS迁移需改变Realtime工作流。`models.ts` 的“该替代端点未验证”备注和PROJECT_STATE旧说法应由相应负责人后续校正；本任务不改App，也不提前做MODEL-001。
3. 当前text/TTS响应不提供逐次usage，smoke报告只含状态、耗时、字节/引用等；语音token/估价是客户端导出，并非独立账单。需另行准备安全的数字用量关联记录（App/lib路由归Claude），才能按每次练习准确计价。平台仅提供聚合时要标计算/分摊，不伪造逐次实际账单。当前计划因此不能作为已具备完整计费验收条件的执行单。
4. App配key后参考句/复习「ゆっくり聞く」走共享sayText先请求`/api/speech`，会额外产生TTS；本计划禁止非计划朗读点击，也不把有key的复习声称完全零API费。无key阶段不改变。
5. 全站Access与应用访问码都要有效。现smoke只支持应用Cookie，不含Cloudflare Access服务身份/JWT；先免费验证安全通路，不关Access迁就脚本。本计划没有现成staging或部署授权。
6. 当前App缺服务端强制被遗弃会话时长与可信账本；人工守候/逐批检查/挂断确认不能等同商用额度控制。设置硬限额有延迟，平台告警本身仍是软控制。

## 免费验证证据

- **仅执行** `node tools/smoke/core-roleplay-check.mjs --base http://127.0.0.1:9`（无 `--yes`）；源代码确认在任何网络分支前退出，exit0，输出 `paidCalls:0`、28个计划探测，见 `verification/REAL-AI-PILOT-PLAN-001/roleplay-plan-only.json`。这不是对本机服务的接口实测。
- `node --check` 两个smoke脚本、JSON解析、独立Decimal费用复算、场景/次数核对、来源文件SHA256、文档相对路径与`git diff --check`通过。证据在同目录`budget-assumptions.json`、`provenance.json`、`validation.json`。
- 不做App回归（只有文档/离线计划产物，没有产品代码改动），不声称真实AI质量、延迟、费用、手机或商用验收通过。付费API调用0、充值0、部署0、impeccable hooks0。

下一步：整合者推送文档分支并登记PROJECT_STATE；用户先审批具体范围和预算，解决旧实时定价/鉴权/计量缺口后另开真实执行任务。每学员月AI费用公式和示例（约¥463.44/月的给定假设，非售价或实测）已写入计划，供将来以真实数据替换。

## 本轮接续核对

业务基准已核对为main6148494798ad58fbc0b8a29ea431587580d3ec98。OpenAI官方型号/定价、TTS工作流与硬限额页面再次打开；旧实时音频价格仍未由当前官方价页确认，条件估算不升级为已核实价格。当前main无--yes的core计划再次exit0、paidCalls=0；无任何真实AI调用。原预算假设和专业/鉴权/计量未决条件保留。

## 已推送与整合入口

工作分支 `codex/REAL-AI-PILOT-PLAN-001` 已实际推送，提交 `1ceb8e7d3bc051873ebd1d5e382877cda194f318`。只交计划；条件预算¥113、建议另批¥1000，未花钱；旧实时价/逐次计量/鉴权待解决。共同整合入口为本轮交付PR，合并前根PROJECT_STATE只将文档标review_ready；Lighthouse代码已由PR #53进入main。
