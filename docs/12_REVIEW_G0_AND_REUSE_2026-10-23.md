# G0 fix1 与 REUSE 仓库复核（2026-10-23）

结论：G0原先的static兼容和非语音dev交互问题已复核解决；PR #9新增功能存在两处已复现的业务缺陷，建议修复后再合并。语音全套尚受本机ICE环境阻塞，不能以tsc/build或其他模拟通过替代。

固定版本：main1c028f02ec722deedfa139efda007b68195f624e；G0 PR #5 @8bc18481865c2259e084a59a1f5e419e18ed1035；REUSE PR #9 @a43e7edebf5cf7be8a7f0c8b9a3ac0c975dd2207。两分支未合并。证据见verification/ENV-002/CODEX_RESULTS_2026-10-23.json。

## 需要Claude修复

### P1：response.created确认前连续输入，仍会漏回复

位置：prototype/lib/realtime-client.ts:117、138–141、173–174。activeResponses只在收到服务端response.created后递增；发出response.create到收到确认之间仍为0。语音练习sendText路径不设置busy，能够连续提交。

独立模拟复现：确认消息延迟，连续提交两条文字；客户端发出两次response.create；模拟服务端接受第一次（其上下文只有第一句话）、拒绝第二次。随后交付created/error/done，客户端pending=false，未请求后续回复。第二句留在转写中，但没有对应的后续响应请求。该复现不依赖WebRTC，不调用API。

请在发送create时同步占用pending/in-flight状态，统一处理开场、文字输入、done后的flush；响应确认前和active期间都应排队。将拒绝/取消处理纳入状态恢复，避免把conversation_already_has_active_response直接吞掉后丢请求。新增延迟ack、开场尚未确认和连续输入的纯单元回归。

### P2：注音字典的原型属性导致笔记页错误

位置：prototype/lib/furigana.ts:29–31。FURIGANA[text]会取得继承属性；constructor、toString、__proto__为truthy但不是标注字符串，传入parseRuby后TypeError。

纯函数三个输入均复现；真实Vinext页面用虚构本地笔记text='constructor'复核：点击「ノート」后进入“This page couldn’t load”错误边界，笔记页不可见。错误被边界捕获，所以pageerror数组为空，不能据此报告页面正常。

请只接受字典自身的字符串值（例如Object.hasOwn加typeof），其他文本原样显示；增加保留属性名的纯函数测试和笔记页回归。

### P2（测试工具）：setup中途失败缺少清理

位置：prototype/tests/e2e/helpers.mjs。mock/harness在chromium.launch之前启动；launch失败则setup不返回env，after中的env?.close无法清理。

本轮首次漏传本机浏览器缓存路径，launch报缺失可执行文件后进程没有自行结束，以Ctrl+C终止exit130；修正命令后非语音13/13通过。初始配置错误来自Codex，但它暴露了测试工具的清理缺口，不计为应用功能失败。请在setup的错误路径关闭已创建资源并保留原异常，避免CI失败挂住。

可运行的独立诊断：在PR #9源码上使用verification/ENV-002/reproduce_edges.mjs，传入prototype路径和临时输出目录，例如 `node verification/ENV-002/reproduce_edges.mjs prototype /tmp/ck-review-edges`。需要先把诊断脚本带到该checkout；它会打印现状，不是一个exit0即代表缺陷已修复的断言测试。

## 本轮实际结果

| 项目 | G0 @8bc1848 | REUSE @a43e7ed |
| --- | --- | --- |
| 本机frozen install | exit0，8.157s | exit0，8.095s |
| 本机真实tsc | exit0，7.423s | exit0，7.499s |
| 本机生产build | exit0，6.663s | exit0，6.536s |
| static（已安装真实React类型，TS5.9.3） | exit0，1.926s | exit0，1.901s |
| unit（模拟/纯逻辑） | 34/34，exit0，0.716s | 38/38，exit0，0.869s |
| 真实dev，code策略，完整浏览器组（上游本机模拟） | 20项：11通过、8语音失败、1明确跳过；157.594s | 22项：12通过、9语音失败、1明确跳过；176.787s |
| 真实dev，local策略，非语音组 | 12项：8通过、4门禁策略跳过、0失败；18.079s | 本轮另作笔记边界诊断；code策略覆盖了所有非语音用例 |
| 离线harness，非语音组 | 未重复单独运行 | 修正浏览器路径后13/13，exit0；未单独计时 |

本机Node24.19.0/pnpm11.25.0，使用之前取得的仓库外Chromium153.0.8010.0；两项目独立并行检查，耗时不是性能基准。

Node22.23.3远端日志也已读取：G0 run39964673408，安装20.182s、tsc9.639s、build8.366s；REUSE run39966886778，安装19.812s、tsc9.889s、build9.091s，均exit0。当前CI不含浏览器测试。

所有完整浏览器组的非语音用例均通过；code模式跳过1条仅harness可测的Host/重配置用例，local模式跳过4条需要code策略的门禁用例，跳过原因明确，不算通过。

## 语音限制与分工

语音失败均在模拟Peer数据通道open之前：本机只观察到host/udp或tcp的0.0.0.0/::，remote/pairs为空。它说明本轮没有建立可用ICE连接。Node网卡枚举也报错，不能进一步断言机器只有loopback；受限运行环境与替代Chromium仍须在标准runner复核。

不要把8/9项连通失败写成8/9个已确认业务缺陷，也不要写成语音通过。标准runner测试接入仍由Codex负责，并按原约定在G0合并后给CI增加模拟测试；这份review不修改工作流或合并两个业务PR。

保持职责：Claude修冻结业务/测试；Codex负责锁文件、构建、CI和真实dev复测。PR #5先于#9，整合最新main时保留双方状态与新交接。真实AI、真机、教学审稿、企业隔离、服务端强制时长与用量对账未在本轮验收。

本轮临时修改的owned Worker仅用于阻止真实OpenAI网络和检查mock配置，执行后按原字节恢复；假值.env文件已删除，两checkout的git diff相对已核对index均exit0。没有冻结文件修改、依赖升级、真实API或部署。用户要求先推进开发，公开/申请已暂停。

## 收尾状态更正

收尾GitHub仓库REST GET显示private=false，当前已是Public。本轮Codex没有执行可见性变更，执行者未核实；不擅自恢复private。申请流程仍暂停。README仍写私有/命令未运行，和当前设置及真实CI不一致，后续文档同步应按实测更新。
