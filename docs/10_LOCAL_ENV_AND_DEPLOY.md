# 本地环境验证与私有 staging 方案

核对日期：2026-10-23。此文档记录本机验证和待授权的部署步骤；本轮没有部署、开通服务、配置真实密钥或调用付费 API。

## 当前证据与适用范围

| 检查 | 对象 | 结果 |
| --- | --- | --- |
| main 真实 CI | `87b611863046f8bb0b602aeb1bfb9e1b60396432`，Node22.23.3 / pnpm11.25.0 | install、tsc、portable build、简单凭证扫描通过；[日志](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954687547) |
| G0-01 本地真实构建 | `55f0ebb68c13283a6e6b523785668032bcbb70a7`，Node24.19.0 / pnpm11.25.0 | install5.595s、tsc5.941s、build6.244s，均 exit0 |
| G0-01 原码对应关系 | PR #5 @ `07c5fa30dc8a7832b59a4225ab9748e9f52f1653` | app、lib、components、tests 的全部 Git blob 与上面本地被测版本相同；新增 CI 脚本与文档另行读取 |
| 真机、真实 AI、负载 | 没有执行 | 尚未验证；模拟浏览器不能替代 |

本机并未通过 shell `git fetch` 取得源码：使用 GitHub 连接器读取固定提交和完整 tree，将每个本地 blob 与远端对象地址核对，再恢复相同 SHA 的 shallow 提交。不是从旧归档覆盖远端。

## 本地启动

从仓库根读取 AGENTS.md、PROJECT_STATE.md 和最新 handoffs/，确认工作分支。进入 `prototype/`：

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
pnpm build
pnpm dev --host 127.0.0.1
```

清洁副本默认 portable，开发端口5173。已有脚本能在普通 Linux 构建，不需要进入 Sites 的 managed-linux / flock 安装路径。CI 用 Node22（>=22.13），本地结果应同时注明实际 Node 版本。

## 环境变量的假值实测

在 G0-01 的真实 Vinext + Cloudflare dev server 中，只向忽略的本地文件写入虚构标记和无效测试 key，分别重新启动服务器。临时在 Codex 负责的 `worker/index.ts` 加入只返回测试标记的探针，同时观察真实 `/api/health` 的 configured 布尔值；随后恢复原文件字节。没有修改冻结的 API / lib / components / tests。

| 输入条件 | fetch 参数 env | `cloudflare:workers` 导入 env | Worker 的 process.env | `/api/health` |
| --- | --- | --- | --- | --- |
| 无本地变量文件 | 无标记 | 无标记 | 无标记 | configured=false |
| 只有 `.env.local` | `.env.local` 假值 | 同左 | 同左 | configured=true |
| 只有 `.dev.vars` | `.dev.vars` 假值 | 同左 | 同左 | configured=true |
| 两份文件同时存在且标记不同 | `.dev.vars` 假值 | 同左 | 同左 | configured=true |

结论限于当前锁定的 Vinext / Cloudflare 插件、compatibility date 和本地开发模式：两条注入路径都可用，`.dev.vars` 优先。推荐只选 `.dev.vars` 作为 Workers 本地变量入口，避免同名变量在两处不一致。修改后重新启动开发服务。不要把服务端变量放在 `NEXT_PUBLIC_*` 或 `VITE_*` 中。

另做的「只设置启动进程变量」试验得到旧 `.dev.vars` 标记，未能排除本机工具的变量恢复/缓存影响，因此**没有据此确认纯进程注入的行为**。完整假值矩阵与清理情况见 ENV-001 交接；这个异常不作为生产注入约定。上线只使用平台 secret，重新验收。

原始假值文件均不提交；探针不进入产品包。构建前关闭开发服务并清理测试文件，防止 Cloudflare 插件为本地预览把开发变量写进构建输出的 `.dev.vars`。不要上传整个工作目录或 `dist/` 压缩包作为部署附件。

## 模拟浏览器与真实 dev server

Claude 的 `prototype/tests/README.md` 区分离线 harness 和真实框架。应使用其固定 mock 端口4010，并将应用服务端 OPENAI_BASE_URL 指向 `http://127.0.0.1:4010/v1`。本轮真实 API 入口仍禁用。

```sh
# 仅示意无效测试配置；不要填入真实 key。
# 写入 prototype/.dev.vars（必须被 Git 忽略）后启动 pnpm dev：
# OPENAI_API_KEY=ck-test-only-not-real
# OPENAI_BASE_URL=http://127.0.0.1:4010/v1
# CK_ACCESS_POLICY=local
# CK_RATE_LIMIT_MULTIPLIER=100

BASE_URL=http://127.0.0.1:5173 CK_MOCK_PORT=4010 node tests/run.mjs e2e
```

测试工具应由负责构建的一方写入 package.json 与锁文件：esbuild0.28.2、playwright1.63.0，版本来自 Claude 的交接。添加时保留原有锁定依赖图，使用 frozen install 复核；不趁机升级原依赖。

真实 dev server 浏览器套件在本机 exit1：3/20通过、17失败，耗时428.877秒。导航复核中，首次点击后搜索框不存在，等待 React 绑定并再次点击后成功（1.306秒，无 pageerror）；这与 SSR hydration 时机有关的判断仍是推断，需 Claude 修复就绪约定与测试。另一次离线 harness 检查：单元33/33；浏览器12/20，8个模拟语音数据通道等待超时；静态检查因 TypeScript5.9.3 不接受 ignoreDeprecations=6.0 及 React shim 与安装类型冲突而失败。完整错误见 ENV-001 记录，不能把这些 shim 诊断当成真实项目 tsc 失败。本地 Playwright1.63.0 的官方浏览器下载失败；实际测试使用 npm 包 @sparticuz/chromium153.0.0 提供的 Chromium153.0.8010.0。其结果不能等同于官方 Chromium 或真机表现；8项 WebRTC 失败尚未定位到应用、二进制或网络。

另外，在真实 dev server 的 code 策略下独立核对：无 cookie 请求401；正确虚构访问码200；HttpOnly / SameSite=Strict Cookie 存在；会话200 / application/sdp，X-CK 会话/型号/时长头完整；mock Location 被正确读取成调用 ID；浏览器 navigator.sendBeacon 返回true，mock挂断计数1。所有 token 只在内存传递，未写入日志或仓库；并非真实供应商挂断或真机关页测试。

`access.e2e.mjs` 在 setup 时改变 harness 的环境，外部 BASE_URL 模式不能自动重启真实 Worker；访问码策略等测试需分别配置服务器，不能假设同一份 local 策略适用于全部测试。

## 新 staging 的边界

部署目标为**新的** `care-kotoba-private-staging` Worker。最终名称与账户 ID 由用户授权时确定；不读取原 Sites 站点来推断新目标，不复用原站点 ID、旧 Worker、数据库、域名或任何凭证。当前阶段不需要新增数据库、R2、企业用户表或商店开发者账户，只做私有网页真机测试。

`prototype/config/staging/wrangler.example.jsonc` 是待审模板：部署命令不会自动使用它，workers.dev 和 preview URL 默认关闭。它指向本次本地构建的 Worker 和静态资源，保留 no_bundle / ESModule 规则，不引用 `.openai/hosting.json`。不要直接用现有 `dist/server/wrangler.json` 的旧默认项目名部署。

Cloudflare Access 保护设在平台入口，选择这一个新 Worker 的 **All traffic**，覆盖 workers.dev、预览和未来自定义域名；只允许用户指定的测试者。它不能代替企业用户权限系统。应用继续使用 `CK_ACCESS_POLICY=code` 作为额外测试门禁；即使 Access 已存在也不默认改成 open。

## 用户需要提供或自行完成的资源

| 资源 | 最小需要 | 提供方式 |
| --- | --- | --- |
| Cloudflare 账户 | Workers 管理权限；核实实际账户 ID 和新 Worker 名 | 用户登录平台，不在聊天传密码/令牌 |
| Zero Trust / Access | 已启用 Zero Trust；能管理 Access 应用与策略 | 用户确认 Free 方案；平台可能要求自行填写付款资料，不能由本轮自动开户 |
| 测试者清单 | 少量明确允许的账号或邮箱，短会话有效期 | 仅在 Access 策略中维护，不提交个人名单 |
| 部署授权 | 确认私有新 staging、账户、新名称、费用上限和回滚负责人 | 用户审阅本方案后另行授权 |
| 产品 AI 凭证与测试预算 | 仅在准备真实 AI 测试时才需要；本轮不创建、不读取、不复用 | 用户在新 Worker 的平台 secret 中配置；预算另行批准 |

不要为首次测试授予全账户 API token。未来如使用 CLI，可由账户管理员限定 Workers 编辑与相关账户读取权限；Access 配置使用单独权限或控制台，不把部署 token 放进 GitHub CI。

## 待授权后才执行的部署顺序

1. 合并并核实 G0-01 / CI-002 / ENV-001；先解决真实框架测试中影响目标流程的问题。新 Worker 尚不含真实 key。
2. 用户在 Cloudflare 选择新账户目标；将 example 复制为本地未跟踪配置，填入新账户 ID，保留 workers_dev=false、preview_urls=false。核对目标名没有旧项目标识。
3. 清理测试变量和本地构建产物后，从已验收提交执行 frozen install、tsc、build。在本机对独立配置做 dry-run 并检查将上传的文件清单。原 Sites 仍独立运行。
4. 只有在用户授权后，上传到新 Worker，仍关闭外部 URL。此时只允许部署账户管理员在控制台操作。
5. 在新 Worker Settings → Access 设置 Protect this Worker behind Access → All traffic；只允许明确测试者。保存策略后才开放这个新 Worker 的 workers.dev URL。预览 URL 继续关闭；未来启用前先确认同样受保护。
6. 无 key 时先用未登录浏览器核对首页、`/api/health`、`/api/chat`、`/api/session`、`/api/session/end` 都由 Access 拦截；用已授权账号检查演示流程。核对未授权邮箱仍被拒绝。任何直接访问路径漏保护，立即关闭 URL，不配置真实 key。
7. 用户确认真实 AI 的预算、测试时长和参与者后，自行配置平台 secrets：OPENAI_API_KEY、CK_ACCESS_CODE、独立 CK_SESSION_SECRET。明文不进配置的 vars、日志、聊天、截图或仓库。部署环境的 OPENAI_BASE_URL 使用正式供应商地址，删除本地 mock 地址；模型覆盖值需经模型迁移评测后另定。
8. 按 docs/09 在 iOS Safari / Android Chrome 做小范围人工测试，记录被测版本、网络、耳机、打断、最后一句转写、结束/关页、断线重连和诊断信息。记录真实消耗；当前只有客户端时长控制，服务端强制时长与对账尚待实现，不能据此承诺费用硬上限。

下列只是**授权后**的命令模板，本轮未执行。路径需与实际审核后的 staging 配置一致：

```sh
cd prototype
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
pnpm build

# cfg 是经过审核的本地独立配置，不是旧 dist/server/wrangler.json。
pnpm exec wrangler deploy --dry-run --config config/staging/wrangler.local.jsonc
pnpm exec wrangler deploy --config config/staging/wrangler.local.jsonc

# 后续由用户在平台安全输入中设置 secret；命令不携带明文值。
pnpm exec wrangler secret put OPENAI_API_KEY --config config/staging/wrangler.local.jsonc
pnpm exec wrangler secret put CK_ACCESS_CODE --config config/staging/wrangler.local.jsonc
pnpm exec wrangler secret put CK_SESSION_SECRET --config config/staging/wrangler.local.jsonc
```

不要把以上部署或 secret 命令加入当前 GitHub Actions；当前 CI 只构建和模拟测试。

## 费用估计（官方页面，2026-10-23 查询）

这是私有开发测试环境预算，美元、未含税。不是未来学员运营成本，也不构成购买授权。

| 项目 | 小范围开发测试估计 | 实际限制与选择条件 |
| --- | --- | --- |
| Workers Free | $0/月 | 100,000 请求/日、10ms CPU/次；当前应用是否符合 CPU 约束还未在云上测，不能保证 Free 足够 |
| Workers Paid（如 Free 不适用） | 最低 $5/月/账户 | 含1000万请求、3000万 CPU ms；超出后请求 $0.30/百万、CPU $0.02/百万 ms；只有用户批准后才升级 |
| Cloudflare Access Free | $0/月，50用户以内 | 本轮只安排少数测试者；Zero Trust 开户可能需要用户自行填写付款资料 |
| 新 workers.dev 地址 | 无需另购域名 | 要先设置 Access；可保持 preview URL 关闭 |
| 数据库、R2、邮件、商店账户 | 本轮方案不新增 | 当前目标无需这些资源；未来功能分别规划 |
| 产品 AI | 本轮 $0 | 没有真实调用；后续真实语音另设授权预算，不能包含在 $5 Workers 费中 |
| GitHub Actions | 本轮只用免费额度 | 已只读核实账户 Actions 付费预算 $0 并阻止付费用量；不能把标准私库 runner 描述成永久无限免费 |

据此，新 staging 的基础托管可先按 **$0/月方案尝试**；若实际 CPU 或功能限制要求 Paid，再向用户提交 **最低$5/月 + 超额用量** 的具体选择。真实 AI 测试费用独立，不预充、不自动升级。

官方来源：

- [Workers 价格](https://developers.cloudflare.com/workers/platform/pricing/) 与 [限制](https://developers.cloudflare.com/workers/platform/limits/)。
- [Access / Zero Trust 价格](https://www.cloudflare.com/plans/)（SASE / Zero Trust）与 [Zero Trust 初始化](https://developers.cloudflare.com/cloudflare-one/setup/)。
- [Worker 的 Access 保护范围](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)。
- [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。
- [Vite 程序化配置](https://developers.cloudflare.com/workers/vite-plugin/reference/programmatic-configuration/) 与 [Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。
- [回滚](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) 与 [Wrangler Workers 命令](https://developers.cloudflare.com/workers/wrangler/commands/workers/)。
- [GitHub Actions 计费与免费额度](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

## 回滚与关闭

首次开放前记录 Git SHA、构建工具版本、Worker version ID、Access 策略和通过的测试；后续每次变更保留一个已验证的上一版本。

- 应用回退：在新 staging 的 Deployments 选择上一已验证版本，或用下方显式 version ID 命令；随后复核 Access 和关键流程。
- 无可用上一版本的首次部署：关闭新 Worker 的 workers.dev / preview URL，保留阻止访问的 Access 策略，再排查；不拿旧 Sites 作为回滚目标。
- 访问策略回退：恢复上次明确的测试者白名单；应用代码回滚不等于 Access 策略自动回滚。
- 撤销测试权限：移除测试者授权、撤销访问会话；停止真实 AI 时移除新环境的产品 key。不要删除仍被上一版本依赖的 secret 后又假设旧版本能正常回滚。
- 将来如有数据库迁移：另行提供备份/恢复与兼容方案；Worker 版本回滚不会恢复数据库数据。

```sh
# 仅在授权的“新 staging”上执行，VERSION_ID 取自已验证记录。
pnpm exec wrangler deployments list --config config/staging/wrangler.local.jsonc
pnpm exec wrangler rollback VERSION_ID --config config/staging/wrangler.local.jsonc
```

部署完成、Access 保护、平台 secret、真实 AI、真机语音是不同验收项。本文件目前只完成方案和本地记录。


## 2026-10-24：固定修复提交的运行补充（ENV-003）

标准GitHub ubuntu runner、Node22.23.3、官方Chromium，对未合并的G0 `3a3f1a9`与REUSE `5b6146f`运行了真实Vinext dev和模拟上游：G0 21通过0失败1跳过，REUSE24通过0失败1跳过。离线harness分别22/22与25/25；它们是两种不同的运行层，不能混为真实AI或真机验收。完整结果见 `handoffs/2026-10-24-ENV-003-results-codex.md`、`verification/ENV-003/` 和 [run39982127800](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39982127800)。

两版本均用仅含假值的 `.dev.vars`，Worker配置探针确认mock地址与code策略生效，非loopback fetch守卫计数0。该补充没有重新运行ENV-001的全部环境变量优先级矩阵，也没有配置平台secret或部署。旧优先级矩阵应按它自己的被测提交与结果读取。

本地重复启动时实际遇到 `.vinext/dev/lock.json` 遗留：错误中的PID来自另一个执行命名空间，不能把它直接当成当前会话的目标PID。先确认是自己这次测试创建的工作目录、对应端口没有服务、上次任务已结束，再删除那个遗留锁；不要结束未知进程。ENV-003本轮按此确认后重新启动，笔记保留名称的真实dev回归1/1、setup失败清理2/2通过。

本轮还保留了Cookie编码测试的不稳定性诊断：旧断言的最后字符变化可能不改变签名字节；一次全绿不证明问题已消失。修正测试和规范编码行为仍由Claude在其代码/测试分支处理，见CI-003交接。新的私有staging依然只是方案，未执行部署。
