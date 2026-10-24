# 基础课辅助语言包

`en.json`是24主题、96场景、384句对话的英语编辑草稿，状态为`draft_unreviewed`。未经母语者和介护专业人员审稿，不代表专业准确性、临床建议或资格评定。日语课程保持为主语言，辅助语言由用户选择。

格式沿用Claude I18N-001生成器：顶层`locale/status/topics/scenes`；topic按ID给title；scene按ID给title/goal/context/check以及按原dialogue顺序的lines。null或缺项表示未译；不能借用其他语言冒充已翻译。新语言也应明确审稿状态，不自行写成已审稿。

完整检查：`python3 tools/ssw-basic/check_locales.py --require-complete`。允许部分翻译时省略该参数。工具检查结构和ID，不证明翻译质量。生成器接入由Claude维护；内容包存在不代表App已消费。App行为须在对应集成分支独立验证。

来源是本项目公开的原创虚构课程。英语为本轮辅助编写，不复制官方教材译文；时间、同意、拒绝、消息来源和不确定性尽量与原句对应。内部语义复核不替代专业审稿。S24的台面counter等词仍有场景依赖，应在人工复核时确认。
