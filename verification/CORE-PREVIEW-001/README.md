# CORE-PREVIEW-001 验证材料（Claude，2026-10-24）

- `home-entry-390.png`、`scenes-core-390.png`、`core-modal-390.png`：打开预览后的首页入口、草稿列表、草稿说明（390×844，harness，注音开启）。harness 用占位方块代替图标，真实应用里显示的是 lucide 图标。
- `a11y-390.json`、`a11y-1280.json`：`verification/A11Y-001/audit.mjs` 在两种宽度下检查 10 个画面（新增 home-core、scenes-core、core-modal）。两种宽度的对比度问题都是 0，小于 24px 的点击区域都是 0，都没有横向溢出。
  - 第一次 390px 运行时，「開く」按钮的对比度只有 4.09，加深文字颜色后为 0。
  - 1280px 时出现过 4 处数值，原因是标签颜色还在过渡动画中就测量了。检查脚本改为等待 600ms 后再测，复测为 0。
- 运行环境：Chromium 153 headless，模拟 AI。不代表真机显示效果。
