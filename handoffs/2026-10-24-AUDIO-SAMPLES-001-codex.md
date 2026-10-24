# AUDIO-SAMPLES-001 — Codex，2026-10-24

- 基准main ba8568b（前序#47常规CI通过并merge）；分支codex/AUDIO-SAMPLES-001。
- 用标准免费Ubuntu runner的本机CPU引擎，不使用远程TTS、付费API或部署。不安装App新依赖、不接入App、不装impeccable钩子。
- Kokoro0.9.4 / misaki[ja]0.9.4支持日语，固定v1模型及jf_alpha/jm_kumo；VOICEVOX0.26.0官方CPU包固定完整sha，查名字/正常style取得麒ヶ島宗麟、雀松朱司、玄野武宏，记录逐角色policy和署名。
- 五句按content.ts的sceneID/phrase索引提取，记录源SHA/文件hash。scripts/ci中生成器保留本地参数、有效PCM/非静音/时长/峰值/削波/音频sha；不以波形检查冒称真正试听。完整对照见verification/AUDIO-SAMPLES-001/README.md。
- 模型、引擎、字典仅临时缓存；Kokoro推理禁止Python socket，VOICEVOX客户端仅127.0.0.1。固定下载后校验再运行；保存许可；处理后清理大型归档/重复字典避免免费runner磁盘压力。
- Python/Node/YAML静态检查、真实五句抽取已通过。两次独立只读审查未见确定运行阻断。实际生成尚未执行，接下来等runner产物。
- 首跑后：把两声音/UniDic的实际完整sha写成expected，冻结实际Python解析；临时PR触发改manual-only；保存小音频与证据，并如实记录是否可试听。

## 首轮环境修正

- run40070931508，head afe5e458：提取五句通过；runner未预装ffmpeg，工具检查立即exit1。没有下载模型或执行合成，不作为音频通过证据。
- 临时runner显式安装Ubuntu官方免费ffmpeg、7zip、venv与编译工具，保留实际版本及ffmpeg/7zip版权许可。只用于样本生成，不把工具（包括GPL/LGPL实现）代码并入App或仓库，不产生服务费用。

## 第二轮与版本冻结

- run40071049200，head70d9b4b：工具、Python环境、固定模型/CPU引擎/字典校验成功；Kokoro10段已生成。VOICEVOX在麒ヶ島宗麟正常style筛选处停止；未把该轮写成整项通过。artifact12551795413 SHA256 b30fd8ceb0e786c14551a3ea329e8b7b7652692c2646555abe40bf11cbda26c0校验通过，暂存scratch。
- 固定0.26.0的SpeakerStyle还定义streaming_talk，并明确支持常规audio_query/synthesis；旧筛选只接受talk过严，现同时接受这两种正式talk类型，仍拒绝唱歌类型，并保存三个角色的原始speakers元数据。若仍不匹配，会打印实际style并失败。
- 两声音及UniDic完整sha已从实得产物固定；Python全部实际版本存audio-requirements.lock。修正字典许可收集：COPYING仅是三许可选择说明，BSD文件名无LICENSE关键字，现在明确保留BSD原文并要求存在；仍只选BSD许可用于临时字典，不把数据或工具代码并入App。

## 最终样本结果

- 第三轮源head8a2a6967dc21cf3616cfed2632f2a46e7b377737，PR merge checkout e2c6e683c91c9abad8501056f16c985aba0fc85a，免费Ubuntu CPU run40071495822全部成功；同head常规CI40071495817成功（应用代码未变）。
- artifact12551019475 SHA256 0f6353da641462fd3be4a41b4f7c374bdb4d6c66b3c2df0d9e3164945c279f07校验后提取；25单句＋5比较MP3，共1,522,374字节。全部24k单声道，原PCM削波0；第二位代理用ffmpeg独立解码验证非静音/无越界削波，单句2.2293–4.9秒。5比较时长符合每段＋0.7秒间隔及MP3 padding。
- 三个VOICEVOX正常style确实是streaming_talk（53/52/11），原始元数据/UUID/policy/hash和BSD许可全文都已保留。Kokoro原始phonemes与VOICEVOX音调query也留档；没有宣称真正试听或日语自然度验收。
- 两个巨大pip原始报告内含上游README/code examples，未复制入仓库；转成tool-install-lock.json，保留版本、下载hash、依赖约束与原报告sha。原artifact manifest另存runner-SHA256SUMS.json；当前文件校验单独SHA256SUMS.json，音频未修改。
- workflow改manual-only并限定任务分支，Python实际版本及声音/UniDic完整sha固定；没有自动付费步骤。最终工具元数据整理不改变已生成音频或App。无模型/引擎二进制进入仓库、无App新依赖、付费API、部署或hooks。
- 试听入口和候选意见见verification/AUDIO-SAMPLES-001/README.md；本环境不支持音频输入，未虚构听感。用户下一步可逐句选择声音。正式全量AUDIO-001/App接入及付费路径仍blocked。

## 已合并（后序A11Y任务确认）

最终head7ef59a85acb44c49995f94d61df193431a2559c0，最终常规CI40072582215成功；#48以merge commit137ff8aadfc3f6cebca9a4761ae0f922113aa6f6合并。样本与许可已进入main；真实试听仍未完成。
