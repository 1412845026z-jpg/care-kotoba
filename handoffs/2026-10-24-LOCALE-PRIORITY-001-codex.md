# LOCALE-PRIORITY-001 — 用户语言优先级与马来语独立支持

2026-10-24 JST，Codex。用户最新要求优先面向中文、越南语、马来西亚、印度尼西亚和缅甸使用者；英语可以保留，但优先级较低。继续全部免费、不调用付费API、不充值、不部署。授权按需要使用技能/插件不改变费用边界。

## 本轮决定

- 日语为学习主语言；界面/辅助语言由用户明确选择，沿用日语默认。不依据国籍自动选择语言。
- 优先辅助语言：zh中文、vi越南语、ms马来语、id印度尼西亚语、my缅甸语。英语en保留可选，顺序靠后，不强制理解英语。
- 马来西亚在本轮先落实为马来语Bahasa Melayu，码ms；缅甸语码my仍是မြန်မာ。地区MY不能用来改写已保存的my语言偏好。
- 规范化优先级记录在content/ssw-basic/language-priorities.json。它是输入要求，不代表App已读取或所有译文已审核。
- Codex并行准备vi/ms/id/my基础96场辅助语言包，统一draft_unreviewed；英语已有草稿留作可选兼容。实际语言包交付与App接入分别记录。

## 给Claude：I18N-PRIORITY-002

范围沿用你的App/lib/components/tests/生成器职责；不要等待全量素材才处理语言结构。

1. `prototype/lib/i18n.ts`中央LOCALES建议顺序ja,zh,vi,ms,id,my,en；保留已有ja/en/zh/vi/id/my设置，不把my迁成ms。新增ms元数据：原文名Bahasa Melayu、BCP47标记ms或ms-MY；my继续my。
2. 增加真正的马来语UI草稿和Texts.ms；不把id、my、en文本直接挂在ms键上。核心导航、设置/语言选择、开始/结束、答案、笔记/删除、错误/声音不可用和数据说明优先覆盖这五种目标语言。未译处清楚保留缺译/回退标记，不把英语回退称为该语言完整支持。
3. `languageName('ms')`应为Bahasa Melayu (Malay, Malaysia)，与Indonesian和Burmese不同。storage.sanitizePrefs、API参数校验沿用isLocale中央枚举，不另造基于国籍的推断。
4. `tools/ssw-basic-app/generate.mjs`的SUPPORT与SCRIPT加入ms，文件名及pack.locale为ms.json/ms。拉丁字母检查只是字形合理性，不能证明Malay与Indonesian或English正确区分。
5. 补unit/i18n与e2e/i18n中固定六语言的断言；基础课覆盖根据实际语言包核对。生成器的未知topic ID检查仍需处理。
6. 真正消费语言包后重生App数据，保持草稿标记，不手改产物。缺译可使用既定的明确回退路径，输出实际语言的lang标记；不能把英语作为使用者必须会的前提。
7. 同步PRODUCT/DESIGN相关语言说明。不要把“支持国家”当作语言准确性、母语审稿或UI全量翻译的验收。

## 验收与回复

- ms和my能分别选择、刷新后保留；旧my不变；英语仍可选且排序靠后。
- 马来语正文lang=ms/ms-MY、缅甸语my、英语回退en；不得ms→id/my静默替换。
- 完整ms包应按24主题/96场/384台词映射，draft_unreviewed保持；vi/id/my也按实际交付内容生成。
- 390px下检查马来语/缅甸语导航、选择器和练习；结构/显示检查不能代替专业审稿。
- 请在新handoff登记任务领取、代码SHA、被测SHA、实际检查和下一步。当前是给你的任务，不等于你已收到或完成。

活跃会话继续约90秒只读检查main与双方分支，领取和提交前另查。技能工具按能改善实际工作来选；本轮优先并行草稿、独立语义QA和本地契约检查，不运行收费翻译。
