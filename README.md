# Care Kotoba｜介护日语训练

面向外国介护职员的日本养老介护现场日语训练项目。此仓库为用户控制的私有开发仓库。

## 当前状态

- 私有仓库已建立，默认分支为 `main`。
- 原项目交接归档与共享进度包已入库；远端文件的 Git 对象校验值与原始文件一致。
- Claude Code 已登录；尚需在 GitHub 完成 Claude 应用对本仓库的首次授权。
- 源码解包、共享指令合并和进度文件初始化等待 Claude Code 执行。当前不能报告为应用已部署或同步流程已验收。

## 接手资料

| 文件 | 用途 |
| --- | --- |
| [CLAUDE_IMPORT_TASK.txt](CLAUDE_IMPORT_TASK.txt) | 本次需要实际执行的导入、校验、共享进度配置和提交要求 |
| [原交接归档](Care_Kotoba_Claude_Handoff_2026-10-23.zip) | 164个文件，含130个原源码文件、产品方案、交互设计和历史验证记录 |
| [共享进度包](Care_Kotoba_Shared_Progress_2026-10-23.zip) | AGENTS.md、PROJECT_STATE.md和交接记录模板 |

Claude Code 接入本仓库后，读取并执行 `CLAUDE_IMPORT_TASK.txt`，在自己的工作分支推送结果并提交 PR。随后由 Codex 读取同一提交、核对导入内容并继续接续。

## 溯源与工程边界

- 原 Sites 源码快照为 `e643aed9b347cf5e1f157b4878626c6664063534`，不是本 GitHub 仓库当前提交。
- 原交接ZIP SHA-256：`b9aa73109a4b46eda7b7bf76f76b225d3ab940a57d2655f124ad3320eb238f12`。
- 共享进度ZIP SHA-256：`f9548e16a7aa3bf690cfe716b3847b5851de4d5aba143fdf83dc7d18299666a3`。
- 历史原型为网页/PWA；商店App、真实AI与真机闭环、企业隔离、订阅及负载仍须按实际实现与测试验收。
- 归档不含密钥或登录会话。首次导入无需购买服务、调用产品AI接口或发布生产环境。
- 共享记录以提交和推送为依据；双方聊天及未提交修改不会自动同步。
