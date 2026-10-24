---
name: Care Kotoba
description: 外国介護職員のための、現場の日本語の練習（手机优先的网页 / PWA 原型）
colors:
  primary: "#7861c5"
  primary-deep: "#6450ac"
  primary-action: "#7c65bd"
  primary-strong: "#5b4399"
  ink: "#282737"
  ink-dark-button: "#333044"
  muted: "#8a8999"
  page: "#f8f9fc"
  paper: "#ffffff"
  line: "#eaeaf1"
  soft-lavender: "#f0ecfa"
  soft-mint: "#edf7f2"
  stage-plum: "#232035"
  stage-plum-glow: "#39304e"
  stage-caption: "#efdef8"
  tint-lavender: "#f0eafa"
  tint-mint: "#eaf5f0"
  tint-peach: "#fcf1e7"
  tint-blue: "#edf3f9"
  tint-pink: "#f9edf1"
  draft-blue: "#4c6f8c"
typography:
  display:
    fontFamily: "DM Sans, Noto Sans JP, -apple-system, Hiragino Kaku Gothic ProN, Yu Gothic, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "1.2px"
  headline:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: "28px"
    fontWeight: 550
    letterSpacing: "0.8px"
  title:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  caption-stage:
    fontFamily: "DM Sans, Noto Sans JP, sans-serif"
    fontSize: "22px"
    fontWeight: 450
    lineHeight: 1.85
    letterSpacing: "1px"
rounded:
  control: "10px"
  card: "15px"
  panel: "24px"
  pill: "25px"
spacing:
  gutter-mobile: "20px"
  gutter-desktop: "40px"
  section: "31px"
components:
  button-primary:
    backgroundColor: "{colors.primary-action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "44px"
  button-dark:
    backgroundColor: "{colors.ink-dark-button}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "44px"
  button-soft:
    backgroundColor: "#f1ecf9"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.control}"
    height: "44px"
  scene-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  modal:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "28px"
  conversation-stage:
    backgroundColor: "{colors.stage-plum}"
    textColor: "{colors.stage-caption}"
    rounded: "{rounded.panel}"
    padding: "25px"
---

# Design System: Care Kotoba

<!-- 2026-10-24 Claude（DESIGN-SKILLS-001）按 impeccable `document` 的扫描模式，从 prototype/app/globals.css 和渲染结果整理。
记录的是**现有**界面，不是新的设计方向。标「待确认」的描述性语言需要用户确认；改了 globals.css 的颜色、字号、圆角或组件之后，同步更新本文件。 -->

## Overview

- 现有界面：白底和浅薰衣草紫的卡片，紫色为主色，配薄荷、蜜桃、浅蓝、粉色的淡色块；会话页是深紫色的「舞台」，中间是一个发光的球形波形。整体安静、柔和。
- 设计概念图（`design/ui_concept.png`，不是已完成软件的截图）的方向是：暖米色背景、明朝体标题、深紫主按钮、薄荷色强调、真实的场景照片。现有原型还没有采用这个方向。是否转向，由用户决定。
- 暂定的北极星（待确认）：「安心して言い直せる場所」，即一个可以放心重来的练习场所。

## Colors

- **主色**：紫色 `primary`（#7861c5），按钮用 `primary-action`。文字和需要对比度的地方用更深的 `primary-strong`（#5b4399）。
- **中性色**：页面 `page`（#f8f9fc），卡片 `paper`（白），分隔线 `line`，正文 `ink`（#282737）。
- **分类淡色**：`tint-lavender` / `mint` / `peach` / `blue` / `pink`，用来区分 8 个场景分野。每种淡色配一个文字色：`globals.css` 的 `.lavender` 等类定义 `--tint` / `--tone`。可读性层（A11Y-001/002）把这些文字色调深到 AA。
- **会话舞台**：深紫径向渐变，`stage-plum` 到 `stage-plum-glow`，字幕色为 `stage-caption`。
- **草稿**：核心场景草稿用 `draft-blue`（#4c6f8c）和虚线边框，表示「审稿前」。
- 现状说明：很多颜色是写死在规则里的一次性数值，没有全部变成变量。另外，可读性层是追加在文件末尾的覆盖规则（`/* 2.11 -> 4.68 */` 这类注释记录了调整前后的对比度）。整理变量时要保留这些对比度。

## Typography

- 字体：DM Sans 用于拉丁字母，Noto Sans JP 用于日文（从 Google Fonts 加载），后备为系统字体。拉丁字母大多是全大写、加大字距的小标签（例如 `LEARN A LITTLE. CARE A LOT.`）。
- 层级（手机）：
  - 首页问候：27px / 600；
  - 页面标题：28px / 550；
  - 主视觉标题：34px / 600，行高 1.55；
  - 区块标题：16px / 600；
  - 正文：14px，行高 1.7；
  - 标签：11px。
- 会话字幕：22px，行高 1.85。
- 注音（`<ruby>`）：`rt` 至少 10px（A11Y-001）。
- 现状说明：用到的字号多达十几种（8–34px）。1440px 桌面上还有 41 处小于 11px 的文字（taste-skill 检查，见 `verification/DESIGN-BASELINE-001/`）。

## Layout

- 手机（≤700px）：
  - 顶栏加底部 4 个标签的导航（ホーム / シーン / ノート / 学習記録）；
  - 左右留白 20px；
  - 卡片单列，推荐场景横向滚动。
- 桌面：左侧边栏（导航、鼓励卡、法人管理入口、个人资料），中间主栏，右栏放每日目标、本周节奏和今日表达。主栏最大宽度 1350px，留白 40px。
- 练习画面：全屏覆盖层。上方是会话舞台，下方是会话记录、提示和输入区。输入区包含麦克风（「声で入力」）和发送按钮。
- 弹窗：手机上从底部滑出（有拖动条），桌面上居中，宽 560px。

## Elevation & Depth

- 基本是平面加极淡的阴影（`--shadow: 0 8px 30px #29263d04`）。弹窗阴影较深（`0 25px 100px #2d143b26`），背景用模糊遮罩（`backdrop-filter: blur(7px)`）。
- 会话舞台的球体用多层内阴影和光晕做出立体感，是界面里唯一明显「发光」的元素。

## Shapes

- 圆角：
  - 控件（按钮、输入框）10px；
  - 场景卡片 15px；
  - 面板和弹窗 24px；
  - 标签 25px（胶囊形）。
- 现状说明：实际用了十多种圆角（4–25px），taste-skill 判为「圆角混用」。

## Components

- **按钮**：
  - `btn-primary`：紫底白字，主要操作；
  - `btn-dark`：深色，首页主视觉里用；
  - `btn-soft`：淡紫底；
  - `btn-white`：白底加边框。
  - 最小高度 44px。
- **场景卡片**：上半是淡色插画区（图标、装饰圆环、贴纸标签），下半是英文小标题、日文标题、时长和等级。
- **分类图块 / 图标**：图标放在淡色方块里。taste-skill 指出这是 AI 生成界面最常见的特征之一，见评审报告。
- **会话舞台**：深紫面板，状态文字、字幕、球形波形、「ゆっくり聞く」和「ヒント」按钮。
- **反馈卡**：标题、摘要、做得好的地方、改进（引用学员原话）、「この場面だけもう一度」。
- **草稿标记**：虚线边框、`draft-blue` 色、「草稿」贴纸。

## Do's and Don'ts

- **Do**：
  - 保持 WCAG AA 对比度和至少 24px 的点击区域。改颜色后运行 `verification/A11Y-001/audit.mjs`（390px 和 1280px）。
  - 文字以日语为主，汉字加注音，辅助说明用学员选择的语言。
  - 主行动一屏一个。
  - 用真实的场景文字（引用学员原话），不用装饰性的大数字。
- **Don't**：
  - 不显示能力认证类的分数，不用排名、连续天数断掉之类会制造惩罚感的设计。
  - 不用会让人以为是真实机构或真实人物的照片和名称。所有场景都是虚构的。
  - 不在没有用户确认的情况下更换整体视觉方向（例如改用概念图的米色和明朝体）。
  - 不降低对比度、字号或点击区域来追求「更简洁」的观感。
