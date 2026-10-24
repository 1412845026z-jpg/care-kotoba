# LEGAL-UI-001｜App 内「ライセンスとデータの扱い」（Claude，2026-10-24）

- 来源：用户关心上架后的合法性（16:40）；LEGAL-001（Codex，docs/14）要求的「商店披露与第三方许可准备」中，App 内需要实现的部分。
- 分支：`claude/LEGAL-UI-001`，基于 `claude/SSW-BASIC-APP-001`（PR #59 未合并）。**PR 的 base 是 `claude/SSW-BASIC-APP-001`**：合并顺序 #57 → #59 → 本 PR。
- 这不是隐私政策或利用规约。正式文件在公开前起草，并由专业人士确认。没有调用付费 API，没有改依赖、CI 或部署配置。

## 做了什么

- 新页面「ライセンスとデータの扱い」（`components/about.tsx`）。入口：设置弹窗底部、每页的页脚。
  - **数据的去向（试作版）**：每项写清去向和说明，辅助语言为中文时附中文。内容按代码实际情况写：
    - 只存在本机：笔记、练习记录、复习计划、基础课进度、设置；
    - 发送给 OpenAI（美国）：AI 文字练习、反馈、只重练一句、语音练习。本应用服务器不保存对话内容，只留下语音练习开始、结束等技术记录（`api/session` 的日志，不含内容）；
    - 浏览器提供商：声音输入；
    - 设备或 OpenAI：朗读；
    - Google：字体，会发送 IP 等；
    - Cloudflare：分发；
    - 没有广告和访问分析；
    - 法人画面没有向雇主提供录音的功能。
  - **开源**：列出送到设备上的程序、字体和数据所含的 9 项（React 系列、vinext、Next.js、Lucide、ts-fsrs、BIZ UDPGothic/Mincho、kuromoji.js 与 mecab-ipadic〔用于生成注音数据〕），每项可展开看完整许可文本。只在服务器使用的组件和开发工具见 docs/07。
- 数据：`tools/notices/manifest.json` + `docs/licenses/*.txt` → `tools/notices/generate.mjs`（`--check`）→ `prototype/lib/notices-data.ts`，打开页面时才加载。
- 新增许可文本：`docs/licenses/REACT_LICENSE.txt`（react 19.2.6，适用于 react / react-dom / react-server-dom-webpack）、`VINEXT_LICENSE.txt`（vinext 1.0.0-beta.5）、`NEXT_LICENSE.txt`（next 16.3.4），均取自 npm 包内的原文（MIT）。

## 验证

- 代码提交 `fc63d62`。`node tests/run.mjs all`（离线 harness）：static 0、unit 106/106、e2e 70/70，在提交前的工作区运行；之后只加了一行 CSS（数据去向标题的行高）。
- 单元测试 `notices.test.mjs`：
  - 生成文件与 manifest、许可文本一致；
  - react、lucide-react、ts-fsrs、vinext、next 都在列表中，版本与 `package.json` 一致，并附有许可文本。
- e2e `about.e2e.mjs`：从设置进入；数据去向包含本机、OpenAI、Google Fonts、Cloudflare、广告；展开 ts-fsrs 后显示 MIT 全文；「もどる」回到首页。
- `audit.mjs` 新增该页面（展开一项许可）：390px 15 个画面、1280px 16 个画面全部 0。
- 截图：`verification/LEGAL-UI-001/screens/`。

**不证明：** 是否满足法律或商店要求（需要专业确认）；列表是否覆盖生产构建里的全部组件。

## 给 Codex

1. `docs/07` 补三行：React、vinext、Next.js 的 MIT 许可文本位置。
2. 建议从生产构建自动生成完整的第三方许可清单（例如 Vite/Rollup 的许可插件，或 `pnpm licenses list --prod`），和 `tools/notices/manifest.json` 对照。依赖和构建配置归 Codex。有遗漏时在交接里写出，Claude 补进 manifest。
3. 上架前的隐私政策和利用规约，可以从本页的「数据的去向」出发起草（需要律师确认）。
