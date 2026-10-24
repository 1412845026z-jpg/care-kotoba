# DEVICE-FREE-GUIDE-001 — 中文免费手机测试入口

- 日期：2026-10-24 JST；负责人 Codex；分支 `codex/DEVICE-FREE-GUIDE-001`。
- 起始基准：main `a3b006095580b234e51100ac70565a7d6a296e12`。本交接先记录文档准备；最终实际被测 main 与结果在下方补记，不把准备状态写成真机通过。
- 已读 AGENTS.md、PROJECT_STATE.md、docs/09 F1–F10、docs/10 本机 A / 私有 C 方案和 FREE-VOICE-ENV-001、A11Y-CI-001、AUDIO-SAMPLES-001 等最新交接。

新增 `docs/11_FREE_PHONE_TEST_ZH.md`：一页中文操作清单。Windows PowerShell / macOS Terminal 干净副本命令、`configured:false` 硬检查、Android USB 调试和 Chrome `5173 → localhost:5173` 点击路径；F1–F10 的按钮原文、通过标准、需要回传的资料；建议 F8 删除放最后。iPhone 在本轮无已授权 HTTPS 服务，只提供可信 Wi‑Fi 的 HTTP 界面/演示检查，明确不能照搬 Android USB 或据此验收麦克风/安装。部署方案 C 仍只在 docs/10，没有执行。

`verification/DEVICE-FREE-GUIDE-001/replay.mjs` / `replay-launch.py` 为可复核证据工具：启动真正 Vinext dev，无 OPENAI 进程变量、无本地环境文件、没有 dummy key；临时 Worker 守卫在连接前拒绝非回环 fetch，结束后恢复原文件字节。浏览器手机尺寸 390×844，外站 HTTP 被拦；只走演示，语音输入是假识别器，麦克风为 Chromium 假设备，端末朗读只检查 native API 调用、不冒称听见。`sayText` 会先 POST 本机 `/api/speech`，未设 key 时失败后走 speechSynthesis；排程离线不代表“听句子”没有本机 HTTP。

为了复核已锁定的 ts-fsrs 5.4.2，将官方 npm tarball下载到 scratch，sha512 与现有锁文件完全一致；只复用隔离的旧依赖缓存和该固定包，不改 package.json、锁文件或共享缓存，没有加入新依赖。正式工具链安装仍由常规 CI 的 frozen install 证明。

准备阶段检查：Node `--check` 与 Python AST 语法通过；只新增 docs/11、verification/DEVICE-FREE-GUIDE-001、本交接。没有修改 `prototype/app`、`components`、`lib`、`tests`，没有安装 impeccable 钩子、付费调用、充值或部署。

## 实际结果（待最终 main 后补记）

本任务目前未做手机真机测试。Windows/macOS 真实 USB 连线、F2 主屏幕安装、F5 浏览器供应商识别、F6 可听日语声音、F10 OS App 切换仍须用户按指南回传；浏览器尺寸模拟与 API 调用成功不能替代这些验收。

下一步：用合并工作核对后的最新 main 运行 no-key real-dev replay，保存 source SHA、networkGuard、JSON / 导出文件及截图，再由根会话登记 PROJECT_STATE 并推送。若发现 App 或 tests 问题，只记录给 Claude，不在本任务修 App。

## 已完成的最新 main 回放

- 固定来源 `6148494798ad58fbc0b8a29ea431587580d3ec98`（#46→#49均已合并）。真实Vinext dev无key回放exit0，用时23.559秒。原始证据在 `verification/DEVICE-FREE-GUIDE-001/runner/`，包括两份JSON导出、笔记文本、5张画面与日志。
- 首页/场景/笔记/记录390px无横溢；演示→假识别同意→编辑发送→反馈→保存/导出→复习→核心草稿→标签页/断网模拟→删除全部完成。health.configured=false，Worker外部fetch尝试0，付费chat/feedback/session请求0。`/api/speech`在无key本机失败后调用native API；无头合成报synthesis-failed，未验收可听声音。Google Fonts外站请求被阻止，不能据此判断真实字体。
- F2、真正语音识别、可听日语、真实USB及OS App切换仍未验证。假设备/假识别与手机尺寸不冒称真机。
- 给Claude的新问题：START-FLOW用键盘选中展开的会话类型后，选项收起并卸载当前焦点节点，`document.activeElement`变成BODY（replay.json的START-FLOW-keyboard-observation）；下一次Tab跳到参考表达summary，未回到「変える」。建议组件负责人修成收起后焦点回原按钮，并补键盘检查。本轮未改App/components/lib/tests。
- 临时Worker守卫已逐字节恢复；原文件SHA256为03e256f813becc0ee0f948cb0cbec2ea953596c75eb0e47359d0dbb438b087d9。App未改，原始日志可复核。

## 已推送与整合入口

工作分支 `codex/DEVICE-FREE-GUIDE-001` 已实际推送，提交 `e4b798b6e13a1677598340bd9b82d01a4cfb24ef`。main6148494无key真实dev回放通过、外部Worker请求0；真实USB/识别/可听声音仍待用户。共同整合入口为本轮交付PR，合并前根PROJECT_STATE只将文档标review_ready；Lighthouse代码已由PR #53进入main。

## 实际交付确认

交付PR #54已在CI40079627795的构建/模拟测试与两尺寸A11Y硬门全部通过后，以merge commit `eb65ef19503b3d07d761d13a506b9e63fdb12b8c` 进入main。本任务分支提交均已成为main祖先；根PROJECT_STATE据实际合并改为merged。完整CI来源、job与artifact元数据见 `verification/MERGE-2/final-ci.json`。本补记没有应用、依赖、CI或音频改动，不额外声称真实AI、真机、听感或法律税务签核通过。
