# 基础课辅助语言包

优先支持中文zh、越南语vi、马来语ms、印度尼西亚语id、缅甸语my；日语为学习主语言和默认，英语en保留可选、降低优先级。语言由用户选择，不依据国籍自动推断。ms不是my，也不能用印尼语代替马来语。

vi.json、ms.json、id.json、my.json以及可选en.json各有24主题、96场、384句对话，均为draft_unreviewed编辑草稿；中文仍在既有catalog。未经母语者和介护专业人员审稿，不代表临床建议、资格评定或完整App语言支持。

格式沿用Claude I18N-001接口：顶层locale/status/topics/scenes；topic按ID给title；scene按ID给title/goal/context/check以及按原dialogue顺序的lines。null或缺项表示未译；不借用其他语言冒充已翻译。审稿状态按实际填写，不自行写成已审核。

完整检查：`python3 tools/ssw-basic/check_locales.py --require-complete`。部分包省略该参数；8项导入测试见test_check_locales.py。工具检查结构、ID与字形存在性，不检测或认证翻译质量。

App消费和生成器归Claude。当前公开I18N生成器87bed74尚不接受ms，需先补SUPPORT/SCRIPT和UI枚举再运行，不能删包、改语言码或绕过验证。单包vi/id/my临时契约通过不意味着全部包已在旧App可用。实际UI、回退、字体、换行、真机和母语审稿另行验证。

这些译文基于项目公开的原创虚构课程新写，不复制官方教材译文。内部QA修正了部分范围、时间与楼层表述；S24台面用词及Burmese术语/姓名/正式程度仍需结合实际情境复核。Burmese使用Unicode/NFC文本，但不保证Zawgyi兼容或手机字体已验收。
