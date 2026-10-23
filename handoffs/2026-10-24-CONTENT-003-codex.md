# CONTENT-003：离线内容审稿台

- 作者：Codex；日期：2026-10-24 JST；基准main `e65dab61beead21791e023f06dd8688b0465e7ac`。
- 分支：`codex/CONTENT-003-review-desk`；PR与代码提交见远端。EVAL-002已由PR #14合并；业务PR #5/#9仍未合并。

## 实现

`content/review/index.html`是可直接用普通浏览器打开的独立审稿页，嵌入12场景、34术语和60评测草稿。可搜索/切换场景，查看对话分支、已知/隐藏信息、例句反例、核心词/迁移词与读音，以及折叠的评分草稿。没有npm、服务端、账号、AI调用或外部字体/脚本请求。

每个场景可记意见、建议修改或保留草稿，支持本机保存和JSON导出。笔记按资料指纹隔离，导出附16份源数据的SHA-256和 `formal_approval=false`，不改源JSON、不自动批准内容。本机保存不可用或记录损坏时页面仍可使用并导出。学员原话和输入的审稿文字都转义为文本；任意HTML不会执行。

维护文件为 `template.html`、`build.py`、`README.md`。`python3 content/review/build.py`生成页面，`--check`检查与源数据是否一致，已加入常规CI的数据检查步骤。没有修改原型冻结目录或教学数据本身，没有增加依赖。

## 实际验证

- 16份输入文件的Git blob SHA-1与main `e65dab6`逐项一致；不是从未核对的旧副本生成。
- `python3 content/review/build.py --check`：exit0，12/34/60，来源指纹 `dce1997ee69d631bc8586d3563e5faaf3352cbcf7505c95af871f6c2759df6e0`。
- `PLAYWRIGHT_BROWSERS_PATH=<cache> node verification/CONTENT-003/browser-check.mjs . <installed-prototype>`：实际从file URL打开。12项检查全部通过：导航数量、资料数量、搜索、意见随场景保存、注音术语、配对评分、JSON导出、注入文字不执行、本机重载、键盘tab、390px无横向溢出、损坏笔记不中断页面。
- 浏览器page error=0、HTTP(S)请求=0；移动视口390，document scrollWidth390。结果在 `verification/CONTENT-003/browser-results.json`；这是桌面Chromium模拟手机尺寸，不是真机。
- 首次视觉检查发现测试环境没有中日文字体，文字显示方框，不能据那次截图判断排版。仅为本机QA下载官方NotoSansCJKjp-Regular.otf，SHA-256 `68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5`，配置FONTCONFIG后重跑并检查桌面/390px截图。字体与截图均未打包进页面或仓库；普通设备使用已有中日文字体。字体来源：`https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf`。
- 收尾同时修正了空白意见导出和按资料指纹保存，随后完整重跑12项检查通过。没有把先前检查外推给最终改动。

## 下一步与限制

Claude可打开此页读草稿、导出建议，在自己的新handoff中汇总问题；content/evals源数据仍按分工由Codex整合。这个页面不是学员产品、企业管理系统或审批系统，没有云同步与多人权限；当前专业审稿状态仍未完成。

先完成已交接的Cookie测试确定性修正，吸收最新main并按PR #5→#9合并业务。常规main模拟测试接入仍归下一轮Codex；没有真实AI、部署、费用、公开设置或申请操作。用户要求本轮01:50 JST停止，最终停止交接会列实际状态。
