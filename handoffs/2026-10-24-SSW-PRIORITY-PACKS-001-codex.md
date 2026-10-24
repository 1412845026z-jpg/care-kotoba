# SSW-PRIORITY-PACKS-001 — vi/ms/id/my基础课辅助文案草稿

2026-10-24 JST，Codex。用户优先语言为zh/vi/ms/id/my，日语为学习主语言，英语可选。按已约定分工交付源语言包，不接管Claude的App、组件或测试。

## 实际交付

- `locales/vi.json`、`ms.json`、`id.json`、`my.json`：每个24主题标题、96场标题/目标/上下文/练习要点、384句对话翻译。四包合计1536句，不把同一日语场景重复算作更多场景。
- 全部`draft_unreviewed`；中文源仍来自既有catalog，英语包留作可选。日语原文、假名、原中文、替代说法未改。
- 马来语为ms/Bahasa Melayu；缅甸语为my/မြန်မာ，两者独立。Burmese按Unicode文本编写并统一NFC，未进行Zawgyi自动转换保证或手机字体验收。
- 源文是公开main ac44224的原创虚构课程，本轮新写翻译；没有引入未获准公开的迁移代码、素材或历史，也没有复制官方教材译文。

## 本地验证和复核范围

- 五个独立JSON包（四个新增加可选en）完整结构检查通过：每包24/96/384；8项导入用例通过，含ms/my独立、未知ID、重复JSON键、缺译/行数和字段错误。
- vi/id/my分别使用未修改的Claude生成器87bed74运行`--json`单语言包临时数据契约检查，字段、原文保留和draft状态通过。此检查不等同全部包同时导入或App端验收。
- **ms当前确实被该旧生成器拒绝**：SUPPORT/SCRIPT没有ms。先完成I18N-PRIORITY-002再重生数据；不要删掉ms、改成my/id或绕过检查。ms文件存在时旧I18N生成器会整体报未知语言，不能据此把其他包写成App已可用。
- 内部编辑复核：vi、ms、id各检查384组台词及相应重点/完整说明；my细读10个风险场景和18个代表场景，共112条台词并抽查额外标题。不是四语言完整专业/母语审稿。
- 已修正：vi S18不擅加扣上按钮方向；vi S82明确日本地面层的楼层含义；id S31陈述不译成操作命令，S33不把现在推迟为稍后；my S94保留听不清而非完全听不到。

## 尚需真人确认

- S24台面词依实际场景确认：vi mặt bàn、ms kaunter、id meja。
- Burmese的ကျွန်ုပ်正式程度、姓名音译、介护/康复术语、S82日本1F的楼层理解、S87“之后打电话”是否有回电话语感。
- 其他词汇自然度、可读性及真实手机字体仍待目标语言使用者确认；不以脚本的字形检查冒充翻译质量检测。

## 给Claude的下一步

1. 优先完成LOCALE-PRIORITY-001交接的I18N-PRIORITY-002：中央枚举和生成器加入独立ms；保留旧my/en偏好，顺序ja,zh,vi,ms,id,my,en，英语非必需。
2. 将四个包与既有en按你的I18N生成器重新生成App数据。移除zh-only固定断言，改为真实来源覆盖验证；不要手合生成文件。
3. 确保五个目标语言的关键UI也是相应语言草稿，而不仅有课程文案。缺译要诚实标注实际回退语言；不把en/id复制到ms后称马来语支持完成。
4. 验证所选语言、刷新保存、答案前后、笔记/删除、缺译回退和390px字体/换行。ms/my与实际lang属性必须独立；Burmese真机渲染与母语审核分别记录。
5. 在新handoff报告固定代码/被测SHA、实际完成和未完成项。内容已交付不等于已合main、App已接入或审稿通过。

根目录可运行：`python3 tools/ssw-basic/check_locales.py --require-complete`、`python3 -m unittest discover -s tools/ssw-basic -p 'test_check_locales.py' -v`。单包契约复现：`python3 tools/ssw-basic/check_app_locale_contract.py --generator-ref 87bed74c2c1d3ac327bdb054c73711574b2125a3 --locale vi`（id/my同理；ms在旧生成器上预期报阻塞）。

全部免费：无付费API、充值、产品部署或钩子安装。当前使用现有本地工具和并行编辑/独立QA，不需要为这些静态包接入收费翻译服务。
