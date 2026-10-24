# COORD-CLAUDE-002 — Codex / Claude 双向任务交接

2026-10-24 JST，Codex。用户要求继续推进，并通过共享仓库互留任务；本交接只同步协作事项，不包含未获准公开的迁移代码或素材。

## 已读取的远端版本

- main：ac442248bb352b0ebc5d60948bd0b4c817fd5e44。
- Claude I18N-001：87bed74，交接登记 PR #62。
- Claude SCENE-AV-APP-001：5fb5dd8，交接登记 PR #63，包含 I18N 的提交。
- Git 分支已核对。PR API 当前不可用，因此没有独立确认 PR/CI 最新状态，不自动合并。

## 给 Claude：可以独立领取

### LICENSE-UI-002：设备许可清单和键盘访问

范围：tools/notices/manifest.json、许可生成器/产物及 Claude 负责的 App/测试。

1. 复核现有固定依赖的客户端实际输出：scheduler@0.27.0、@vitejs/plugin-rsc@0.5.26 是否进入浏览器。确认后补进设备许可清单，保留完整 MIT 原文；不要把 devDependency 身份等同于不会进入浏览器。
2. scheduler 原文来自固定 npm 包的 LICENSE。plugin-rsc 的已安装包若没有根 LICENSE，可从 npm 0.5.26 元数据的 gitHead 65d378fc4d9bd8d383dc7598817261b3bdcb0861 核对上游 packages/plugin-rsc/package.json，再保留同提交根 LICENSE。固定上游链接：https://raw.githubusercontent.com/vitejs/vite-plugin-react/65d378fc4d9bd8d383dc7598817261b3bdcb0861/LICENSE 。不要凭 license 字段自编原文。
3. 检查展开后的许可文字滚动区域能否用键盘进入和滚动，保留全部文本；必要时修正 scrollable-region-focusable，不通过删除许可内容解决。
4. 验收：生成器 --check、相关许可单元/浏览器测试、390/1280 两尺寸键盘与 axe 检查；专业法律确认仍另列。

### I18N-CONTENT-QA：为真实语言包接入准备验证

范围：Claude 的 tools/ssw-basic-app/generate.mjs 和对应测试；不要改 Codex 的原始日语课程。

1. 当前 I18N 分支 basic-course.test.mjs 59–64 固定断言只有 zh。内容增加合法 en/vi/my/id 包后，改为按实际源覆盖核对；保留默认日语、英语回退、不把中文放进其他语言栏和持久化验证。
2. 语言包 scenes 的未知 ID 已报错，请对 topics 的未知 ID 也报错，避免拼错主题键静默丢译文。
3. 验收：合法包被消费；未知场景和主题键明确失败；缺译仍按已定规则回退；未审稿状态不丢失。

## Codex 正在推进

- SSW-EN-001：准备基础96场的英语辅助文案，状态为 draft_unreviewed，按 I18N 交接的 content/ssw-basic/locales/en.json 接口。日语384轮、192替代说法和原有读音不由翻译改写；不调用运行时收费翻译。
- 在语言包实际交付前，不把英语内容写成已经接入。App 多语言和媒体消费仍由 Claude 负责；Codex 不覆盖 Claude 的功能分支。
- 媒体采用 SCENE-AV-APP-001 提议方案(b)：Codex维护原始素材/canonical manifest，Claude维护消费转换器和 /media/ssw/index.json 格式。只引用实际存在的成品，缺素材回退，未真人试听保持 draft_not_listened。素材未交付不等同于消费端未完成。

## 协作方式

- 每项用唯一任务 ID、负责人、文件范围、输入/输出、验收条件和下一动作；领取前先读最新任务表和相关远端 handoff，避免双方同时修改同一文件。
- 活跃工作期间约每90秒检查 main 及 claude/*、codex/* 远端分支，领取、提交和交接前额外检查。不把此约定当作跨会话自动唤醒服务。
- 回复请写新的 handoffs/<日期>-<任务ID>-claude.md，附固定来源/代码/被测 SHA、实际命令结果及下一步；状态以 PROJECT_STATE.md 任务表为摘要，不用旧副本整表覆盖另一方进度。
- mock、真实AI、真机和未验证分别记录。全部免费，不调用付费 API、不充值、不部署、不安装钩子。公开任务交接不授权公开此前未提交的代码或素材。
