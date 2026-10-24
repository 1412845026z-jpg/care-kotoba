# 特定技能基础介护日语：自定义角色声音方案

查阅日期：2026-10-24（JST）。本项只读核查官方资料；没有调用合成 API、试听生成、注册、付费或下载模型。**功能有官方依据，不等于本项目已验证日语自然度、年龄感、角色一致性或硬件速度。**

## 结论

- **本机候选：Qwen3-TTS VoiceDesign。** 可以从文字描述设计新声线，支持日语；适合先验证“年长女性利用者”这个现有样本的缺口。它是需要下载权重和运行环境的合成模型，并非即开即用的免费云端 API。[Q1][Q2][Q3]
- **稳定角色要单独保存。** 官方流程是先用 VoiceDesign 生成参考片段，再交给 Base 模型建立可重复使用的 `voice_clone_prompt`；参考声可以是我们刚设计出来的合成声，不需要上传真人录音。逐句重新填写同一段描述，不能视作身份锁定。[Q1]
- **商业服务备选仅核 ElevenLabs。** 描述年龄、性别、音质、口音和节奏后设计并保存声音；支持日语。免费档没有商用许可，本轮不把免费试听输出纳入商用品。[E1][E2][E3]

## Qwen3-TTS：能力、执行条件与尚未验证的部分

| 项目 | 核实结果 | 对本项目的含义 |
| --- | --- | --- |
| 目标模型 | `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`；模型卡列日语，支持自然语言声音控制 | 能提交年长女性等描述；特定年龄命中率、母语般重音仍要真人试听 |
| 自由设计和预置声音 | `VoiceDesign` 接受描述；`CustomVoice` 是另一组预置说话人 | 不把预置的年轻女声直接宣称为自然老妇声 |
| 反复使用 | 官方 `Voice Design then Clone` 使用 VoiceDesign 参考音及 Base 的可复用 prompt | 保存参考音、转写、模型版本及参数；随后同一角色的句子走同一参考 |
| 权重体积 | 当前 VoiceDesign HF 文件树总计约4.52GB，主 `model.safetensors` 约3.83GB，含语音 tokenizer 等文件 | 还要计算 Base、Python/Torch 环境和缓存；4.52GB不是全部磁盘/内存需求 |
| CPU 路径 | 官方 CLI 的device帮助列cpu、dtype选项列float32；文档还给关闭FlashAttention的用法 | 有可配置意图，参数解析与实际推理均未测试；不能套用GPU延迟宣传 |
| GPU 与内存 | 官方示例使用 CUDA/bfloat16/FlashAttention 2；没有查到这套本机流程的保证最低内存或CPU速度 | 由环境检查决定是否小样本试跑；不要先安排数百段批量生产 |

上表来源分别为[Q1]–[Q4]。README中“小于96GB RAM时减少并行编译任务”属于 **FlashAttention 安装/编译** 建议，不能读作推理最低内存。CPU通常需要关掉该CUDA优化；实际兼容性仍未在本项目测试。[Q1][Q4]

实现时注意两个文档/代码细节：HF该VoiceDesign卡的通用示例实际加载CustomVoice，不能照抄代替VoiceDesign调用；当前CLI源码中FlashAttention选项字符串含斜杠写法，文档的关闭参数不能当成已运行成功的命令。可由环境负责人检查直接Python加载CPU与非FlashAttention实现的路径，再做不依赖模型下载的参数检查。[Q2][Q4]

一个可实施但尚未运行的制作顺序：先生成一位年长女性的短参考音，人工筛选后记录为角色资产；卸载设计模型，再加载 Base 测试该参考跨三句复用。只有自然度和身份一致性过关后，才增加其他角色。0.6B Base是官方另一种规模，但用它维持本项目设计声线的质量同样未验证。[Q1]

## 许可、依赖与输出权利分开记录

| 层次 | 已知 | 采用前应保留 |
| --- | --- | --- |
| Qwen 代码 | 官方仓库 LICENSE 为 Apache-2.0，允许在遵守条件下商用；不要求项目本身改为同一许可 | 固定源码提交、LICENSE/NOTICE及修改记录 |
| Qwen 权重 | 指定官方 HF 模型卡标注 `apache-2.0` | 固定模型 revision、每个下载文件哈希、模型卡与许可；Base/tokenizer也分别记录 |
| 工具依赖 | 当前 `pyproject.toml` 为 `qwen-tts 0.1.1`，固定 `transformers==4.57.3`、`accelerate==1.12.0`，还声明 gradio/librosa/torchaudio/soundfile/sox/onnxruntime/einops 等 | 独立虚拟环境；冻结实际解析版本与逐包许可，不把整套依赖加入网页App |
| 合成音频 | 模型/代码的Apache许可不是“所有输出均有排他版权、所有声音或文案都获授权”的证明 | 本项目原创文案、纯合成参考声来源、输出哈希、AI声音标识与听审结论 |

许可依据[Q2][Q5][Q6]；最后一行是项目权利管理的判断边界，未找到官方对每段输出的独立商用权利担保。不能据模型开源许可去克隆真实利用者、同事或配音员，也不必这样做来满足本次角色需求。

## ElevenLabs：描述声线、日语与费用

官方 Voice Design 文档支持年龄、性别、音色、节奏等描述，一次给出三个候选，选定后保存到声音槽；预览本身消耗额度。官方文档明确质量随提示词和用途变化，因此没有把它列为已经听审通过的老人声。[E1]

| 项目 | 当前官方信息 | 本轮处理 |
| --- | --- | --- |
| 日语 | 当前模型页列日语，Voice Design模型 `eleven_ttv_v3` 支持多语言；设计声可供TTS模型使用 | 年龄/口音/情绪与日语读音仍需实际小样本 |
| Free | $0，10,000 credits/月；免费生成内容没有任何商用许可，非商业公开另有署名条件 | 可以研究功能，不能直接作为商业App的成品素材 |
| Starter | 常规$6/月、30,000 credits；当前页面显示至11月1日的首月$1优惠 | 常规预算用$6，未订阅、未充值；税费另计 |
| 订阅与API | 同一账户/工作区的网站和API消耗共享额度；消费数取决模型、产品及网站/API路径 | 不是买了订阅就无限API；也不应默认还必须另买第二份API订阅 |
| PAYG | 有预付用量机制，订阅额度先用；部分权限、voice槽仍由订阅方案决定 | 不自动充值，不因“可PAYG”推定免费档已获得商用许可 |
| 付费输出 | 官方说明付费订阅期间生成内容可持续商用，但排除Beta服务，且仍须满足素材权利和服务条款 | 付费不会追溯授权先前免费生成的声音文件；实际采用前核对具体功能状态 |

费用与额度依据[E4]–[E6]，许可依据[E3]。当前API页面按具体模型列字符价和可用字符量；不能把UI的分钟数、旧版“每字1 credit”或不同模型的字符量相互替换。本报告没有估算全量制作价格，也没有读取用户账户/额度。

部分本地化营销页面仍描述Voice Design v3为alpha，而当前英文文档已介绍更新的模型。应以实际账户可用的模型与当时条款确认是否GA；本报告不根据“付了款”就解除Beta商用限制。[E1][E3][E7]

## 项目自己的首轮八角色规格（尚未生成）

以下是原创制作提案，不是现成可选声音、真人模仿目标或已听到的效果。全部设为自然标准日语，避免播音腔、动漫腔、夸张衰弱或通过变速压低音高冒充年龄。

| 角色ID | 文字描述要点 | 首轮重点 |
| --- | --- | --- |
| resident-f-older | 约75岁女性；轻柔、清楚、自然年龄质感，正常生活语气 | 能否和中年女职员明显区分，避免刻板颤音 |
| resident-m-older | 约78岁男性；温和、略低、适度沙感，回应不夸张 | 不因低音而含混 |
| staff-f-young | 约25岁女性；清楚、平实、温和，适度活力 | 避免幼态/过分甜美 |
| staff-m-young | 约28岁男性；中音域、自然、耐心 | 和年长男性区分 |
| staff-f-senior | 约50岁女性；稳重、温暖、清晰 | 不自动变成老人声音 |
| staff-m-senior | 约55岁男性；沉稳、清楚、自然节奏 | 不自动变成威严命令腔 |
| lead-f | 约45岁女性；明确、简洁、有组织，仍尊重对方 | 领导身份主要靠表达方式，不靠凶、快、大声 |
| lead-m | 约50岁男性；镇定、清楚、句间停顿明确 | 与同龄职员保持可辨声线 |

建议每个候选用三条不同功能的原创日语检查：简单回应、请求/确认、较长一句。评估母语自然度、助词/长音/数字读音、年龄辨识、角色间区分、跨句一致性、正常与慢速的可懂度。没有真人试听就只记录“文件/非静音/解码等技术通过”，不写“自然老人声已完成”。

## 官方来源

下列均于2026-10-24打开；未登录、未接受收费条款。

| 编号 | 来源 |
| --- | --- |
| Q1 | https://github.com/QwenLM/Qwen3-TTS （VoiceDesign / Voice Design then Clone / 环境） |
| Q2 | https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign （日语与Apache模型卡） |
| Q3 | https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign/tree/main （文件体积；当前短revision 5ecdb67，正式采用须固定完整revision） |
| Q4 | https://github.com/QwenLM/Qwen3-TTS/blob/main/qwen_tts/cli/demo.py （CPU/device/dtype/FlashAttention参数） |
| Q5 | https://github.com/QwenLM/Qwen3-TTS/blob/main/LICENSE |
| Q6 | https://github.com/QwenLM/Qwen3-TTS/blob/main/pyproject.toml |
| E1 | https://elevenlabs.io/docs/eleven-creative/voices/voice-design |
| E2 | https://elevenlabs.io/docs/overview/models |
| E3 | https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform |
| E4 | https://elevenlabs.io/pricing （常规/活动价格、额度共享） |
| E5 | https://elevenlabs.io/docs/overview/administration/billing （网站/API用量与订阅） |
| E6 | https://elevenlabs.io/docs/overview/administration/pay-as-you-go |
| E7 | https://elevenlabs.io/ja/voice-design （部分旧版alpha表述，不能取代当前功能条款） |

结果状态：官方功能与条款核查完成；本机环境、实际合成、速度、自然度、八角色声音与App接入均未由本报告验证。保持本轮免费、不部署、不调用付费API的约束。
