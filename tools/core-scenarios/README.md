# core-scenarios：把核心场景草稿接进应用（预览）

`content/scenarios/CK-*.json`（12 个核心场景草稿，内容由 Codex 负责）是唯一来源。`generate.mjs` 把它们复制成应用代码：

| 生成的文件 | 内容 | 用在哪里 |
| --- | --- | --- |
| `prototype/lib/core-scenarios-data.ts` | 学员能看到的字段：标题、场景、角色、开场白、学习目标、学员已知信息、例句 | 浏览器（场景卡、说明、注音） |
| `prototype/lib/core-scenarios-server.ts` | 隐藏信息、角色分支、反例、反馈规则、迁移题 | 只在服务端使用（`lib/core-prompt.ts`），不打包进浏览器 |

不要手改这两个文件。改 `content/scenarios` 之后，在仓库根目录运行：

```sh
node tools/core-scenarios/generate.mjs            # 重新生成
node tools/core-scenarios/generate.mjs --check    # 只检查（unit 测试里也会运行）
```

如果标题、场景、开场白、目标或例句变了，还要重新生成注音（见 `tools/furigana/README.md`），否则 `tests/unit/furigana.test.mjs` 会列出缺少注音的句子。

## 生成器检查什么

缺字段时不写任何文件，并列出全部问题：

- 文件名和 `id` 一致，`fictional: true`；
- `primary_skill` 是 clarification / refusal_respect / report_certainty 之一；
- 应用读取的字段都存在；
- 分支的 `reveals` 只引用本场景的 `hidden_information` id。

`npc_role_ja` 如果出现新角色，需要在 `prototype/lib/core-scenarios.ts` 的 `coreCasts` 里加上对应的会话对象，unit 测试会列出缺少的角色。

## 显示时的一处替换

草稿的「学員」是混进日语的中文词（学员），所以浏览器里显示成「あなた」。每次运行都会报告替换次数。`content/` 改正之后，这个替换自然不再起作用。

## 应用里的行为

- 默认隐藏。可以在「設定」→「コア練習（草稿）」里打开，也可以打开链接 `/?core=1`，选择会保存在本机。
- 打开后：首页多一个入口，场景页多一个「コア練習（草稿）」标签；「すべて」仍然是原来的 48 个场景。
- 草稿的练习记录照常保存，但不计入「練習したシーン / 48」。
- 选择草稿场景时不显示 4 种会话模式。服务端用草稿自己的指示：
  - 隐藏信息只有在学员的发话符合揭示分支时才说出，也不出现在提示和纠正里；
  - 角色不使用教练口吻；
  - 学员请求放慢时，角色真的放慢并分段；
  - 尊重拒绝本身就算成功，不要求问出理由；
  - 报告场景不补造原因、诊断或趋势。
- 反馈会收到场景的反馈规则、反例和例句，并且被要求：角色在对话中没有揭示的隐藏信息，不能要求学员知道。

以上已用模拟 AI 测过（`tests/unit/core-scenarios.test.mjs`、`tests/e2e/core-preview.e2e.mjs`、`voice.e2e.mjs` 最后一项）。真实模型会不会遵守这些指示（例如不提前泄露隐藏信息）还没有验证，需要 API 费用，属于 MODEL-001 / DEVICE-001。草稿也还没有经过介护经验者和日语教师审稿。
