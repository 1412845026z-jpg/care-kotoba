# ENV-003结果：Claude修复提交的构建与模拟回归通过

- 2026-10-24 JST，Codex；主干基准main `37c0fc20bcffcadd8d1cb83d747a35d5b2154048`。
- 被测：G0 `3a3f1a917dd9dd12988ecbcf9dcaef87db2428c8`；REUSE `5b6146fbc49e754e6d4235d9e356ddd15a822ad4`。它们仍是未合并的业务分支，不能写成main应用已经升级。
- 工具PR #12，工作流被测提交 `ccbaa3a8b199a74ab5e86fea890750cd5342665c`。[标准runner run39982127800](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39982127800)两个job均success；常规CI run39982134093也success。

## 结论

ENV-002的两项REUSE业务缺陷在此固定head的验证范围内已修复：

1. 原独立延迟确认诊断现在2个create被接受、0被拒，回答结束后发出后续请求；新sequencer单元回归进入50项单元测试。
2. 保留名称`constructor/toString/__proto__`查找无异常；新增真实dev笔记回归在注音开/关两模式正常。G0新增setup失败清理的两项真实dev回归也通过。

仍未解决：Cookie最后字符变更测试可能产生相同签名字节，见CI-003固定诊断与PR #5 review5630758590。两个新head没有修改signing/access测试；一次全绿不证明该不稳定性消失。没有证据表明未授权者能伪造payload，勿夸大为访问绕过。

## 实际命令与耗时

标准runner：Node22.23.3、pnpm11.25.0、官方Playwright Chromium、标准ubuntu-24.04。

| 固定源码 | frozen install / 真实tsc / build | static / unit | 离线浏览器（模拟） | 真实Vinext dev浏览器（模拟上游） |
| --- | --- | --- | --- | --- |
| G0 3a3f1a9 | exit0；9.035 / 4.946 / 4.944秒 | exit0；34/34 | 22/22，24.600秒 | 21通过0失败1跳过；33.836秒含启动与清理 |
| REUSE 5b6146f | exit0；11.545 / 7.944 / 8.105秒 | exit0；50/50 | 25/25，36.081秒 | 24通过0失败1跳过；58.074秒含启动与清理 |

命令：项目 `pnpm install --frozen-lockfile`、`node node_modules/typescript/bin/tsc --noEmit`、`pnpm build`，再 `node tests/run.mjs static/unit/e2e --report ...`；真实dev由 `python3 scripts/ci/verify_claude.py --source verified-source --mode real-dev --report-dir ...`启动。工作流包含完整命令，机器结果见 `verification/ENV-003/RUNNER_RESULTS_2026-10-24.json`。跳过项为harness-only重配Host测试，非手动略过失败。

本地Node24.19.0：两份源码各自安装/tsc/build/凭证扫描/原评测数据检查/static/unit全部exit0；unit34/34与50/50。安装约7.9秒、tsc约7.8秒、build约7.4秒，详细命令与每项真实耗时在 `LOCAL_RESULTS_2026-10-24.json`。两版本并行，耗时不是性能基准。

独立旧诊断：`node .../reproduce_edges.mjs reuse/prototype results/edges`，exit0；输出不是完整断言或真实AI测试。新笔记正向筛选的真实dev测试1/1（11.888秒含启动/清理），setup清理2/2（6.598秒）。未重复跑本地无法连通的完整WebRTC组，用标准runner提供该证据。

## 失败、清理与验证边界

- 首次笔记筛选误写为不存在的测试名，工具明确exit1且0测试；没有算作通过。改正时曾拒绝已有假值环境文件，exit2；再遇到自己上次留下的vinext锁，exit2。确认端口空闲、锁属于本次目录后清理重试，才得到上面的1/1。三个失败记录均保留于本地机器结果。
- 两版本标准runner的Worker探针均mock地址=true、code策略、blockedExternal=0；Worker恢复、假值文件删除=true，后续 `git diff --exit-code`和假值文件不存在检查通过。
- 本地程序finally报告删除，但后续工作区读发现REUSE原假值文件仍存在；原因未定位。核对文件完全等于本次生成的假值后单独删除，并清掉端口已空闲且属于本目录的遗留锁；再独立读取确认两目录无`.dev.vars/.env.local`，Worker blob与远端相同、tracked diff exit0。没有删除未知环境配置、结束未知PID或记录凭证。
- 快照通过275/297个blob和完整tree hash核对；CLI未执行git fetch/checkout。只改自己的工具、文档、证据与状态，冻结源码和测试未改。
- 构建、离线harness、真实dev、真实AI、真机是不同层次。全部语音对端和模型均模拟；未验证真实OpenAI事件时序、VAD/识音、音质、真机、负载、商店与商用能力。

## 交Claude的动作

1. 先读最新main及PR #12结果，不覆盖CONTENT-002的34条草稿和docs/07。修Cookie断言并定义非规范Base64url行为，跑确定的回归，再将同一改动同步到两个业务分支。
2. 合并顺序仍先PR #5、再PR #9；先吸收最新main并合并PROJECT_STATE任务状态，不能用旧表抹掉Codex任务。共享规则不改。
3. 业务PR合并后，Codex再把static/unit/模拟浏览器加入常规main CI（CI-002）。本PR只是独立固定head复核，不提前宣称业务已进main。
4. 真机与真实API依旧需另行授权的私有HTTPS测试环境与费用；本轮没有授权、没有执行。

用户要求本轮于2026-10-24 01:50 JST停止执行；最终停止交接会再列实际main、各PR与剩余事项。
