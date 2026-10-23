# Care Kotoba 交接入口

归档日期：2026-10-23，日本时间。项目名称：Care Kotoba，原资料所在项目文件夹名为“伦敦的雾”。本包用于转交 Claude 接续开发。

## 先怎么用

1. 解压整个包；Claude Code 打开本目录，先读 `CLAUDE.md` 和 `docs/01_PROJECT_CONTEXT.md`。
2. 将 `CLAUDE_START_PROMPT.txt` 的内容发给 Claude，要求实际检查代码并推进第一阶段工作。
3. 如使用 Claude 网页版，可上传同名独立交接 TXT：它包含指令、事实摘要、文档及核心业务源码。完整文件树、锁文件和素材仍以本 ZIP 为准。
4. 完整产品/UI/商业方案在 `design/Care_Kotoba_Product_and_Sales_Plan_2026-10-23.pdf`；离线阅读其文字版可用 `docs/PRODUCT_PLAN_TEXT.txt`。
5. 可编辑、可点击的设计稿在 `design/care-kotoba-interactive.html`。直接用浏览器打开即可；字体联网失败时使用系统字体。所有人物、对话及反馈是演示，不录音、不调用AI。
6. 可运行原型的源码在 `prototype/`。先遵循 `docs/03_RUN_AND_MIGRATE.md`，区别原型、设计目标和生产要求。

## 归档边界

- `prototype/` 是已部署源码提交的130个原文件，保留原相对路径与锁文件；与清单逐文件校验。
- 原型为网页/PWA，尚无可提交商店的原生安装包。企业后台是明确标示的虚构示例。
- 本次取回源码后重新完成依赖安装、TypeScript检查和构建；没有进行真实AI、支付、真机或负载测试。
- 没有打包API密钥、源仓库临时访问凭证、浏览器Cookie、登录会话、账单资料、Git历史、依赖安装目录或构建产物。
- 原私有站点继续保留。归档没有重新发布、改变访问权限、关闭站点或归档远程仓库。
- `prototype/.openai/hosting.json` 保留的是非敏感的原站点配置，用于源码追溯；它不授予 Claude 原平台访问权。不要据此自动覆盖原站点。
- 浏览器 localStorage 的个人记录不在包中；当前也没有已实现的生产学习数据库可导出。

## 文件导航

- `CLAUDE.md`：项目约束与工程接手规则。
- `docs/01_PROJECT_CONTEXT.md`：目标用户、产品差异与确定要求。
- `docs/02_STATUS_AND_GAPS.md`：实现、验证与未完成事项。
- `docs/03_RUN_AND_MIGRATE.md`：现有工程运行、环境配置和迁移注意。
- `docs/04_BUILD_BACKLOG.md`：按验收推进的工作顺序。
- `docs/05_COMMERCIAL_AND_COST.md`：销售、企业优惠、预算边界。
- `docs/06_SOURCE_MAP_AND_API.md`：代码位置与接口。
- `docs/07_OPEN_SOURCE_AND_NOTICES.md`、`research/`：开源复用初筛及证据。
- `verification/`：本次检查与源码文件清单。
- `tools/verify_archive.py`：解压后校验文件完整性与明显敏感信息。

这些材料是接手基线，不是已实现功能或商用容量的证明。方案中的价格、工期、训练效果和容量目标应按实际验证更新。
