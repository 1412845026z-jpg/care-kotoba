# Care Kotoba｜介护日语训练

面向外国介护职员的日本养老介护现场日语训练项目。本仓库由用户控制，2026-10-23 起为公开可见（GitHub REST `private=false`）；尚未选择项目许可证，公开可见不等于授权复用。由 Claude Code 与 Codex 通过提交、分支/PR 和 `handoffs/` 记录共享进度。

## 当前状态

- 代码是**网页/PWA 原型**（Vinext / React / Cloudflare Workers），位于 [`prototype/`](prototype/)。2026-10-24 起 main 包含 G0-01（访问保护、语音转写顺序、服务端挂断、反馈引用校验等基础修复）和 REUSE-001（固定文字注音、语音输入排队）。没有商店 App、生产账户、数据库、支付或企业数据隔离。
- 离线测试：`cd prototype && node tests/run.mjs all`（static + unit + 浏览器 / 语音模拟，AI 与 Realtime 对端都是模拟的），说明见 [`prototype/tests/README.md`](prototype/tests/README.md)。
- 原型的真实 AI 与真机语音链路没有成功的端到端验收记录；模型型号仍是旧的硬编码，且有明确的停用日期（见 [PROJECT_STATE.md](PROJECT_STATE.md)）。
- 当前进度、负责人、分支和阻塞只在 [PROJECT_STATE.md](PROJECT_STATE.md) 维护。

## 从哪里开始

| 想做什么 | 入口 |
| --- | --- |
| 了解规则（两边共用） | [AGENTS.md](AGENTS.md)；Claude 另读 [CLAUDE.md](CLAUDE.md)（已通过 `@AGENTS.md` 导入共用规则） |
| 看当前进度和分工 | [PROJECT_STATE.md](PROJECT_STATE.md)、[handoffs/](handoffs/) |
| 原交接入口 | [00_START_HERE.md](00_START_HERE.md) |
| 项目背景与要求 | [docs/01_PROJECT_CONTEXT.md](docs/01_PROJECT_CONTEXT.md) |
| 实现状态与缺口（归档时） | [docs/02_STATUS_AND_GAPS.md](docs/02_STATUS_AND_GAPS.md) |
| 运行原型 | [docs/03_RUN_AND_MIGRATE.md](docs/03_RUN_AND_MIGRATE.md) |
| 工作包与验收顺序 | [docs/04_BUILD_BACKLOG.md](docs/04_BUILD_BACKLOG.md) |
| 产品/UI/商业方案 | [design/](design/)（PDF 与可点击的交互稿）、[docs/PRODUCT_PLAN_TEXT.txt](docs/PRODUCT_PLAN_TEXT.txt) |
| 开源复用初筛 | [docs/07_OPEN_SOURCE_AND_NOTICES.md](docs/07_OPEN_SOURCE_AND_NOTICES.md)、[research/](research/) |

## 运行原型

在 `prototype/` 目录，按 `package.json` 与锁文件（Node `>=22.13.0`，`pnpm@11.25.0`）：

```sh
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
pnpm build
pnpm dev
```

这些命令出自归档文档；`pnpm install --frozen-lockfile`、`tsc --noEmit`、`pnpm build` 已由 CI 和 Codex 的真实环境运行通过（见 PROJECT_STATE.md 验证记录），以 CI 与实际终端输出为准。演示模式不需要 API 密钥。真实调用的密钥只能放在本地安全配置或部署平台的 secret 中，不能提交到仓库、贴到聊天或截图。

## 溯源

- `archives/` 保存原始上传的两个ZIP与导入任务说明，均未修改。
- 原交接归档 SHA-256：`b9aa73109a4b46eda7b7bf76f76b225d3ab940a57d2655f124ad3320eb238f12`；共享进度包 SHA-256：`f9548e16a7aa3bf690cfe716b3847b5851de4d5aba143fdf83dc7d18299666a3`。
- 原 Sites 源码提交 `e643aed9b347cf5e1f157b4878626c6664063534` 只是历史快照，不是本仓库的提交。
- 校验：`python3 -I tools/verify_import.py`（导入后的正确入口）；`tools/verify_archive.py` 是归档原件，只在原样导入的提交上全部通过。
