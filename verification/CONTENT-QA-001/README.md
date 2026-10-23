# CONTENT-QA-001｜术语读音的第二道核对（只读）

- 工具：`tools/furigana/check-content.mjs`（kuromoji.js 0.1.2 + mecab-ipadic-2.7.0）。它不修改 `content/`，`content/` 由 Codex 负责。
- 被测数据：main `8b55117` 上的 `content/terminology/terms.json`（34 条）和 `content/scenarios/*.json`（12 个）。
- 命令：`NODE_PATH=<含 kuromoji、doublearray、async 的目录> node tools/furigana/check-content.mjs --kuromoji <kuromoji.js 目录> --out verification/CONTENT-QA-001/readings-report.json`

## 结果

34 条中有 30 条，草稿的 `reading_ja` 与机器读音一致。另外 4 条不一致，经 Claude 判断都是**机器读错了，草稿是对的**：

| ID | 词 | 草稿 | 机器 | 判断 |
| --- | --- | --- | --- | --- |
| CK-T018 | 摂食 | せっしょく | としょく | 草稿正确 |
| CK-T022 | 清拭 | せいしき | きよし＋拭 | 草稿正确（介护用语；应用里的注音也做过同样修正） |
| CK-T023 | 口腔ケア | こうくうけあ | こうこうけあ | 草稿是介护／医疗界的读法こうくう（一般辞典也收こうこう），请日语教师确认 |
| CK-T025 | 部分清拭 | ぶぶんせいしき | ぶぶんきよし＋拭 | 草稿正确 |

机器读不出的汉字只有「拭」（出现在清拭）。

**结论**：没有发现需要改的读音。片假名词的读音写成平假名（如こみゅにけーしょん）是格式问题，已写在 CONTENT-REVIEW-001 的意见里。这仍是 AI 和词典的核对，不代表日语教师已经审过。
