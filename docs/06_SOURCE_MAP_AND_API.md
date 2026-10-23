# 源码与接口索引

| 路径 | 当前职责 |
| --- | --- |
| `prototype/app/page.tsx` | 学员入口、场景库、偏好、笔记、历史与练习导航 |
| `prototype/components/practice.tsx` | WebRTC、文字/演示模式、发话记录、结束与反馈 |
| `prototype/components/admin.tsx` | 虚构企业后台、筛选、任务、详情与样例CSV |
| `prototype/components/ui.tsx` | 原型共用UI、类型与浏览器本地存储辅助 |
| `prototype/app/globals.css` | 原型样式；与后续HTML目标设计有差异 |
| `prototype/lib/content.ts` | 48个场景、8类、参考表达、4个变式和虚构企业数据 |
| `prototype/lib/ai-server.ts` | 服务端密钥读取、上下文、调用与错误映射 |
| `prototype/app/api/*` | AI会话/反馈/朗读接口 |
| `prototype/vite.config.ts`、`worker/index.ts` | Vinext、Cloudflare及原Sites开发集成 |
| `prototype/public/` | PWA清单、图标、service worker |
| `prototype/examples/d1/` | 模板示例，不是产品数据模型 |

## 当前接口

| 路径 | 方法 | 用途 | 接手注意 |
| --- | --- | --- | --- |
| `/api/health` | GET | 返回是否有服务端配置及版本标签 | configured不证明余额、模型权限或生成成功 |
| `/api/chat` | POST | 文字角色对话、翻译、修正与后续建议 | 当前硬编码gpt-4.1-mini；structured outputs |
| `/api/feedback` | POST | 基于学员发话的会后反馈 | 当前硬编码gpt-4.1-mini；需教学评测 |
| `/api/session` | POST | 接收SDP并创建WebRTC Realtime会话 | 当前gpt-realtime-mini；转写gpt-4o-mini-transcribe；需可靠服务端控制/计量 |
| `/api/speech` | POST | 参考句语音播放 | 当前gpt-4o-mini-tts；实际支持需核查 |

没有真实的企业账户/合同/订阅/用量账本API可继承。当前Origin校验、私有站点外层登录和模板认证不能代替未来独立产品的鉴权。

## 建议数据边界（尚未实现）

账户与组织成员关系、个人/企业付费来源、席位与有效期、用量预留与结算、场景及规则版本、会话及发话、反馈证据、复练、企业任务、同意记录与审计记录应各有明确实体和权限。

采用模块清楚的统一服务端起步，配托管关系数据库、需要的对象存储与后台任务，再按实测瓶颈拆分。避免把所有状态放在前端localStorage或一个可随意改写的总积分字段。
