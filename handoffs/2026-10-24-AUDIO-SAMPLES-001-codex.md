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
