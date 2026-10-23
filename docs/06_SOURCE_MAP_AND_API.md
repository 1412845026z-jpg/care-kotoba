# 源码与接口索引

| 路径 | 当前职责 |
| --- | --- |
| `prototype/app/page.tsx` | 学员入口、场景库、偏好、笔记、历史与练习导航；AI 练习前检查访问码 |
| `prototype/components/practice.tsx` | 练习页面：语音（通过 `VoiceSession`）、文字和演示模式，发话记录与修正，结束、反馈、诊断日志导出 |
| `prototype/components/access.tsx` | 访问码输入弹窗；未配置时提示改用演示 |
| `prototype/components/admin.tsx` | 虚构企业后台、筛选、任务、详情与样例CSV |
| `prototype/components/ui.tsx` | 原型共用UI与浏览器本地存储读写（读取后由 `lib/storage.ts` 校验） |
| `prototype/app/globals.css` | 原型样式；末尾一段为 G0-01 新增的状态样式 |
| `prototype/lib/content.ts` | 48个场景、8类、参考表达、4个变式、每个场景的会话对象（partner）、虚构企业数据 |
| `prototype/lib/ai-server.ts` | 服务端配置读取、访问 / 限流守卫、场景指令、OpenAI 调用与错误映射 |
| `prototype/lib/access.ts`、`signing.ts`、`rate-limit.ts` | 访问策略与签名 Cookie、HMAC 令牌、单实例内存限流 |
| `prototype/lib/models.ts`、`cost.ts` | 型号集中配置与停用日期；价格表与费用估算（不是账单） |
| `prototype/lib/voice-server.ts` | 语音会话上限、轮次检测（VAD）配置、会话令牌密钥 |
| `prototype/lib/realtime-client.ts` | 浏览器端 Realtime WebRTC 会话：麦克风、连接、断线、挂断、自动播放 |
| `prototype/lib/realtime-transcript.ts`、`voice-metrics.ts` | 按会话顺序排列的转写（纯函数）；延迟、用量、打断等指标 |
| `prototype/lib/feedback-quality.ts` | 反馈 / 纠正中的原话校验 |
| `prototype/lib/storage.ts` | localStorage 数据的类型与校验 |
| `prototype/app/api/*` | AI 会话 / 反馈 / 朗读、语音会话开始与结束、访问码、健康状态接口 |
| `prototype/tests/` | 离线静态检查、单元测试、浏览器测试、语音模拟对端（见其 README） |
| `prototype/vite.config.ts`、`worker/index.ts` | Vinext、Cloudflare及原Sites开发集成 |
| `prototype/public/` | PWA清单、图标、service worker |
| `prototype/examples/d1/` | 模板示例，不是产品数据模型 |

## 当前接口

| 路径 | 方法 | 用途 | 接手注意 |
| --- | --- | --- | --- |
| `/api/health` | GET | 是否已配置密钥（不返回密钥）、所用型号与距停用天数、访问策略、语音上限与 VAD | configured 不证明余额、模型权限或生成成功 |
| `/api/access` | GET / POST / DELETE | 查询是否需要访问码；用访问码换签名 Cookie；清除 Cookie | 试运行用的门禁，不是账户系统 |
| `/api/chat` | POST | 文字角色对话、翻译、纠正与后续建议 | 需要访问权限；型号为 `CK_MODEL_TEXT`；纠正必须引用学员最后一句话 |
| `/api/feedback` | POST | 基于学员发话的会后反馈 | 需要访问权限；非原话的引用会被删除并计数；需教学评测 |
| `/api/session` | POST | 接收 SDP，创建 Realtime WebRTC 通话；返回 SDP，以及 `X-CK-Session`（签名的 call_id）、`X-CK-Session-Max`、`X-CK-Model` 等响应头 | 需要访问权限；`resume=true` 时带上已有对话 |
| `/api/session/end` | POST | 用会话令牌在服务端挂断（`/v1/realtime/calls/{id}/hangup`），记录时长与客户端上报的用量 | 支持 sendBeacon；客户端用量不可信，不是账单 |
| `/api/speech` | POST | 参考句语音播放 | 需要访问权限；型号为 `CK_MODEL_TTS`；替代型号是否支持此接口待核实 |

没有真实的企业账户/合同/订阅/用量账本API可继承。Origin校验、访问码门禁、私有站点外层登录和模板认证都不能代替未来独立产品的鉴权。

## 建议数据边界（尚未实现）

账户与组织成员关系、个人/企业付费来源、席位与有效期、用量预留与结算、场景及规则版本、会话及发话、反馈证据、复练、企业任务、同意记录与审计记录应各有明确实体和权限。

采用模块清楚的统一服务端起步，配托管关系数据库、需要的对象存储与后台任务，再按实测瓶颈拆分。避免把所有状态放在前端localStorage或一个可随意改写的总积分字段。
