# 公开准备与 Codex for Open Source 申请草稿

2026-10-23。状态：准备完成，仓库仍为private；没有提交表单，没有给本项目新增许可证。用户本轮要求尝试公开并申请，取代早先保持私有的偏好。

## 已核对的条件

- 官方计划面向开源维护者，提供六个月ChatGPT Pro（含Codex）；小项目可解释生态重要性，个人身份本身不是排除条件。申请不保证入选；API额度与Security可能另行审核。
- 官方申请表要求GitHub个人资料与仓库公开、维护角色、最多500字符的项目理由，并通过关联ChatGPT的邮箱接收结果。API额度字段涉及组织ID；实际表单的必填状态以填写时页面为准。
- 提交表格意味着同意项目条款。当前没有提交或接受新的条款；姓名、ChatGPT邮箱与组织ID由用户在官方表单确认，不写入仓库，不用GitHub邮箱替代推定。
- 当前没有根项目LICENSE；公开源码与正式开源授权分别处理。MIT、AGPL等会带来不同的复用义务，应按商业计划选择，不能因为依赖有MIT许可就许可整个项目。

官方来源（2026-10-23核对）：
- https://learn.chatgpt.com/community/codex-for-oss
- https://learn.chatgpt.com/docs/codex-for-oss-terms
- https://openai.com/zh-Hans-CN/form/codex-for-oss/
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository

## 公开范围和检查

- 公开当前仓库会让所有人读取源码、历史、分支、交接ZIP、设计/商业文档、PR讨论和Actions日志，并能fork。再转私有不会撤回已经产生的副本。
- 本轮读取21个可见ref，遍历36个祖先提交、27个tree，核对342个不同blob的Git SHA-1；ZIP内172个文件成员、1份PDF抽取文本也扫描。3份PNG只做二进制扫描，没有OCR。
- 9个issue/PR主体、1条issue评论、9组review、25份可取得的Actions作业日志已做模式扫描。未发现所列已知凭证格式，未跟踪本地.env/.dev.vars文件；12处赋值候选均属于隔离的单元测试或e2e夹具。
- 旧Sites hosting.json只含d1/r2/project_id来源元数据，未发现secret字段。本轮不更改或访问旧Sites部署。
- 证据：verification/OSS-001/PUBLICATION_REVIEW_2026-10-23.json。该检查是尽力检测，不是绝对零秘密证明，不覆盖服务器不可见/已删除对象。

## 可复制的申请字段（各段少于500字符）

GitHub用户名：1412845026z-jpg

仓库URL：https://github.com/1412845026z-jpg/care-kotoba

维护角色建议：主要维护者（由用户确认实际职责）。

为什么该仓库值得考虑：

Care Kotoba 面向在日本养老设施工作的外国介护职员，训练听不懂时主动问清、尊重拒绝、报告时区分已确认与未确认。目前是个人维护的早期项目，已有可构建的网页/PWA原型、12个虚构场景规格、48条固定评测样本及无付费API的CI。我负责仓库、审查与长期开发，使用Codex和Claude协作。项目目前没有成熟的用户规模、下载量或生态采用数据，申请基于这一细分语言训练用途的潜在价值，希望获得酌情考虑；真实语音、教学效果与商用能力尚未验收。

其他说明（许可未决定时必须如实保留；决定后再更新）：

这是新项目，许可证方案尚待确定，不能把公开仓库等同于已完成正式开源。内容均为虚构草稿，待介护经验者和日语教育者审稿。我们计划保留个人应用与企业服务的商业路径；申请将如实披露现有规模、许可状态和未验证能力。

可选：如果申请API额度，其使用计划：

如果另行获批API额度，拟用于本仓库的代码审查、维护自动化和固定虚构样本的模型回归评估。不会上传真实利用者介护记录，也不会把Pro权益等同于应用运行API额度。具体额度、有效期与调用预算以审批和用户授权为准。

不填造星标、下载量、用户数、教师背书、真机通过或商用验收。当前GitHub可见0 stars/0 watchers；未取得下载统计，不把它写成有下载量。新G0修复已推送，但Codex真实dev复测尚未完成。

## 接续步骤

1. 在公开执行前核对最终仓库与公开范围；如分支继续更新，增量检查新的blob/日志。浏览器对公开敏感访问的最终动作要求执行时确认，前置旧请求不替代该步骤。
2. 执行后分别核对GitHub Public标志与REST private=false，再更新README和PROJECT_STATE；本文件当前的准备状态是历史记录，不冒充执行成功。
3. 决定项目自有代码的许可证及适用范围，保留第三方声明和素材边界。当前没有擅自加入MIT/AGPL。
4. 由用户确认关联ChatGPT的邮箱及表单资料，执行提交前确认项目条款。表单确认成功/邮件回执才算已申请，审批邮件才算获批。

这份准备不部署软件、不调用OpenAI、不授予账户访问、不产生新费用。
