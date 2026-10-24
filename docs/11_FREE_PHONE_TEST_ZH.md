# 用自己的手机免费测试（约 15 分钟）

适用：最新 `main` 的网页原型；**不设置 OpenAI 密钥、不充值、不部署**。只用虚构姓名和句子，不输入真实利用者、同事或设施信息。完整技术步骤见 [docs/10](10_LOCAL_ENV_AND_DEPLOY.md)，原始验收范围见 [docs/09 的 F1–F10](09_REAL_DEVICE_VOICE_TEST.md#免费测试项目)。本页的桌面手机尺寸复核不能代替你下面的真机结果。

## 1. 让 Android 手机打开电脑上的网页

准备：Android 手机、可传数据的 USB 线、两端 Chrome；电脑已装 Git、Node 22（至少 22.13）和 Corepack。使用新副本，**不要复制旧项目的 `.dev.vars`、`.env*`、`dist` 或 `.wrangler`**。

| Windows：打开 PowerShell | Mac：打开「终端」 |
| --- | --- |
| `git clone https://github.com/1412845026z-jpg/care-kotoba.git care-kotoba-free-phone` | 同左 |
| `cd care-kotoba-free-phone/prototype` | 同左 |
| `Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue` | `unset OPENAI_API_KEY OPENAI_BASE_URL` |
| `Remove-Item Env:OPENAI_BASE_URL -ErrorAction SilentlyContinue` | （上一步已清除） |
| `$env:WRANGLER_SEND_METRICS="false"; $env:CLOUDFLARE_CF_FETCH_ENABLED="false"; $env:NEXT_TELEMETRY_DISABLED="1"` | `export WRANGLER_SEND_METRICS=false CLOUDFLARE_CF_FETCH_ENABLED=false NEXT_TELEMETRY_DISABLED=1` |
| `corepack enable`，然后 `corepack prepare pnpm@11.25.0 --activate` | 同左，逐行执行 |
| `pnpm install --frozen-lockfile` | 同左 |
| `pnpm dev --host 127.0.0.1 --port 5173` | 同左，窗口保持运行 |

电脑 Chrome 打开 `http://127.0.0.1:5173/api/health`：**最外层 `configured` 必须是 `false`**（不要看嵌套的 `access.configured`）。如果是 `true`，先停止，不要开始练习；不要把变量内容或密钥发回来。

手机「设置 → 关于手机」连续点「版本号」约 7 次 → 开发者选项 → 打开「USB 调试」（厂商菜单可能不同）。USB 连接电脑、解锁手机并同意这台电脑调试；必要时选择文件传输。电脑 Chrome 打开 `chrome://inspect/#devices` → 勾 **Discover USB devices** → 看到手机型号 → **Port forwarding** → 左边填 **5173**，右边填 **localhost:5173** → 勾 **Enable port forwarding** → **Done**。最后在**手机 Chrome** 打开 **`http://localhost:5173`**。电脑服务器只监听本机，不用开放公网端口。

看不到手机：换数据线/USB 口，解锁并重新同意；Windows 可按 [Android 官方说明](https://developer.android.com/studio/run/oem-usb)安装本机厂商驱动。Mac 通常不需驱动。不会为此安装项目新依赖。

**iPhone：本轮没有已授权的私有 HTTPS 部署。** Android 的 USB 转发不能照搬到 iPhone。可按 docs/09 的 B 方式，在电脑启动时改用 `pnpm dev --host 0.0.0.0 --port 5173`，仅在自己可信 Wi‑Fi 内让 iPhone Safari 打开 `http://<电脑局域网IP>:5173`，做界面/演示/笔记检查（电脑 IP：Windows 运行 `ipconfig` 看当前 Wi‑Fi 的 IPv4；Mac「系统设置 → 网络 → Wi‑Fi → 详细信息」看 IP 地址）；它不是安全上下文，麦克风、语音识别、安装可能不可用，相关项记「本方式不支持」，不能记失败或通过。不要购买隧道、域名或放开公网；HTTPS 方案 C 仍待单独部署授权。

## 2. 按表点击，记录“通过 / 问题 / 不支持”

先保持音量适中、关闭静音；页面右上角圆形人物按钮是「学習設定」。免费阶段只选 **「デモで操作を体験」/「まずはデモで操作を体験」**，不选「音声でAIと話す」。

| 项目 | 点哪里、做什么 | 看到什么算通过；要发回什么 |
| --- | --- | --- |
| F1 显示 | 底部依次点「ホーム」「シーン」「ノート」「学習記録」；右上人物 →「ふりがな」打开 →「この設定で続ける」 | 页面可滚动但无横向溢出，按钮/注音完整、不重叠；发首页与问题画面截图。 |
| F2 主屏幕 | Android Chrome 的 ⋮ →「アプリをインストール」或「ホーム画面に追加」，再从新图标打开 | 能启动、显示正常；发能否添加/启动及截图。浏览器未提供入口就记“不支持/未出现”；USB 断开后本机地址不能连接，不算离线 App 已验收。 |
| F3 演示 | 首页下滑 →「デモで操作を体験」，或「シーン」→ 任一场景 →「まずはデモで操作を体験」；输入一句，发送 →「終了して振り返る」 | 能到「デモの振り返り」，明确「AI評価は行っていません」或中文“没有进行真实 AI 评价”；发有无卡住/错误。 |
| F4 音声测试 | 右上人物 →「音声テスト（マイク・スピーカー）」→「テストを始める」→「マイクを確認する」，允许麦克风并说约 4 秒「こんにちは」→「テスト音を鳴らす」→ 如实点「聞こえた / 聞こえない」→「結果を保存（JSON）」 | 能完成并保存 JSON；免费模式提示“AI 尚未设置”是预期。逐项记录麦克风、测试音、WebRTC 候选、声で入力、日语声音，不能只看总判定。不要没听见就点“听见”。 |
| F5 语音输入 | 重新进入演示，在输入框旁点麦克风「声で入力」；读告知，自愿选「使う」；说「この理解で、合っていますか。」→ 核对、改字 → 发送 | 文字出现在输入框，可改后发送；发你说的虚构句子、识别结果/改字、是否有确认提示。没有此按钮记浏览器不支持。声音可能由 Google/Apple 等处理，应用不调用 OpenAI；首次可选「使わない」。 |
| F6 端末朗读 | 场景/演示里的「ゆっくり聞く」，或笔记里的同名按钮 | 实际听到日语，内容/速度合适；发“听见/无声音/太快”等。无 key 时走端末声音；没有日语声就记录，不开付费 TTS。 |
| F7 笔记与导出 | 场景说明展开「困ったときの、参考表現」→ 书签保存；关弹窗 → 底部「ノート」→「書き出す」 | 笔记可见，下载文本可打开且有刚保存的句子；发文件名/保存位置及无私人内容的文本。若出现「今日の復習」，可点「復習をはじめる」体验；不计分、仅存在这台设备。 |
| F8 删除（最后做） | 先导出；人物 →「この端末の学習データを削除」→ 看清告知再点「削除する」 | 笔记/学习记录清空，设置回默认；若已有本机复习记录也应清空。此操作不能恢复；发清空是否成功。 |
| F9 核心草稿 | 人物 →「コア練習（草稿）」选「シーン一覧に表示する（審稿前の草稿）」→「この設定で続ける」→ 底部「シーン」→「コア練習（草稿）」→ 任一场景 → 演示 | 显示草稿提醒、场景说明与注音完整，演示可完成；发场景名及报错截图。草稿未经过专业审批。 |
| F10 切换/断网 | 演示输入半句先别发 → 切到别的 App 约 10 秒 → 返回；再短暂断网约 5 秒并恢复，**USB 和电脑服务器保持连接** | 记录页面是否仍可用、输入是否丢失、是否能继续。USB 网页并不等于手机 Wi‑Fi 通道：切飞行模式未必断开 USB；请说明你断的是 Wi‑Fi/流量/USB，避免误判。 |

测试顺序建议 F1 → F2 → F4 → F3/F5/F6 → F7 → F9 → F10 → **F8 最后**。保存的 JSON 含浏览器型号/麦克风设备名称，发回前可删去不愿提供的设备名称；不发任何真实对话、账号、访问码或密钥。

## 3. 发回这一小包

复制填写：**日期；被测 SHA（电脑另开终端，在仓库运行 `git rev-parse HEAD`）；手机型号；系统版本；Chrome/Safari 版本；A/USB 或 B/Wi‑Fi；F1–F10 各“通过/问题/不支持+一句说明”**。附 F4 JSON、F7 文本和 2–4 张不含个人信息的截图。声音问题补充是否静音/耳机/日语声音；F5 补“原句→识别文字”。结束后关闭 Port forwarding，电脑 Ctrl+C 停服，手机关闭 USB 调试或撤销电脑授权。本页不执行真实 AI、订阅/支付或付费 T1–T14 验收。
