# CI-003结果：标准runner模拟语音已运行，Cookie测试待修

- 日期：2026-10-24 JST；作者：Codex。
- PR #12：`codex/CI-003-runner`；被测工作流提交 `6193e650e5982a7b01b607437124edef6408cacf`。
- [固定源码验证run39978029073](https://github.com/1412845026z-jpg/care-kotoba/actions/runs/39978029073)：总结果failure，不能写全绿。标准main CI在 `eada73b` 的run39976916161是success；PR #12自身常规CI run39978076537也success。
- 源码没有更新：G0 PR #5 @8bc1848；REUSE PR #9 @a43e7ed。

## 标准runner真实结果

环境：标准 `ubuntu-24.04`，Node22.23.3，pnpm11.25.0，按项目Playwright安装官方Chromium；无secret、无真实API。全部结果和真实耗时在 `verification/CI-003/RUNNER_RESULTS_2026-10-24.json`，完整TAP在Actions日志和7天artifact。

| 源码 | frozen install / tsc / build | static / unit | 离线浏览器（模拟） | 真实Vinext dev浏览器（模拟上游） |
| --- | --- | --- | --- | --- |
| G0 `8bc1848` | exit0，11.242 / 7.430 / 6.852秒 | static exit0；34/34 | 20/20，29.981秒 | 19通过、0失败、1跳过；42.998秒含启动与清理 |
| REUSE `a43e7ed` | exit0，9.651 / 4.690 / 4.730秒 | static exit0；38/38 | 22/22，25.253秒 | 20通过、1失败、1跳过；36.472秒含启动与清理 |

- 两个版本的全部模拟语音用例在标准runner均通过，包括REUSE现有的active-response排队用例。ENV-002更早的本机ICE失败不再是唯一语音证据，但不能把已有测试通过推断为新竞争缺陷不存在。
- 真实dev的一项跳过为仅harness能重配Host的用例，测试自身明确标记。不是手动跳过失败项。
- 两个真实dev探针均为mockBaseConfigured=true、code策略、blockedExternal=0；Worker恢复与假值环境删除均true，`git diff --exit-code`通过。
- G0官方浏览器安装较慢（约11分钟）；未增加超时或换成付费runner，最终完成。不是应用性能指标。

## 新确认的测试缺陷：COOKIE-ENCODING-001（P2）

REUSE真实dev唯一失败：`a wrong access code is rejected and the right one grants an HttpOnly cookie`，断言“a tampered cookie was accepted”。它把token末尾字符A变B。Base64url签名末尾可能包含未使用的pad bits；在此fixture中A/B解码为相同签名字节，因此不是实际改变了HMAC签名。

新增 `verification/CI-003/reproduce_cookie_encoding.mjs`，分别bundle两个固定head的真实 `lib/signing.ts`：固定假secret+counter14生成末尾A的合法测试token，改末尾B后字节相同、验证得到相同payload；实际改变签名首字符导致字节变化则被拒绝。机器结果在 `cookie-encoding-g0.json`、`cookie-encoding-reuse.json`。不记录真实token或凭证。

这个诊断需要先持有有效签名token，没有证明未登录者可得到授权，也没有证明能篡改payload。它确认现有“改最后字符就是篡改签名”的测试不稳定，且解析器接受非规范编码。

请Claude在自己负责的 `lib/signing.ts` / `tests/` 中做出明确选择：

1. 篡改测试必须保证签名字节真的不同，例如修改签名首字符；新增固定A→B编码变体的单元回归，避免随机通过/失败。
2. 若约定只接受规范Base64url，应验证字符/长度并对解码后重新编码的文本做一致性检查，同时为拒绝非规范编码增加测试。不要把这个加固夸大为修复已证实的未授权访问漏洞。
3. 同一工具函数用于访问和语音token，修改后跑purpose、过期、旋转等既有测试。原有两个REUSE业务缺陷仍照ENV-002处理。

## 本地脚本核对（不是标准runner结果）

本轮以 `--filter '^(?!voice:)'` 启动本地脚本，本意排除voice；Node按完整测试名匹配，实际仍执行了全部22项，结果12通过9本机ICE失败1跳过，exit1，177.740秒。保留真实结论，不写成非语音全套通过。脚本探针外部fetch=0，Worker恢复、假值删除为true，本地tracked diff exit0。以后只选非语音文件或用正向的明确测试名筛选，不用这个否定表达式排除整类文件。

本轮只改Codex负责的工作流/工具/验证记录与状态，没有改冻结源码/测试。PR #12保持未合并：总体验证仍红，等Claude修测试/业务代码后再固定新head复测。CI-002常规接入仍等G0合并。没有真实AI、部署、费用、可见性或申请操作。
