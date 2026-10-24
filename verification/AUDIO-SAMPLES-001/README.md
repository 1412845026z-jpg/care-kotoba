# AUDIO-SAMPLES-001：样本来源与使用条件

本目录只用于比较本机合成的五组声音，没有把生成工具、模型、角色图像或音频接入 App。五句均取自 `prototype/lib/content.ts` 的 `scenes[].phrases[]`；实际提交、索引与源文件哈希见 `sentences.json`。

| 声音 / 工具 | 固定来源 | 许可与署名 | 本次范围 |
| --- | --- | --- | --- |
| Kokoro-82M，`jf_alpha` | HF `8542409da2986c0ab5d41b3cf0411f7a58caab38`，v1.0 模型；kokoro 0.9.4 | 模型与推理库 Apache-2.0，原文见 `licenses/kokoro/` | 本机 CPU 推理；职员女声候选 |
| Kokoro-82M，`jm_kumo` | 同上 | 同上；上游 VOICES.md 另列 [koniwa 的《蜘蛛の糸》资料](https://github.com/koniwa/koniwa/blob/master/source/tnc/tnc__kumonoito.txt) 于 CC BY 来源列，保留该训练来源说明 | 本机 CPU 推理；男性音色对照，不能预先当作老人声 |
| misaki 0.9.4 日语 G2P | [hexgrad/misaki](https://github.com/hexgrad/misaki/tree/fba1236595f2d2bf21d414ba6e57d25256afada3) | Apache-2.0；cutlet 适配层保留其 MIT 来源；full UniDic 数据选择 BSD 许可（原文随字典） | 临时 venv 中的生成工具，日语使用默认 cutlet 路线 |
| VOICEVOX Engine 0.26.0 | [7ebc23342bd812f5a72816330f62f110ccca8bdc](https://github.com/VOICEVOX/voicevox_engine/tree/7ebc23342bd812f5a72816330f62f110ccca8bdc) 官方 CPU 发行包 | 引擎源码为 LGPL-3.0 / 另行授权的双许可；发行包与音频还受其引擎条款约束，必须表明使用了 VOICEVOX | 仅隔离的本地生成工具，不把引擎、模型或依赖代码并入 App/仓库；音频的使用条件另看角色条款 |
| 麒ヶ島宗麟（ノーマル） | 同上；实际 UUID 和 style ID 由固定版本 `/speakers` 读取并记录 | **VOICEVOX:麒ヶ島宗麟**；[角色页](https://voicevox.hiroshiba.jp/product/kigashima_sourin/)；[VirVox 音声条款](https://www.virvoxproject.com/voicevox%E3%81%AE%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%84) | 商用/非商用可、需署名；年长男性利用者候选 |
| 雀松朱司（ノーマル） | 同上 | **VOICEVOX:雀松朱司**；[角色页](https://voicevox.hiroshiba.jp/product/wakamatsu_akashi/)；同一 VirVox 条款 | 商用/非商用可、需署名；温和稳定的职员候选 |
| 玄野武宏（ノーマル） | 同上 | **VOICEVOX:玄野武宏**；[角色页](https://voicevox.hiroshiba.jp/product/kurono_takehiro/)；同一 VirVox 条款 | 商用/非商用可、需署名；青年职员对照 |

VOICEVOX 官方引擎与逐角色条款原文入口：[voicevox_resource/engine/README.md（固定 0.26.0 对应提交）](https://github.com/VOICEVOX/voicevox_resource/blob/37c265375e05313486ebf2024b1679d6952a53d8/engine/README.md)。运行时还保存引擎清单和每个角色 `/speaker_info` 返回的 `policy` 原文，不保存头像。

使用或分发上述 VOICEVOX 音频时需保留各角色署名及其条款链接；将其作为音频素材提供给别人时，也必须告知后续使用者遵守署名与使用条件。禁止侵权、冒充权利来源、损害角色/配音者形象，以及用音源或输出音频训练新的声学模型。单独出售供他人传播的音频素材须先获得许可。本次为免费的比较样本，不是素材销售，也不授权未来把它们制成付费素材包。

本次没有选择青山龍星：VirVox 条款要求企业、个体经营者等事先取得许可，不能笼统当作无条件的商用声音。也没有使用任何角色形象；音源使用条款不等于角色插画许可。

完整临时 Python 解析结果见 `requirements-freeze.txt`、`tool-install-lock.json`（原始pip报告的sha与来源已保留） 和 `isolated-tool-package-licenses.json`。Kokoro 的英文 extra 可能安装 GPL 的 phonemizer / eSpeak 相关工具；它们不在所选日语 G2P 路径中工作，也不把这些工具代码并入 App 或提交到仓库。VOICEVOX 的依赖同样仅在临时官方发行包中运行；不能把工具的许可误写为输出音频的许可。

## 比较与技术检视

每句的 `sN-comparison.mp3` 顺序固定为：`jf_alpha` → `jm_kumo` → 麒ヶ島宗麟 → 雀松朱司 → 玄野武宏，各段后间隔 0.7 秒。所有声音使用相同五句与 0.9 速度；这只是相同设置，两个引擎的速度参数并不代表严格相同的字/秒。

清单记录了有效 PCM、非静音、时长、峰值、削波比例和文件哈希。这些是技术检查，不能证明日本语读音、重音、自然度或适龄程度。**本次未完成真正试听，不声称听过。** 上表的角色推荐依据官方的声音描述；用户需要听比较文件后挑选。尤其要听「理解」「合っています」「転倒」「瞬間」以及长句中的停顿和句尾。年长声音朗读学员参考句仅供音色比较，不代表角色台词或教学内容已经验收。

Kokoro 上游对日语支持较有限，`jf_alpha` 的整体级别为 C+、`jm_kumo` 为 C-；见固定版本的 `licenses/kokoro/VOICES.md`。不能仅凭开源许可或模型支持日语，就当作生产语音质量已通过。

## 生成结果与试听入口

生成通过：run40071495822，head8a2a696，实际PR merge checkout `e2c6e683c91c9abad8501056f16c985aba0fc85a`。25段单句＋5段对比共1,522,374字节，24kHz/单声道/64kbps MP3。25段PCM有效、非静音、原PCM与独立解码削波均0；单句2.2293–4.9秒。未完成真正听感验收。

| 对比文件 | 原参考句 |
| --- | --- |
| [s1-comparison.mp3](audio/s1-comparison.mp3) | おはようございます。よく眠れましたか。 |
| [s2-comparison.mp3](audio/s2-comparison.mp3) | 聞こえにくかったですね。もう一度、ゆっくりお伝えします。 |
| [s3-comparison.mp3](audio/s3-comparison.mp3) | この理解で、合っていますか。 |
| [s4-comparison.mp3](audio/s4-comparison.mp3) | ご本人は「体がだるい」とおっしゃっています。 |
| [s5-comparison.mp3](audio/s5-comparison.mp3) | 転倒した瞬間は、見ていません。 |

每个文件顺序均为 jf_alpha → jm_kumo → VOICEVOX:麒ヶ島宗麟 → VOICEVOX:雀松朱司 → VOICEVOX:玄野武宏。依据官方定位，年长角色优先比较麒ヶ島、职员优先比较雀松与jf_alpha；这是角色候选建议，未冒称试听结论。玄野为青年职员对照，jm_kumo为男性Kokoro对照。

VOICEVOX正常style实际为streaming_talk（官方同时支持audio_query与synthesis）：玄野11、雀松52、麒ヶ島53。逐角色UUID、policy原文与hash已保存。原始runner文件清单见runner-SHA256SUMS.json；为避免复制上游README及无关代码示例，两个巨大pip报告仅保留解析版本/下载hash/依赖约束于tool-install-lock.json，并记录原报告hash。音频未修改；当前保留文件清单见SHA256SUMS.json。原始artifact12551019475（SHA256 0f6353da641462fd3be4a41b4f7c374bdb4d6c66b3c2df0d9e3164945c279f07）校验通过。

生成workflow现为手动触发，限定任务分支；不会在main、PR或定时自动下载/合成。App、content和依赖未改。下一步由用户听上述对比后选声音，再决定是否接入与全量生成；付费路径继续blocked。

Kokoro音素中的理解、合って、転倒、瞬間未见明显词读错误，但未验证实际重音/停顿；两个引擎未统一响度。结果元数据补独立sentenceId/voiceId，原id保持；音频不变。
