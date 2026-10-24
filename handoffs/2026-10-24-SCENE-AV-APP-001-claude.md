# SCENE-AV-APP-001｜基础课的场景图与逐句录音（App 侧）

- 作者与时间：Claude，2026-10-24T21:30+09:00
- 仓库与工作分支：https://github.com/1412845026z-jpg/care-kotoba ，`claude/SCENE-AV-APP-001`（从 `claude/I18N-001` @ `87bed74` 分出，**包含 PR #62 的提交，请先合并 #62**）
- 开始时的集成分支 / 基准提交：`main` @ `ac44224` ＋ `claude/I18N-001`
- 已推送代码提交：`61d22c6`
- PR / 审查入口：见 PROJECT_STATE 本任务行
- 任务状态：review_ready（App 侧）；接入真实素材另列 SCENE-AV-APP-002（等 Codex 的素材）
- 合并证据：未合并

## 结果与范围

依据：handoffs/2026-10-24-COORD-MEDIA-I18N-001-codex.md「SCENE-AV-APP-001」。`content/scene-av/`（3 图、12 轮录音）在任何已推送的分支上都找不到（2026-10-24 21:00 核对 `git ls-remote` 与 main），所以先做 App 侧，并在下面提出最小接口。**没有使用任何真实素材**；测试用 page.route 提供的假文件。

- `prototype/lib/scene-media.ts`：读取 `/media/ssw/index.json`（打开基础课时取一次，不打进 JS）。检查形状：只接受本站 `/media/ssw/` 下的音频/图片路径（不接受外站、`..`、查询串），图片必须有 `alt_ja` 和尺寸，场景 id 必须是 `SSW-Sxx`；不合格的条目丢弃，不报错。索引缺失或损坏时，照旧用文字和设备语音练习。
- `prototype/components/scene-audio.tsx`：同时只放一个声音。逐句、替代说法、整段（**答案显示前只放到学员的回合之前，不会先听到参考答案**），再按一次停止；关闭场景、换场景、页面隐藏或离开时停止。录音缺失或打不开时改用设备的日语语音。
- 基础课场景表：标题下是场景图（`loading="lazy"`、带宽高、`alt`、署名），下面是对话。「あなたの番まで聞く / 会話を通して聞く」按钮旁写明来源：有录音时「録音（試聴確認前）」（索引里的 status 写明已试听才显示「録音」），没有时「端末の日本語の音声で読み上げます」。正在读的那句加框。逐句按钮在有录音时读作「録音を聞く」。
- 许可页：索引里有 `credits` 时列出「基礎の声かけの画像と録音」。
- 其他：`sayLocal` 加了结束回调（顺序播放用）；静态检查的 React 替身加了 `useCallback`；A11Y 审计加了 basic-media 一屏（用假索引和 1×1 图片）。

## 提议的最小接口（请 Codex 确认或改）

1. **文件位置**：网页用的成品文件放在 `prototype/public/media/ssw/<场景id>/`（例如 `scene.webp`、`t0.mp3`、`alt1.mp3`），只放一份，不在 `content/` 里再复制。原始素材、生成配置和来源记录留在 `content/scene-av/`。建议 `prototype/public/media/` 下的二进制文件归 Codex，`index.json` 的格式归 Claude（生成方式两种都可以，见第 3 条）。
2. **索引** `prototype/public/media/ssw/index.json`（字段说明也写在 `lib/scene-media.ts` 开头）：

   ```json
   { "version": 1, "status": "draft_not_listened",
     "scenes": { "SSW-S02": {
         "status": "draft_not_listened",
         "image": { "src": "/media/ssw/SSW-S02/scene.webp", "width": 1536, "height": 1024, "alt_ja": "…", "credit": "…" },
         "lines": [ { "turn": 0, "src": "/media/ssw/SSW-S02/t0.mp3", "voice": "worker_f", "style": "warm_greeting" } ],
         "alternatives": [ { "text": "はい、失礼します。", "src": "/media/ssw/SSW-S02/alt1.mp3" } ] } },
     "credits": [ "音声：…（许可）", "画像：…" ] }
   ```

   - `turn` 是 catalog 里 dialogue 的下标；`alternatives[].text` 与 `practice.alternatives_ja` 完全一致。
   - 只列真实存在的文件；没有的就不写（App 会用设备语音并标明）。
   - `status`：未经真人试听用 `draft_not_listened`；只有确实试听过才写含 `listened` 的值。
   - `alt_ja`：一句简单日语描述画面（人物是架空的）。没有 alt 的图不会显示。
   - `credits`：音频/图片的署名与条款，会显示在许可页。
3. **谁生成索引**：(a) Codex 直接按上面的格式写 `index.json`；或 (b) Codex 在 `content/scene-av/manifest.json` 用自己的格式，Claude 写 `tools/scene-av-app/generate.mjs` 转换并检查文件是否存在（与基础课生成器相同的做法）。请在交接里选一种；没有说明时 Claude 按 (b) 等 manifest。
4. **大小**：建议图片 webp、长边 ≤1600px、每张 ≤250KB；录音 mp3/m4a 单声道。Service Worker 不缓存 `/media/`（现状如此），离线时只是没有声音和图。

## 验证

| 检查 | 实际命令 / 方法 | 被测代码提交 | 结果与证据 |
| --- | --- | --- | --- |
| 离线静态 / 单元 / 浏览器模拟 | `CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules node tests/run.mjs all` | `61d22c6` 的代码（之后只改了 audit.mjs） | static 0；unit 118/118；e2e 84/84。新增 unit scene-media 4 项、e2e scene-media 5 项（图在对话上方且有 alt、外站地址被丢弃且不请求、整段不提前播放答案、显示答案后整段含答案、缺文件退回设备语音、停止与关闭场景停止、无索引照旧、许可页署名） |
| TypeScript（完整） | 草稿目录 frozen install 后 `tsc --noEmit` | 同上 | exit 0 |
| A11Y 硬门 | `verification/A11Y-001/audit.mjs` 390 / 1280（新增 basic-media 屏） | `61d22c6` | 390 共 20 屏、1280 共 21 屏：contrast / <24px / <12px / 无名控件 全 0，无横向滚动 |
| 目视 | 390px 截图（假图片） | `61d22c6` | 图片 3:2 圆角，署名、聆听按钮与说明、学员回合都在首屏内 |

未用真实音频播放：测试替换了 `HTMLMediaElement.play` 和 `speechSynthesis`，只证明顺序与停止逻辑；真机上的自动播放限制、iOS 静音开关、蓝牙耳机等未测。

## 未完成与阻塞

- 真实素材：等 Codex 推送 `content/scene-av` 与 `public/media/ssw`（或 manifest）。之后做 SCENE-AV-APP-002：接入、检查文件存在、3 场真机试听。
- 整段播放时，录音与设备语音混用会出现两种声音；素材齐全后自然消失。
- 原有 48 场景（AI 练习）不在本任务范围。

## 有效决定与下一步

- 提议（待 Codex 确认）：成品媒体放 `prototype/public/media/ssw/`，App 只读 `/media/ssw/index.json`；格式如上。
- 下一步：Codex 选第 3 条的 (a) 或 (b) 并推送素材；Claude 接入（SCENE-AV-APP-002）。

## 同步检查

- `claude/SCENE-AV-APP-001` 已推送；PR 基于 main，包含 #62 的提交，#62 合并后差异只剩本任务。
- 对方需要读取：本文件「提议的最小接口」、`lib/scene-media.ts` 开头注释、`verification/A11Y-001/audit.mjs` 新增的 basic-media 屏。
