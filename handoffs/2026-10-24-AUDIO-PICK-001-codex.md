# AUDIO-PICK-001｜手机可点开的免费音频清单

- 日期：2026-10-24 JST；负责人 Codex；分支 `codex/AUDIO-PICK-001`。
- 基准 main `a3b006095580b234e51100ac70565a7d6a296e12`。本交接随工作分支推送；固定内容SHA、PR和CI链接由后续整合补记，不先标为已合并。
- 只新增 `verification/AUDIO-SAMPLES-001/` 的试听清单和验证 JSON，以及本交接。没有修改 `prototype/app`、`components`、`lib`、`tests`，没有修改原音频、原 README、许可证或既有校验清单。

## 交付

- `AUDIO-PICK.md`：手机操作、MP3 直接链接、五声音角色候选/许可/署名/试听重点、两组待用户试听的推荐和反馈模板。
- `mobile-listen.html`：约 2.06 MB，完整 25 单句＋5 对比的原 MP3 字节内嵌，下载一个文件即可离线用原生播放器试听。无 JS、自动播放、录音、上传或自动外站请求；许可摘要、三个角色 policy 原文与 Kokoro Apache 原文一并保留。
- `index.html`：约 32 KB，相对 `audio/` 文件的同目录版本。
- `audio-pick-manifest.json`：30 原音频 SHA256及两个 HTML 字节数/哈希；与旧生成清单分开，旧清单不改。

GitHub 的 HTML 文件页不会直接渲染播放器；手机需下载后由浏览器打开。iPhone 文件预览/浏览器打开行为没有真机验证，清单保留所有 MP3 直接链接作为可选入口；本轮不部署网站，也不把网页模拟说成手机验收。

## 验证与边界

- 本机 Chromium `file://`、390×844 手机视口：两份 HTML 各有 30 个播放器；30 段分别读取 metadata、解码及调用 `play()` Promise 成功，时长有效；console/page error 0、自动外站请求 0、脚本 0、图片 0。
- 检查嵌入的 30 段音频与原 MP3 字节完全相同；未重编码。原 `SHA256SUMS.json` 全部保留条目的 SHA256/字节数逐项校验通过，30 个原 MP3 同时与基准提交逐字节比对通过。
- 首次检测发现许可段长提交号导致手机内容撑宽，已加自然断行并重跑；最终布局数据见 `audio-pick-browser-check.json`。没有通过隐藏溢出来伪造无横向滚动。
- 浏览器能执行 `play()` 不等于人已听到。本环境无法接收音频输入，真正试听未完成。逐声音意见明确来自官方角色定位/上游日语评级和已有技术检查，未编造听感。两个引擎未统一响度；相同速度参数不保证相同字/秒。
- 组合 A：麒ヶ島宗麟＋雀松朱司；组合 B：麒ヶ島宗麟＋jf_alpha，均为待用户试听候选。全量 AUDIO-001/App 接入继续 blocked。
- 逐角色署名：`VOICEVOX:麒ヶ島宗麟`、`VOICEVOX:雀松朱司`、`VOICEVOX:玄野武宏`。不把模型 Apache 许可推定为所有输出权利保证，不把音源许可当角色插画许可；保留再分发/训练/单独售卖素材限制及原条款链接。

## 下一步

发布本分支、登记 PROJECT_STATE、附实际提交/PR和上述证据。用户用自己手机试听，回传声音选择、具体不自然词、语速、音量和角色区分意见。尚未做真机兼容、听感或介护专业验收；不因已完成清单而解除付费或部署限制。

全程免费：未调用付费 API、未充值、未部署、未安装 impeccable 钩子；没有新增 App 依赖。

## 本轮接续核对

已快进到最新业务main6148494798ad58fbc0b8a29ea431587580d3ec98。原AUDIO-SAMPLES-001目录从a3b0060至该main的git树完全相同；30原MP3、两HTML哈希/字节数再次通过；30内嵌音频逐段解码后的SHA256集合与原MP3完全一致。原浏览器证据仍针对同一批HTML和音频字节，不冒称新增真机/听感验收。本轮未重新生成或改音频。

## 已推送与整合入口

工作分支 `codex/AUDIO-PICK-001` 已实际推送，提交 `f2e52e723a25e35da161f9442cbf2e60d863bde0`。30原MP3双HTML清单及SHA256/390px媒体检查；未真机/真正试听，不接入App。共同整合入口为本轮交付PR，合并前根PROJECT_STATE只将文档标review_ready；Lighthouse代码已由PR #53进入main。

## 实际交付确认

交付PR #54已在CI40079627795的构建/模拟测试与两尺寸A11Y硬门全部通过后，以merge commit `eb65ef19503b3d07d761d13a506b9e63fdb12b8c` 进入main。本任务分支提交均已成为main祖先；根PROJECT_STATE据实际合并改为merged。完整CI来源、job与artifact元数据见 `verification/MERGE-2/final-ci.json`。本补记没有应用、依赖、CI或音频改动，不额外声称真实AI、真机、听感或法律税务签核通过。
