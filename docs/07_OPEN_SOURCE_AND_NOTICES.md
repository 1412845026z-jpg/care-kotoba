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

本次是用户私有项目交接，没有为整个应用新增MIT或其他公开分发许可。用户定制代码与上游代码的权利边界应另核对，勿因本包包含MIT依赖就将全项目公开。

原型已有的Sites Vite插件许可保留在`prototype/scripts/vite/sites-vite-plugin.LICENSE`。

可点击HTML导出使用原型已安装的lucide-react 1.31.0生成内联SVG，保留其上游声明在`docs/licenses/LUCIDE_LICENSE.txt`。HTML可选从Google Fonts取得Noto Sans JP，离线可用系统字体；未另打包字体文件。PNG为本项目此前生成的视觉概念图，不冒充已完成软件截图。
