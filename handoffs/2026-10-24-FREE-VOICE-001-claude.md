# FREE-VOICE-001｜免费的真机测试路径与「声で入力」（Claude，2026-10-24）

- 用户指令（12:54）：「真机测试……能用免费的就用免费，需要付费的先往后靠」，并要求跟进 GPT 那边的进展。
- 跟进结果：GPT 已完成 CORE-ENV-001，#35 和 #37 都已复测并合并（main `11148e7`，见 handoffs/2026-10-24-CORE-ENV-001-codex.md）。
- 分支：`claude/FREE-VOICE-001`，基于 main `11148e7`。
- 没有改依赖、锁文件、CI、部署配置。没有调用付费 API，没有部署。

## 做了什么

| 部分 | 文件 | 说明 |
| --- | --- | --- |
| 免费测试方案 | `docs/09` 新增「先做免费的真机测试」 | 让手机打开应用的三种免费方式：A. Android USB 转发；B. 同一 Wi-Fi（只能测界面）；C. 不设 API 密钥的私有 staging（部署需授权）。以及 F1–F10 免费测试项目。需要付费的 T1–T14 往后放 |
| 「声で入力」 | `lib/browser-speech.ts`、`components/practice.tsx` | 文字练习和演示中可以点麦克风按钮，用浏览器自带的语音识别（Web Speech API，`ja-JP`）把说的话变成文字，再确认、修改后发送。应用不付费 |
| 隐私说明 | 同上，以及 `lib/storage.ts`、`app/page.tsx` | 第一次使用时说明：声音可能由浏览器提供商（Google、Apple 等）的服务器处理，Care Kotoba 只收到文字，不保存声音。同意后才开始（`prefs.dictationConsent`，默认 false），可以在设置里改回，删除本机数据时也会清除 |
| 转写的标注 | `markSent` | 用语音输入的句子按语音转写处理（`source: 'voice'`）：<br>• 浏览器报告的置信度低于 0.5 时标为不确定（`asrUncertain`），界面提示学员核对，反馈不把它当作语言错误；<br>• 学员修改过的标为 `edited`；<br>• Safari 常报告置信度 0，视为未知，不标注 |
| 音声テスト | `lib/voice-preflight.ts`、`components/voice-check.tsx` | 新增两项免费检查：「声で入力（無料）」和「日本語の読み上げ（端末）」。缺少时状态为 `info`，不影响语音练习的总体判断 |
| 样式 | `app/globals.css` | 麦克风按钮、说明框；发送按钮加深颜色（原来的白色图标在浅紫底上对比度不足），点击区域改为 40px |
| 测试 | `tests/unit/browser-speech.test.mjs`（8 项）、`tests/e2e/dictation.e2e.mjs`（4 项） | e2e 用一个与浏览器接口相同的假识别器，测试：<br>• 同意流程；<br>• 低置信度的提示；<br>• 修改后发送；<br>• 反馈请求中带 `source`、`asrUncertain`、`edited`；<br>• 浏览器报错的提示；<br>• 浏览器不支持时不显示按钮；<br>• 音声テスト的两项检查 |

测试中修正的一个时序问题：最初在识别结束（onend）时才交出最终文字。学员如果在这之前已经开始修改，修改会被覆盖。现在在识别结果标为 final 时就交出，结束事件不再改动文字。unit 和 e2e 都覆盖了这个情况。

## 验证

被测提交：`6432dab`（之后的提交只改文档）。结果：static 0 错误，unit 89/89（main 81 + 新 8），e2e 54/54（main 50 + 新 4），可读性检查 390px 下 10 个画面对比度问题 0、小于 24px 的点击区域 0。Claude 沙箱：Node v22.22.0、Chromium 153 headless；AI 和语音识别器都是模拟的。

**不证明：**

- 真实手机上浏览器语音识别的准确率、iOS / Android 的差别、置信度的实际分布（属于免费测试 F5，需要在真机上做）；
- 浏览器提供商如何处理声音（这取决于浏览器，应用只能说明，无法控制）；
- vinext 真实构建，以及 CSP 下的行为（需 Codex 复测；Web Speech 不需要新的网络来源，但 Permissions-Policy 的 microphone 设置要确认）。

## 给 Codex

1. 用固定 SHA 复测本 PR：offline、real-dev，以及 SEC-001 的安全头检查。确认 CSP 和 Permissions-Policy 没有挡住「声で入力」和 `speechSynthesis`。真实 dev 中也用假识别器，不需要真的识别器。
2. docs/10 补充免费的手机测试方式，见 docs/09 的 A、C 两种：
   - A：本机运行 + Android USB 转发，写清 Windows / Mac 的步骤（Chrome `chrome://inspect` 的 Port forwarding）；
   - C：不设 `OPENAI_API_KEY` 的私有 staging 的具体设置项，仍然只准备方案，部署等用户授权。
3. `leak_markers_ja` 结构提案：建议暂缓，标志词留在工具里就够用。

## 下一步（可执行）

- 用户：用方式 A（Android）或方式 B 做 F1–F10。方式 C 需要用户授权部署，但不需要 API 费用。结果可以直接发给 Claude 整理。
- Claude：根据真机的 F4 / F5 结果，调整识别不确定的阈值（0.5）和提示文字。
