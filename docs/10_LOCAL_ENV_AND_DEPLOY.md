# 本地环境验证与私有 staging 方案

核对日期：2026-10-24。当前执行依据为用户12:54决定：先做免费真机测试，付费往后。本轮只补充方案与模拟验收，没有部署、开通服务、配置真实密钥或调用付费 API。下方ENV历史记录保留原被测版本；新的免费方案优先于旧的付费测试建议。

## 当前证据与适用范围

| 检查 | 对象 | 结果 |
| --- | --- | --- |
| main 真实 CI | `87b611863046f8bb0b602aeb1bfb9e1b60396432`，Node22.23.3 / pnpm11.25.0 | install、tsc、portable build、简单凭证扫描通过；[日志](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39954687547) |
| G0-01 本地真实构建 | `55f0ebb68c13283a6e6b523785668032bcbb70a7`，Node24.19.0 / pnpm11.25.0 | install5.595s、tsc5.941s、build6.244s，均 exit0 |
| G0-01 原码对应关系 | PR #5 @ `07c5fa30dc8a7832b59a4225ab9748e9f52f1653` | app、lib、components、tests 的全部 Git blob 与上面本地被测版本相同；新增 CI 脚本与文档另行读取 |
| 真机、真实 AI、负载 | 没有执行 | 尚未验证；模拟浏览器不能替代 |

本机并未通过 shell `git fetch` 取得源码：使用 GitHub 连接器读取固定提交和完整 tree，将每个本地 blob 与远端对象地址核对，再恢复相同 SHA 的 shallow 提交。不是从旧归档覆盖远端。

## 本地启动

从仓库根读取 AGENTS.md、PROJECT_STATE.md 和最新 handoffs/，确认工作分支。下面为通用构建入口；当前免费手机测试请使用下节A的干净副本和清空进程变量步骤。进入 `prototype/`：

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
pnpm build
pnpm dev --host 127.0.0.1
```

清洁副本默认 portable，开发端口5173。已有脚本能在普通 Linux 构建，不需要进入 Sites 的 managed-linux / flock 安装路径。CI 用 Node22（>=22.13），本地结果应同时注明实际 Node 版本。

## 2026-10-24：先做免费的手机测试（docs/09 的 A 和 C）

本节对应 `docs/09_REAL_DEVICE_VOICE_TEST.md` 的 F1–F10。AI费用为0：电脑和未来的新staging都不设置 `OPENAI_API_KEY`，不连接真实AI。浏览器语音输入可能使用浏览器提供商的服务，是否需要联网、是否有日语端末声音依设备而异；第一次使用先阅读应用的告知并自行选择同意。模拟识别器的CI结果不能替代手机F5/F6。

### A：Android USB端口转发，本机运行，不部署

准备现有Android手机、一条能传数据的USB线、电脑与手机上的Chrome，以及仓库已有工具链Git、Node22（>=22.13）和固定pnpm11.25.0。安装锁文件中的现有包不改变依赖；此路径不需要Android Studio、adb、付费隧道或域名。先用干净的新副本，保留原项目中的任何密钥文件；不要复制 `.dev.vars`、`.env*`、旧 `dist/` 或 `.wrangler/` 到测试副本。

#### Windows（PowerShell）

1. 在电脑选一个可写目录打开新的PowerShell窗口。先确认 `node --version` 是Node22且>=22.13、`git --version`可用。获取已验收main并启动本机服务器：

```powershell
git clone https://github.com/1412845026z-jpg/care-kotoba.git care-kotoba-free-phone
Set-Location .\care-kotoba-free-phone\prototype
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:OPENAI_BASE_URL -ErrorAction SilentlyContinue
$env:WRANGLER_SEND_METRICS = "false"
$env:CLOUDFLARE_CF_FETCH_ENABLED = "false"
$env:NEXT_TELEMETRY_DISABLED = "1"
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173
```

2. 保持窗口运行，在电脑Chrome打开 `http://127.0.0.1:5173/api/health`，确认**顶层** `configured` 为 `false`。这是AI密钥状态，与嵌套的 `access.configured` 不同。若顶层为true，停止本次免费测试并查明变量来源；不要输出或提交任何密钥。使用演示模式，不进入付费语音练习。
3. Android设置中启用开发者选项（一般在「关于手机」连续点「版本号」7次，厂商菜单可能不同），然后启用「USB调试」。用数据线直接连接电脑，解锁手机，在手机上同意这台电脑的USB调试提示；必要时切到「文件传输」。
4. 电脑Chrome打开 `chrome://inspect/#devices`，勾选 **Discover USB devices**，等到列表出现手机型号。点击 **Port forwarding**：左侧 **Port** 填 `5173`，右侧 **IP address and port** 填 `localhost:5173`，勾选 **Enable port forwarding**，点 **Done**。
5. 在**手机Chrome**打开 `http://localhost:5173`，不要填电脑的局域网IP。转发指示应显示已连接；电脑服务器仍只监听127.0.0.1，不需要开放防火墙公网端口。
6. 按docs/09做F1–F10；首次用麦克风时由测试者允许此站点权限，F5先在演示中点击「声で入力」，核对、修改文字后发送。F6点「ゆっくり聞く」；没有AI key时应用会尝试端末朗读。记录没有日语声音或浏览器不支持的情况。

若电脑看不到手机，先换数据线、直连USB口、解锁并重新连接，再检查手机授权。Windows仍无法识别时按Google/手机厂商官方说明安装对应OEM USB驱动；不要从不明驱动站下载。无需为此安装项目新依赖。测试结束关闭Chrome的端口转发、按Ctrl+C停止服务器，并在手机关闭USB调试或撤销这台电脑的调试授权。

#### macOS（终端）

1. 用新的终端窗口，在自己选择的可写目录运行；工具链同Windows，macOS通常不需OEM USB驱动：

```sh
git clone https://github.com/1412845026z-jpg/care-kotoba.git care-kotoba-free-phone
cd care-kotoba-free-phone/prototype
unset OPENAI_API_KEY OPENAI_BASE_URL
export WRANGLER_SEND_METRICS=false
export CLOUDFLARE_CF_FETCH_ENABLED=false
export NEXT_TELEMETRY_DISABLED=1
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173
```

2. 电脑Chrome打开 `http://127.0.0.1:5173/api/health`，确认顶层 `configured:false`，保持服务器运行。
3. Android开启开发者选项和USB调试，用数据线连接Mac；在手机允许调试。Mac若询问是否允许连接USB配件，由测试者确认自己的手机。
4. Mac Chrome打开 `chrome://inspect/#devices` → **Discover USB devices** → 看到手机型号 → **Port forwarding**。左侧 `5173`、右侧 `localhost:5173`，勾选 **Enable port forwarding** → **Done**。
5. 手机Chrome打开 `http://localhost:5173`。允许本次麦克风访问后，按docs/09记录F1–F10，特别是F4保存的JSON、F5识别/修改、F6端末朗读。
6. 结束后关闭端口转发、终端Ctrl+C，并关闭手机USB调试或撤销授权。

A的网页流量走USB，不要求手机和电脑处于同一Wi-Fi；浏览器供应商的语音服务仍可能要求手机联网。手机的localhost属于安全上下文，但实际识别支持、权限、准确率与音色仍须按机型记录。A仅适用Android；iPhone使用C的私有HTTPS地址，或B仅做界面检查。Windows/macOS上的实际连线操作尚未由本轮代替用户执行。

### C：不设API key的私有staging，仅方案、等待部署授权

目标为新的 `care-kotoba-private-staging` Worker，使用明确处于Workers Free的账户与少量测试者的Access Free，不新增数据库、R2、付费隧道、域名、付费Workers套餐或API服务。**本节没有执行部署或开户。**

若现有账户的Workers计划已经是Paid，不把新建一个Worker描述成Free；不为本测试改动原账户收费计划，另核对不影响旧服务的免费目标，或使用A。

现有 `CK_ACCESS_CODE` 只保护AI接口，演示页面和HTML仍可直接访问，单独设置它不能把全站变成私有。当前可准备的私有方案采用 **Access Free全站保护 + 应用访问码**。若只希望靠访问码保护全站，必须另做Worker入口门禁设计与验收；此门禁当前未实现，不把它当作已可部署的私有方案。

| 设置 | 免费staging要求 | 用户要做的操作 |
| --- | --- | --- |
| Cloudflare目标 | 明确账户ID和全新Worker名，不复用旧Sites | 登录自己的Cloudflare账户，核对目标与权限 |
| Workers计划 | 确认账户的Workers计划为Free，不绑定自动升级/付费附加服务 | 控制台确认实际计划与免费额度；遇到付费承诺停止 |
| Access计划 | Access Free，仅少量指定测试者（官方上限50用户） | 选择Free；在控制台维护允许的测试者，不把名单放进仓库 |
| 构建/路由 | portable生产构建；参考 `prototype/config/staging/wrangler.example.jsonc` 独立配置 | 授权部署前再核对构建输出、assets/main路径和账号，禁止直接沿用旧默认部署目标 |
| URL | 初始 `workers_dev:false`、`preview_urls:false`，不设其他公开路由 | 全站Access策略生效后才开放新的workers.dev URL；preview继续关闭 |
| 全站访问保护 | 新Worker的Access → Protect this Worker behind Access → **All traffic**；按明确测试者放行，无Everyone/bypass | 用户配置并确认未登录、未授权用户均无法看到页面与API |
| `OPENAI_API_KEY` | **不存在**，不是把真实key换个名字或放入其他配置 | 检查新Worker变量、secrets和构建输入，保持未设置 |
| `OPENAI_BASE_URL` | 新staging不设置；不带入CI/mock地址或代理 | 不复制本地mock变量或旧环境 |
| `CK_ACCESS_POLICY` | `code` | 在新Worker设置非机密变量 |
| `CK_ACCESS_CODE` / `CK_SESSION_SECRET` | 独立高熵访问码与随机签名secret；不依赖AI key | 仅在平台安全输入设置；不写入vars、命令参数、聊天、截图或仓库 |
| 可选AI开关 | `CK_ASR_LOGPROBS`、`CK_AI_FURIGANA`不启用；不配模型实验 | 保持默认关闭，MODEL-001仍blocked |

授权部署以后的人工顺序：先确认目标与Free计划，清洁构建并审阅上传清单；创建新Worker时保持URL关闭；为该Worker配置Access全站策略与应用访问码；确认策略覆盖后才开放单一HTTPS入口。随后分别用未登录、未授权和已授权浏览器检查保护，已授权者访问 `/api/health` 必须看到顶层 `configured:false`，再执行F1–F10。保留被测SHA、Worker版本ID、机型/系统/浏览器和免费测试结果。Access策略失败、CPU/请求超限或需付费能力时关闭新入口并记录阻塞，回到A，不自动升级。

Worker级Access目前不支持WebSocket升级。免费C只运行生产构建的演示/端末语音功能，不部署dev/HMR服务，也不启用付费Realtime或旁路WebSocket；将来需要WebSocket时，另行审查官方hostname-based Access方案，不能沿用本节的覆盖假设。

截至2026-10-24官方Workers Free限制为100,000请求/日、10ms CPU/请求；SSR在Free上的实际CPU和资源行为尚未在云端验收。额度不足时保持blocked。本轮没有提供自动部署、自动配置key或自动运行收费测试的CI步骤。

### 当前保持blocked的项目与免费测试证据

- 真实付费T1–T14、真实 `core-roleplay-check` 的付费开关、MODEL-001、Workers Paid及其他付费服务保持blocked。免费阶段不创建/配置产品AI key，不预充，不升级，不运行这些收费任务。
- CI中的AI、语音对端和识别器是模拟的；已有收费开关的工具测试只在隔离的offline harness/mock执行，不对真实服务器运行。
- F1–F10由用户记录实际手机结果；本轮仅准备方法与模拟验收。F4可能因没有AI设置而提示只能演示，符合本阶段预期；浏览器识别/端末声音缺失只记录设备能力，不据此打开收费接口。
- `leak_markers_ja`结构提案暂缓，不修改content结构。

官方操作依据（2026-10-24读取）：[Chrome USB远程调试](https://developer.chrome.com/docs/devtools/remote-debugging)、[Chrome端口转发](https://developer.chrome.com/docs/devtools/remote-debugging/local-server)、[Android OEM USB驱动](https://developer.android.com/studio/run/oem-usb)、[Workers Free限制](https://developers.cloudflare.com/workers/platform/limits/)、[Worker Access范围](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)、[Cloudflare Free计划](https://www.cloudflare.com/plans/)。

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

## 待授权后才执行的部署顺序（免费阶段）

以本文件上方C节为当前唯一staging操作顺序。旧方案中的配置产品AI key、真实AI语音测试步骤已停止准备：T1–T14、真实角色检查收费开关和MODEL-001保持blocked。免费部署也须另行授权，本轮未执行。当前CI仅本地构建和mock测试，不添加部署或平台secret配置动作。

## 免费阶段的费用与停止条件（2026-10-24核对）

| 项目 | 当前选择 | 限制与处理 |
| --- | --- | --- |
| Workers Free | $0/月 | 官方100,000请求/日、10ms CPU/请求；本应用尚未在云端证明满足限制，超限就停止，不升级Paid |
| Access Free | $0，最多50用户 | 仅少量指定测试者；由用户核对账户实际Free计划与开户要求，不自动开通付费方案 |
| workers.dev | 不另购域名 | 只开放有全站Access保护的单一入口，preview关闭 |
| 产品AI / 模型测试 | 本阶段不配置key、不调用 | T1–T14、真实角色检查收费开关、MODEL-001为blocked |
| 数据库/R2/邮件/付费隧道 | 本阶段不新增 | 需要时另做方案，本轮不产生这些费用 |
| GitHub Actions | 既有CI额度内的本地mock验证 | 免费额度不是无限资源，不自动提高付费预算 |

本节是免费方案的边界，不是服务已开通、Free性能已验收或未来商业运营零成本的承诺。

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
