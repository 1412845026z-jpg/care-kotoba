# LIGHTHOUSE-001｜手机 Lighthouse CI 报告（Codex，2026-10-24 JST）

- 任务分支：`codex/LIGHTHOUSE-001`。初始基准 main `a3b006095580b234e51100ac70565a7d6a296e12`；本交接撰写时脚本/文档未提交，由 root 整合最新 main、登记状态、提交推送，并补正式 runner 证据。不能把本地未推送草稿写成 review_ready。
- 用户边界：全部免费；不调用付费 API、不充值、不部署、不运行 impeccable launcher 或安装钩子；不改 `prototype/app`、`components`、`lib`、`tests`、原 `audit.mjs`。本任务没有改上述文件或 App 依赖/锁。

## 变更

新增独立 `.github/workflows/lighthouse.yml`，只在有相关改动的 main/任务分支 push、PR 或手动触发。标准免费 `ubuntu-24.04` runner、Node22（>=22.19）、既有固定 pnpm/冻结 App 安装/Playwright Chromium。Lighthouse 是 **13.5.0 正式版**，Apache-2.0，官方 npm `gitHead=cb853a38a6410617518b363590c967b3fe211949`。没有选择预发布版本。

工具 manifest 与 npm v3 lock 单独置于 `scripts/ci/lighthouse-tools/`。CI 复制到 `$RUNNER_TEMP` 后 `npm ci --ignore-scripts --no-audit --no-fund`，不加入 App 的 `package.json` 或 pnpm lock。全部 114 个工具包的实际版本与 archive integrity 已冻结，锁文件 SHA256 `e262f388bfa5ede00f4539caad66853d5fe385341bd4211f6b6af9b733b29f77`；许可包括 MIT/Apache/ISC/BSD/0BSD/MPL/`MIT OR CC0`，没有 GPL/AGPL。Lighthouse 上游 LICENSE 原文保存在 `docs/licenses/LIGHTHOUSE_LICENSE.txt`，与已安装正式 npm 包逐字相同，Git blob `d645695673349e3947e8e5ae42332d0ac3164cd7`；docs/07 新增来源行。`record_lighthouse_toolchain.mjs` 将实际 114 个包的版本、integrity 和 114 份 LICENSE/NOTICE 文本写入报告 artifact。

`run_lighthouse.mjs` 在清除继承的 OPENAI/CK/BASE_URL/NODE_OPTIONS 后启动既有离线 harness，明确不设 AI key（`/api/health configured=false`），Node TCP/fetch 只准回环；Chrome 外部流量强制经关闭的回环代理。Google Fonts 外部 CSS 被拒绝、使用后备字体。Lighthouse 程序接口默认不启用远程错误报告，没有 PageSpeed Insights API、上传服务、账户或 token。扫描仅首页导航，手机模拟采用 Lighthouse 默认 412×823 / DPR1.75 / CPU4× / 模拟移动网络。生成四类 JSON/HTML 报告、结果摘要、Node 网络记录、外部浏览器请求状态和工具版本/许可元数据。

**所有分数与发现都只报告，没有分数硬门。** 报告本身损坏时脚本非零退出并明确记录 runtimeError；整个独立诊断 job 使用 `continue-on-error: true`，因此不阻断业务合并。既有常规 CI、A11Y 三项硬门完全不改。artifact 保留 7 天。

## 本地验证与限制

- Node24.19.0 / npm11.9.0；`npm ci --ignore-scripts --no-audit --no-fund` 安装 114 个工具包成功，manifest/lock 未改写。
- `node --check` 两个新脚本、workflow YAML 解析、`git diff --check` 通过；逐项确认 App、tests、audit、App依赖及 pnpm lock 无修改。
- 第一次本机启动 full Chromium 路径不存在（本机只预装相同 Playwright 版本的 headless shell），没有形成报告。补了存在性检查，防止 chrome-launcher 子进程 ENOENT 变成不清楚的异常；CI 明确安装完整 Chromium，无需该回退。
- 本机用显式 `CK_LIGHTHOUSE_CHROME` 指向已安装 Playwright headless shell 跑通，只作脚本烟测。脚本初次完成报告后发现 chrome-launcher 的 `kill()` 返回 void，已改为 try/await，保证即使 Chrome 清理失败也继续清理 harness。此过程失败没有算成功验收。
- 真实成功的本机报告保存在本轮 scratch `lighthouse-local-results/`（不是正式 CI，也不是真机）；正式 runner 的 source SHA、环境、分数、artifact 和状态由 root 取得后补记。初始 App 被测代码来自 a3b0060，不可将之后 #46/#49 的 UI 变化冒称已由该报告覆盖。

## 发现与交给 Claude 的范围

本报告使用**开发 harness**（React dev/esbuild、内联 source map、无压缩、`cache-control:no-store`、独立简化 shell、没有正式 Worker），不能从其 4.6MB bundle/未压缩/缓存/首屏模拟时间直接断言正式构建有同样问题。报告里的 meta-description 缺失来自 harness shell；真实 `prototype/app/layout.tsx` 已有 description，**不要求 Claude 重复添加**。预期 Google Fonts `ERR_PROXY_CONNECTION_FAILED` 是刻意断网，不是新产品控制台错误；缺少 CSP/HSTS 等也不能由 harness 推断正式 Worker 缺失，真实 SEC/ENV 已另验。

没有由本轮 Lighthouse 单独确认、需要 Claude 立即修改的新产品缺陷。需要 Claude 处理的既有问题仍以 **A11Y-CI-001 的真实 DOM/源码证据**为准：Modal 可访问标题、手机筛选按钮名称、桌面品牌可见名称不匹配、练习覆盖层重复 landmark/标题层级、opacity 合成后的注音/计数对比度。它们不是本轮手机首页 Lighthouse 100 分所排除的缺陷，也不是 Lighthouse 新发现。后续生产构建/真实字体/其他页面/真机报告属于另一次验证，不扩入本次免费首页诊断。

## 官方核对来源（查阅日期均 2026-10-24）

- https://github.com/GoogleChrome/lighthouse/releases/tag/v13.5.0 （正式 release）
- https://registry.npmjs.org/lighthouse/13.5.0 （精确版本、sha512、gitHead、Node要求）
- https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/package.json
- https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/LICENSE
- https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/docs/readme.md （程序接口、输出与默认不远程错误报告）

## 下一步

root 将最新集成 main 合入本任务分支，仅整合 PROJECT_STATE 与本交接；推送后收取正式免费 runner HTML/JSON、工具许可和日志，核对外部浏览器请求全为失败/0字节、Node外联0、health=false；记录具体 source SHA 与结果。报告不足不自动触发付费服务、部署、App修改或扩大测试范围。

## 本轮接续

已核对并快进到业务集成main6148494798ad58fbc0b8a29ea431587580d3ec98（#46→#49，当前源码已通过常规CI40077969512及A11Y硬门）。Node语法、diff空白检查通过，准备从该固定main发布。此前本机分数仅针对a3b0060；正式新源码报告仍待当前分支免费runner，不能混用。
