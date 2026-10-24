# 开源复用与许可说明

本包保留原型已有依赖与锁文件。最近另对开源候选做了主仓库许可、README和归档状态初筛；没有完成逐依赖许可证审计、安全审计或候选集成测试。

当前可优先验证：Expo（手机）、Supabase（账号与数据）、LiveKit Agents或Pipecat（语音框架候选）、OpenIAP（内购）、shadcn/ui（网页UI）、promptfoo（AI回归）、Playwright（网页测试）。实际仓库、许可与核查时的推送时间见`research/open_source_candidates.csv`。

原型已经带有部分开源UI与框架依赖；不能把所有候选都写成尚无任何开源基础，也不能把提议过的Expo/Supabase/LiveKit/OpenIAP等写成已接入。

## 已发现的选型差异

- 旧`hyochan/react-native-iap`已经归档；当前维护在`hyodotdev/openiap`，含`libraries/expo-iap`及`libraries/react-native-iap`。新旧API与原生构建兼容性需验证。
- LiveKit Agents主框架Apache 2.0，附带轮次检测等模型有独立许可。语音框架免费不代表模型调用、托管或音频基础设施免费。
- Supabase主仓库Apache 2.0；Auth等组件有各自许可。启用Auth或RLS不会自动替我们写好企业数据隔离规则。
- Playwright覆盖网页自动化，不等于iOS/Android真机录音、耳机、后台和商店支付验收。
- promptfoo会调用被测模型时产生相应费用；其开源CLI本身免费，不代表评测API免费。

主仓库许可快照在`research/license_snapshots/`，只是初筛证据，不是已采用版本的完整第三方声明。上线前应核对实际固定版本、传递依赖、模型权重和素材，保留许可、版权、NOTICE与变更声明等要求。

## 本项目与视觉资源

归档最初按私有项目交接。2026-10-24 JST核对时仓库已为Public，但尚未为整个应用选定项目许可证。可见性、依赖的开源许可与本项目代码的分发许可是不同记录；不能因为包含MIT依赖就把全项目标成MIT。Codex for OSS 申请已于2026-10-24由用户确认邮箱和条款后提交，等待外部审核；仓库公开仍不代表全项目已选择许可证。

原型已有的Sites Vite插件许可保留在`prototype/scripts/vite/sites-vite-plugin.LICENSE`。

可点击HTML导出使用原型已安装的lucide-react 1.31.0生成内联SVG，保留其上游声明在`docs/licenses/LUCIDE_LICENSE.txt`。HTML可选从Google Fonts取得Noto Sans JP，离线可用系统字体；未另打包字体文件。PNG为本项目此前生成的视觉概念图，不冒充已完成软件截图。

## 2026-10-24：实际采用与候选的进度

本节合并Claude的[固定提交复用评估](https://github.com/1412845026z-jpg/care-kotoba/blob/a43e7edebf5cf7be8a7f0c8b9a3ac0c975dd2207/research/REUSE_REVIEW_2026-10-23.md)与Codex后续复核。PR #9及其后续修复已经合并main；进入main不代表已部署或完成专业验收。

| 来源 | 当前用途与落点 | 本轮结论 |
| --- | --- | --- |
| Playwright 1.63.0 / esbuild 0.28.2 | main已固定为开发测试依赖；不调用AI即可运行模拟测试 | 工具安装和真实构建已验证；测试通过仍不等于真机通过 |
| kuromoji.js / mecab-ipadic | main的离线固定文字注音生成器及人工读音修正；不把约17MB词典装入浏览器运行时 | 继承属性问题已修复并有回归覆盖；真实dev注音通过。夜中、一回、二人、後已有人工复核记录；专业读音审稿未完成 |
| openai-agents-js | main只参考Realtime序列控制思路，独立实现，没有把SDK加入依赖 | 已修复从发出response.create即占用的竞争窗口，模拟回归通过；真实OpenAI事件时序未验收。未来复制SDK代码仍须保留其MIT声明 |
| ts-fsrs 5.4.2 | REVIEW-DEP-001固定运行依赖（无传递依赖），功能由Claude REVIEW-001实现 | MIT；锁文件和npm integrity固定正式版，不使用6.0.0-beta；未接入调度或学习状态功能 |
| promptfoo | 模型迁移候选；固定评测数据已存在于evals/ | 尚未接入CLI或运行真实模型；未来真实评测调用须另获费用授权 |
| 厚生劳动省所载教材 | CONTENT-002仅核对30个常用词的词形、读音与页码，另写4个项目词条和原创教学说明 | 新数据见content/terminology/；尚未接入应用、未专业审稿，不复制教材定义、译文段落或图像 |
| 日本介護福祉士会学习网站 / 预生成语音 / 自托管模型 | 链接或候选 | 免费学习、开源引擎和模型权重许可各不相同；本轮免费本机样本见AUDIO-SAMPLES-001；未接入托管或App |

PR #9的kuromoji Apache-2.0文本和NAIST/ICOT词典声明分别位于其`docs/licenses/KUROMOJI_JS_LICENSE-2.0.txt`、`MECAB_IPADIC_NOTICE.txt`。Codex已读取词典声明中的署名与免责声明条件；发布声明应随实际采用的生成流程和产物范围核对，不因“工具不随包发布”就删掉已有来源说明。本轮没有完成整个依赖树的许可审计。

## 教材PDL条款的范围

2026-10-24 JST读取的[厚生劳动省网站条款](https://www.mhlw.go.jp/chosakuken/index.html)指向[PDL1.0](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)，并要求注明出处及加工主体；PDL1.0保留第三方权利等例外。网站政策允许的范围不能不加核对地推广到所有附件。

Codex实际下载并检查了网站当前链接的中国语用语集（SHA-256 `983cb99491db2ab30875317a652043462e87e7079bab5db922bc0d1639248c2f`）。PDF第227页标明2021年3月由日本介護福祉士会出版，第225页的学习网站广告包含该会的版权标记；《介護の日本語》多语言版PDF第135页也列有协会出版信息。广告版权标记并不能直接判定整本书的许可；协会出版信息也不能证明教材全文归厚生劳动省授权。本轮将教材正文、既有译文和图像的商业复制许可保留为“未确认”，没有给它们贴上“PDL已清权”。

CONTENT-002只记录常用词形、读音与出处页码，学习释义、虚构例句和场景关联由Care Kotoba本轮编写。具体来源、加工范围与限制见`content/terminology/README.md`及`sources.json`。不以官方教材为本应用背书，后续若要复制段落或图像需再核对具体权利。


## 2026-10-24 15:07：直接复用规则与设计来源

用户允许直接复用成熟开源代码：先核对允许商用的许可、固定版本或提交、在此记录来源和用途并保留许可文本。MIT / Apache / BSD / MPL 等逐项遵守条件；GPL / AGPL 代码不并入应用。MPL 文件级开源义务不会因为用于测试就被省略。所有引入通过任务分支和锁文件；不调用付费API、不部署、不安装 impeccable 钩子。

| 来源 / 固定范围 | 许可及保留文本 | 实际用途 / 限制 |
| --- | --- | --- |
| [impeccable](https://github.com/pbakaus/impeccable/tree/936867543ac2576920d663cc9803597f6044f3ac) 4.7.1 | Apache-2.0；`docs/licenses/IMPECCABLE_LICENSE-2.0.txt`、`IMPECCABLE_NOTICE.md` | 原样置于 `.agents/skills/impeccable` / `.claude/skills/impeccable`；设计评审，manifest 固定195项技能文件。没有安装钩子、引擎二进制或执行launcher。NOTICE的派生平台参考另保留 `PLATFORM_DESIGN_SKILLS_LICENSE.txt`（MIT，许可blob `14fac913ccf80234b1848540089a3bbcb6e5283d`） |
| [taste-skill](https://github.com/Leonxlnx/taste-skill/tree/6010f91a9935f1c167dfc500fb1a475681892e6b) 2.1.4 | MIT；`docs/licenses/TASTE_SKILL_LICENSE.txt` | 两套 `design-taste-frontend` 技能入口；不下载外部素材进入产品 |
| [modern-screenshot](https://github.com/qq15725/modern-screenshot) | MIT；`docs/licenses/MODERN_SCREENSHOT_LICENSE.txt`（含版权行） | impeccable上述固定提交附带的未修改UMD；单独版本未声明，以vendor manifest文件SHA-256固定精确产物，不另装npm包 |
| [BIZ UDPGothic](https://github.com/google/fonts/tree/main/ofl/bizudpgothic)（Google Fonts版，OFL许可blob `4df8604ddf1c71f3976116927dab08aada51cfd1`） | OFL-1.1；`docs/licenses/BIZ_UDPGOTHIC_OFL.txt`（原文版权URL照录） | 正文400/700，Google Fonts远程CSS和gstatic字体；未打包字体，商业嵌入可，保留OFL，不单卖字体。实时CSS API不保证版本冻结，实际gstatic版本URL见MERGE真实dev证据；今后固定自托管前需单独评估隐私/离线/版本需求 |
| [BIZ UDPMincho](https://github.com/google/fonts/tree/main/ofl/bizudpmincho)（OFL许可blob `1664f9f625f27e5ba8c6d616bdd02be6836dc67f`） | OFL-1.1；`docs/licenses/BIZ_UDPMINCHO_OFL.txt` | 标题与引用400/700；同上，Google Fonts请求会向Google披露请求信息；不宣称离线字体已验收 |

两份技能的SKILL.md入口、frontmatter与引用可在本会话显式读取；`vendor.mjs --check`及taste的无网络目录查询通过。本环境没有Codex CLI，未验证CLI启动时自动发现列表。没有改动第三方技能本体。

## REVIEW-DEP-001：ts-fsrs 5.4.2

来源：[npm精确版本](https://www.npmjs.com/package/ts-fsrs/v/5.4.2)、[上游](https://github.com/open-spaced-repetition/ts-fsrs)。2026-10-24 npm latest正式版为5.4.2，6.0.0-beta仅预发布，本次不采用。MIT原文取自经过npm sha512 integrity校验的正式tarball，保留在 `docs/licenses/TS_FSRS_LICENSE.txt`；出处、gitHead、完整性和artifact记录见 `verification/REVIEW-DEP-001/package-evidence.json`。

`prototype/package.json`固定 `ts-fsrs: 5.4.2`；锁文件只新增该依赖的importer、package与snapshot，原有解析逐项保持。没有新增传递依赖。包代码不修改，商业分发需随产品保留MIT版权与许可声明。REVIEW-001的交互、存储和复习调度仍由Claude实现；安装依赖不代表功能已经完成。

## AUDIO-SAMPLES-001（样本，不接入产品）

Kokoro-82M v1.0固定HF revision `8542409da2986c0ab5d41b3cf0411f7a58caab38`（Apache-2.0），用kokoro0.9.4 / misaki[ja]0.9.4和本地CPU；日语候选jf_alpha、jm_kumo。VOICEVOX engine0.26.0固定官方CPU发行包完整SHA-256（源码LGPL-3.0/另行授权），仅作临时隔离工具；声音选麒ヶ島宗麟、雀松朱司、玄野武宏，均正常样式。每个角色另有条款，必须分别署名 `VOICEVOX:麒ヶ島宗麟`、`VOICEVOX:雀松朱司`、`VOICEVOX:玄野武宏`，不能把引擎许可等同于音频或角色图像许可。

逐来源、商业使用条件、角色条款链接、许可原文与实际生成记录见 `verification/AUDIO-SAMPLES-001/README.md` 及其 `licenses/`（已保留）。模型/引擎/依赖代码不进入App或仓库；临时工具环境含GPL相关包时也不并入App，生成音频许可单独核对。无远程推理API、无费用、无部署。25段单句与5段对比已由免费CPU生成并检验；仅为技术检视，真正试听尚未完成，官方角色定位不代表实际日本语质量验收。

## A11Y-CI-001：axe 仅用于开发测试

| 固定来源 | 许可与保留文本 | 范围 |
| --- | --- | --- |
| [@axe-core/playwright 4.14.0](https://www.npmjs.com/package/@axe-core/playwright/v/4.14.0)，上游commit [2375f7f5523a2accaeef91a3cb12e30a46e7fbea](https://github.com/dequelabs/axe-core-npm/tree/2375f7f5523a2accaeef91a3cb12e30a46e7fbea/packages/playwright) | MPL-2.0；`docs/licenses/AXE_CORE_PLAYWRIGHT_MPL-2.0.txt`（正式npm包原文），npm sha512见`verification/A11Y-CI-001/package-evidence.json` | 精确devDependency，库源文件不修改，不接入App运行时 |
| [axe-core 4.14.0](https://github.com/dequelabs/axe-core/tree/v4.14.0)（上述包的唯一新增传递依赖） | MPL-2.0；同一完整MPL文本及npm包自身许可；精确解析/完整性固定于锁文件 | 复用既有playwright-core1.63.0，无第二份Playwright或付费服务 |

MPL允许商业使用，但相关覆盖文件仍遵守MPL的源码提供与修改分发条件；保留许可和上游源码链接，不将MPL误写成MIT。脚本只在离线harness/回环mock扫描首页、场景说明、练习、反馈、笔记、设置。axe发现先报告不阻断；执行/导航失败仍作为CI故障。原audit的contrast / targetsUnder24 / textUnder12px原始数组任一非空就失败。没有改audit.mjs或prototype/tests。

## 可选图源调查（尚无素材采用）

5个来源的商业/改编/署名/免费范围见`research/ASSET_SOURCE_LICENSES_2026-10-24.md`。Open Peeps、Humaaans、Open Doodles为CC0候选；Loose Drawing与PAKUTASO为自订许可候选，不能混同CC0。这里只调查许可，没有选图、下载、改编或放入产品；采用前才固定具体素材ID/哈希、保留许可快照并核对人物等条件。
