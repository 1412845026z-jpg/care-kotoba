---
name: Care Kotoba
description: 外国介護職員のための、現場の日本語の練習（手机优先的网页 / PWA 原型）
colors:
  page: "#f6f1e8"
  paper: "#fffdf9"
  ink: "#2a2230"
  ink-2: "#4e4456"
  muted: "#6a5f6f"
  line: "#e6ddd0"
  line-2: "#d9cfbf"
  violet: "#55398a"
  violet-deep: "#452d74"
  violet-soft: "#efe9f4"
  mint-ink: "#2e6650"
  mint-soft: "#e2f0e8"
  coral-ink: "#7a3420"
  coral-soft: "#fbebe2"
  stage-plum: "#2c1f33"
  stage-plum-glow: "#3b2b42"
  draft-blue: "#4c6f8c"
typography:
  display:
    fontFamily: "BIZ UDPMincho, Hiragino Mincho ProN, Yu Mincho, Noto Serif JP, serif"
    fontSize: "clamp(28px, 7.2vw, 36px)"
    fontWeight: 700
    lineHeight: 1.34
    letterSpacing: "0.02em"
  headline:
    fontFamily: "BIZ UDPMincho, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.45
  title:
    fontFamily: "BIZ UDPMincho, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "17px"
    fontWeight: 700
  quote:
    fontFamily: "BIZ UDPMincho, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "BIZ UDPGothic, Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Noto Sans JP, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "BIZ UDPGothic, Hiragino Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  card: "12px"
  inner: "10px"
  pill: "999px"
  panel: "24px"
spacing:
  gutter-mobile: "20px"
  gutter-desktop: "40px"
  card-padding: "20px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-start:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "56px"
  button-white:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    borderColor: "{colors.line-2}"
    rounded: "{rounded.pill}"
  button-soft:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.violet}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.paper}"
    borderColor: "{colors.line}"
    rounded: "{rounded.card}"
    padding: "20px"
  partner-line:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  correction-original:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
  correction-better:
    backgroundColor: "{colors.mint-soft}"
    textColor: "#1f4a39"
    rounded: "{rounded.inner}"
  correction-reason:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.coral-ink}"
    rounded: "{rounded.inner}"
  conversation-stage:
    backgroundColor: "{colors.stage-plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
---

# Design System: Care Kotoba

<!-- 2026-10-24 Claude（DEAI-001）重写。用户在 14:14 要求「视觉上去 AI 化，不像 AI 的通用模板」，并选择按 design/ui_concept.png 的方向。
本文件记录的是 DEAI-001 之后的界面；旧的薰衣草紫方案见 git 历史（DESIGN-SKILLS-001 版本）和 verification/DESIGN-BASELINE-001/ 的截图。
改了 globals.css 的颜色、字体、圆角或组件后，同步更新本文件。 -->

## Overview

- 世界观：**申し送りノート / 連絡帳**。介护现场交接用的笔记本：暖白的纸、深色墨水、明朝体写下的一句话。
- 每个画面先把「下一句话」交给学员：首页是今天的场景和对方说的第一句话，反馈页是学员说过的原话和更好的说法，会话页是对方此刻的话。
- 拒绝的东西（AI 通用模板的特征）：口号式主视觉、首页的发光球体、淡色方块里的图标、进度圆环和大分数、英文全大写小标签、✦✧ 装饰、渐变卡片、小于 12px 的文字。
- 暂定的北极星（待确认）：「安心して言い直せる場所」，一个可以放心重来的练习场所。

## Colors

- **地与纸**：页面 `page`（#f6f1e8，暖白），卡片 `paper`（#fffdf9），分隔线 `line` / `line-2`。只用细线分隔，不用阴影。
- **墨水**：正文 `ink`（#2a2230），次要 `ink-2`（#4e4456），说明文字 `muted`（#6a5f6f，在 `page` 上 5.4:1）。文字不用紫色或灰紫色。
- **紫**：只用于行动：主按钮、文字按钮、当前导航、本周的当天。`violet` #55398a，悬停 `violet-deep`，淡底 `violet-soft`。
- **薄荷**：「已经做到」：今天的场景标签、练习过的场景、更好的说法、达成的目标、每日进度条。
- **珊瑚**：只用于「为什么」：反馈卡里改写的理由。
- **会话舞台**：深梅色 `stage-plum`，到 `stage-plum-glow` 的径向渐变。这是全应用唯一的渐变，球体（对方）只出现在这里，球体颜色从薄荷过渡到紫。
- **草稿**：核心场景草稿用虚线边框和「草稿」标签；草稿区的说明色 `draft-blue` 保留。
- 实现：`globals.css` 末尾的「DEAI-001」层定义变量并覆盖旧规则。旧规则里写死的颜色已按 OKLCH 换算到新调色板（保留明度，冷灰紫的正文颜色换成梅灰墨色，中间调再压暗到 4.6:1 以上）。换算脚本和说明在 `verification/DEAI-001/`。

## Typography

- 字体（Google Fonts，开源 OFL）：
  - **BIZ UDPMincho**（明朝体）：标题、场景标题、引用的一句话（对方的话、学员的原话、更好的说法、ことばノート的表现）、Care Kotoba 字标。
  - **BIZ UDPGothic**（UD 黑体）：正文、按钮、标签。UD（Universal Design）字体为易读性设计，适合日语初中级学员。
  - 后备：Hiragino、Yu、Noto（系统已有时使用）。
- 层级：
  - 首页标题 28–36px / 700；
  - 场景标题 24px（今天的场景）、17px（场景卡片）；
  - 区块标题 19px；
  - 引用的一句话 18–20px；
  - 正文 14px，行高 1.75；
  - 标签和说明至少 12px。
- 注音 `rt`：`max(.55em, 10px)`，随正文缩放。
- 日文换行：标题使用 `word-break: auto-phrase`（按词组换行），避免「みてみ / る。」这样的断行。

## Layout

- 手机（≤700px）：顶栏（字标、試作版、辅助语言、设置），底部 4 个标签（ホーム / シーン / ノート / 学習記録），左右留白 20px。
- 首页从上到下：日期 → 「次の声かけを、ここで。」 → **今天的场景卡**（场景标签、标题、对方的一句话、こんな場面 / 今回の目標、全宽的「N分、練習する」）→ 上次保存的一句话（有时才显示）→ ほかの場面（手机上横向滚动）→ 8 个分野 → 一句鼓励和「デモで操作を体験」。
- 桌面：左侧边栏，中间主栏，右栏放今日练习、本周、今日のひとこと。没有记录时，本周卡片显示一句说明，不画空图表。
- 反馈页从上到下：标题 → 一句引导 → **引用的原话卡**（原话、更好的说法、理由、「この場面だけもう一度」）→ AI 的振り返り → 伝わったこと → よかったところ → 按钮 → 脚注（AI 的目安分数只在这里以小字出现，并说明不评判日语能力、介助技术和能否独立工作）。
- 场景一览：≤560px 单列，平板两列，桌面三列。

## Elevation & Depth

- 平面：卡片用 1px 细线，不用阴影。弹窗保留遮罩和阴影（它确实在上一层）。
- 会话舞台的球体保留内阴影和光晕，表示「对方在这里」。

## Shapes

- 卡片 12px，卡片内的引用框 10px，会话舞台和弹窗 24px。
- 按钮全部是胶囊形（999px），与概念图一致。

## Components

- **今天的场景卡**：薄荷场景标签 → 明朝体标题 → 「利用者の○○さん」和对方的一句话（暖白对话框，带一个小三角）→ 两项简报 → 56px 的主按钮。
- **场景卡片**：分野（线性图标 + 名称）、练习済み / 草稿标签、明朝体标题、对方的第一句话、时长 · 等级 · 箭头。没有插画区和英文小标题。
- **分野图块**：线性图标与文字同色，不放在淡色方块里。
- **反馈卡**：标签「あなたのことば」→ 原话（暖白）→ 「こんな伝え方も」→ 更好的说法（薄荷）→ 理由（珊瑚）→ 按钮：聞いてみる、保存、この表現で練習、**この場面だけもう一度**（紫，主要的下一步）。
- **会话舞台**：状态标签使用日语（「音声でAIと練習」「文字でAIと練習」「デモ（操作の体験）」等）。
- **焦点与浏览器部件**：焦点环 3px 紫色；选中文字、光标、滚动条按调色板设定。

## Do's and Don'ts

- **Do**：
  - 改颜色或字号后运行 `verification/A11Y-001/audit.mjs`（390px 和 1280px）：对比度、24px 点击区域、12px 以下文字都应为 0。
  - 每屏一个主行动；先给「下一句话」，再给说明。
  - 引用真实的场景文字（虚构的利用者和同事），用明朝体显示。
  - 新增界面先查 `.impeccable/surfaces/prototype-app-page-tsx.md` 的方向说明。
- **Don't**：
  - 不加标题上方的小标签（eyebrow / kicker），不用英文全大写标签。
  - 不用渐变（会话舞台除外）、发光球体（会话舞台除外）、淡色方块图标、✦✧ 之类的装饰字符。
  - 不把分数做成第一视觉，不用进度圆环、排名或会制造惩罚感的连续天数。
  - 不用会让人以为是真实机构、真实人物的照片和名称。需要照片时，先取得许可清楚的素材（尚未决定）。
  - 不降低对比度、字号或点击区域来追求「更简洁」。
