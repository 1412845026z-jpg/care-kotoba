# REVIEW-DEP-001 — Codex，2026-10-24

- 基准main dc9d60c（#43/#44已顺序merge）；分支codex/REVIEW-DEP-001。
- 用户15:07授权直接复用可商用开源与固定ts-fsrs5.4.2（MIT），不用6beta。功能由Claude REVIEW-001实现；不修改prototype/app、components、lib、tests。
- 当前工作区不能直连npm，临时限定同仓任务分支的workflow由标准runner/pnpm11.25生成锁文件，禁用package scripts；同时仅准备用户已授权的未来axe4.14.0锁文件副本，不在本任务加入axe。
- 下载tarball核对npm integrity并保留包内真实许可；生成器无secret，无付费API/部署/hooks。临时workflow在最终提交删除，避免自动安装任务遗留。
- 未完成：取回review manifest/lock及MIT文本、审阅仅预期变更、frozen install/常规CI通过后合并；最终SHA和证据待补。

## 依赖准备结果

- 免费标准runner40070194376，源1b4a9ab，artifact12551345679，SHA256 d97553c666ee8ed2b7e5a1db91f9baff7854917a84f9cfa50859c6c69ef3aa06，下载校验通过。
- ts-fsrs5.4.2/MIT、无dependencies/peerDependencies；完整npm sha512与实际MIT文本已留档。latest tag5.4.2、beta tag6.0.0-beta.15，仅采用指定正式版。
- pnpm add --lockfile-only会规范化既有esbuild peer路径并删除旧条目，本任务没有接受这些无关变动：只从pnpm产物选取ts-fsrs importer/package/snapshot三段。结构对比确认原lock全部现有解析不变；最终是package.json +1行、lock +8行。随后由frozen install完整CI验证有效性。
- 临时prepare workflow已删除，不在main遗留自动安装/写锁文件任务；A11Y包只在临时副本中准备，未加入本任务依赖。
- 未完成：最终常规CI与合并，结果随后由下一任务交接补记。

- 前序MERGE证据PR #45已通过最终CI40070094209/security40070094228/fixed40070094239，并merge45c938cca0f810cfff7127be4db0991a5661a6c0；当前依赖提交继承该main的工具/许可，不覆盖Claude的#44。
