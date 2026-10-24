# REVIEW-DEP-001 — Codex，2026-10-24

- 基准main dc9d60c（#43/#44已顺序merge）；分支codex/REVIEW-DEP-001。
- 用户15:07授权直接复用可商用开源与固定ts-fsrs5.4.2（MIT），不用6beta。功能由Claude REVIEW-001实现；不修改prototype/app、components、lib、tests。
- 当前工作区不能直连npm，临时限定同仓任务分支的workflow由标准runner/pnpm11.25生成锁文件，禁用package scripts；同时仅准备用户已授权的未来axe4.14.0锁文件副本，不在本任务加入axe。
- 下载tarball核对npm integrity并保留包内真实许可；生成器无secret，无付费API/部署/hooks。临时workflow在最终提交删除，避免自动安装任务遗留。
- 未完成：取回review manifest/lock及MIT文本、审阅仅预期变更、frozen install/常规CI通过后合并；最终SHA和证据待补。
