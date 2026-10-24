# DEVICE-PREFLIGHT-001｜免费的音声测试

- 作者与时间：Claude（Claude Code 云端会话），2026-10-24 凌晨 JST
- 分支：`claude/DEVICE-PREFLIGHT-001`，从 `claude/A11Y-001` 开出。合并顺序：#17 → #18 → #19 → 本 PR
- 代码提交：`7a00834`；测试针对的提交同上
- 任务状态：review_ready

## 为什么做

真机语音测试（DEVICE-001）要花 API 费用，目前还在等授权。很多失败与 AI 无关：麦克风没授权、音量为 0、扬声器静音、VPN 阻断 WebRTC、没有访问码、服务器没配置 AI。先用一个不花钱的检查把这些排除，付费测试的每一分钟都能用在真正要验证的地方。

## 做了什么

「学習設定」→「音声テスト（マイク・スピーカー）」，依次检查：

1. 浏览器支持：HTTPS、getUserMedia、WebRTC、Web Audio。
2. 服务器：可达性和延迟、`/api/health` 是否配置了 AI、`/api/access` 是否需要访问码。
3. WebRTC：在本地收集 ICE 候选。不配置 STUN/TURN，也不发起呼叫。
4. 麦克风：申请权限后用 4 秒音量条测峰值，结束后释放。
5. 扬声器：播放双音提示音，由用户自报是否听到。

每一项给出 ✓ / ! / × 和日语的下一步建议；结果可以保存为 JSON。**整个流程不调用 `/api/session`，也不调用任何模型。**

docs/09 的测试用例前加了这一步：先运行音声测试并保存 JSON，有 × 的项先解决，再做付费的 T1–T13。

文件：

- `prototype/lib/voice-preflight.ts`：判定逻辑是纯函数，另有浏览器探测函数
- `prototype/components/voice-check.tsx`
- `app/page.tsx`（设置里的入口）
- `globals.css`
- 测试：`tests/unit/voice-preflight.test.mjs`、`tests/e2e/app.e2e.mjs`

## 验证（Claude 沙箱，Chromium 153 的假摄像头和假麦克风，离线 harness）

- `node tests/run.mjs all`：static 0 错误（24 个模块，9 个组件），unit 61/61，e2e 29/29。报告：`verification/DEVICE-PREFLIGHT-001/tests.json`。
- e2e 走完全流程，假麦克风的哔声能被测到，JSON 能下载；mock 上没有出现 realtime、responses 或 audio 请求。只有本机回环网络的环境里 ICE 一项会显示 ×，测试允许这种情况。
- 390px 截图已人工查看（`voice-check-done-390.png`）。

## 限制

- 扬声器一项靠用户自报。ICE 候选只说明本地网络能提供候选，不保证能连上 OpenAI。
- iOS Safari 的 `getUserMedia` 和 `AudioContext` 需要用户点击；流程里每一步都是按钮触发的，但还没在真机上验证。
