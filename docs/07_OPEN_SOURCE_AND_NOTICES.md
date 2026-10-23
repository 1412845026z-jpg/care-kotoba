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

归档最初按私有项目交接。2026-10-24 JST核对时仓库已为Public，但尚未为整个应用选定项目许可证。可见性、依赖的开源许可与本项目代码的分发许可是不同记录；不能因为包含MIT依赖就把全项目标成MIT。公开/申请工作已按用户要求暂停。

原型已有的Sites Vite插件许可保留在`prototype/scripts/vite/sites-vite-plugin.LICENSE`。

可点击HTML导出使用原型已安装的lucide-react 1.31.0生成内联SVG，保留其上游声明在`docs/licenses/LUCIDE_LICENSE.txt`。HTML可选从Google Fonts取得Noto Sans JP，离线可用系统字体；未另打包字体文件。PNG为本项目此前生成的视觉概念图，不冒充已完成软件截图。

## 2026-10-24：实际采用与候选的进度

本节合并Claude的[固定提交复用评估](https://github.com/1412845026z-jpg/care-kotoba/blob/a43e7edebf5cf7be8a7f0c8b9a3ac0c975dd2207/research/REUSE_REVIEW_2026-10-23.md)与Codex复核结果。PR #9尚未合并，表内“PR实现”不能读成已进入main或已上线。

| 来源 | 当前用途与落点 | 本轮结论 |
| --- | --- | --- |
| Playwright 1.63.0 / esbuild 0.28.2 | main已固定为开发测试依赖；不调用AI即可运行模拟测试 | 工具安装和真实构建已验证；测试通过仍不等于真机通过 |
| kuromoji.js / mecab-ipadic | PR #9离线生成318条固定文字注音；不把约17MB词典装入浏览器运行时 | Claude记录生成与人工修正；Codex真实dev非语音注音测试通过。词典查找的继承属性问题仍待修复；专业读音审稿未完成 |
| openai-agents-js | PR #9只参考Realtime序列控制的思路，没有把SDK加入依赖 | Claude称为独立实现；Codex已复现response.created确认前的竞争，尚不能把排队缺口写成全部解决。参考记录不替代以后复制代码时的许可核对 |
| ts-fsrs | REVIEW-001候选，尚未加入项目依赖 | 先确定复练交互与状态格式，再由Codex核对稳定版本、许可和锁文件；不把GitHub beta分支当作已采用版本 |
| promptfoo | 模型迁移候选；固定评测数据已存在于evals/ | 尚未接入CLI或运行真实模型；未来真实评测调用须另获费用授权 |
| 厚生劳动省所载教材 | CONTENT-002仅核对30个常用词的词形、读音与页码，另写4个项目词条和原创教学说明 | 新数据见content/terminology/；尚未接入应用、未专业审稿，不复制教材定义、译文段落或图像 |
| 日本介護福祉士会学习网站 / 预生成语音 / 自托管模型 | 链接或候选 | 免费学习、开源引擎和模型权重许可各不相同；本轮未下载语音权重、生成音频或接入托管 |

PR #9的kuromoji Apache-2.0文本和NAIST/ICOT词典声明分别位于其`docs/licenses/KUROMOJI_JS_LICENSE-2.0.txt`、`MECAB_IPADIC_NOTICE.txt`。Codex已读取词典声明中的署名与免责声明条件；发布声明应随实际采用的生成流程和产物范围核对，不因“工具不随包发布”就删掉已有来源说明。本轮没有完成整个依赖树的许可审计。

## 教材PDL条款的范围

2026-10-24 JST读取的[厚生劳动省网站条款](https://www.mhlw.go.jp/chosakuken/index.html)指向[PDL1.0](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)，并要求注明出处及加工主体；PDL1.0保留第三方权利等例外。网站政策允许的范围不能不加核对地推广到所有附件。

Codex实际下载并检查了网站当前链接的中国语用语集（SHA-256 `983cb99491db2ab30875317a652043462e87e7079bab5db922bc0d1639248c2f`）。PDF第227页标明2021年3月由日本介護福祉士会出版，第225页的学习网站广告包含该会的版权标记；《介護の日本語》多语言版PDF第135页也列有协会出版信息。广告版权标记并不能直接判定整本书的许可；协会出版信息也不能证明教材全文归厚生劳动省授权。本轮将教材正文、既有译文和图像的商业复制许可保留为“未确认”，没有给它们贴上“PDL已清权”。

CONTENT-002只记录常用词形、读音与出处页码，学习释义、虚构例句和场景关联由Care Kotoba本轮编写。具体来源、加工范围与限制见`content/terminology/README.md`及`sources.json`。不以官方教材为本应用背书，后续若要复制段落或图像需再核对具体权利。

