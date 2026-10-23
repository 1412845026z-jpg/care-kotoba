# G0-01 检查记录（2026-10-23，Claude）

环境：Claude Code 云端 Linux 沙箱，Node v22.22.0，Chromium 153（headless，Playwright 1.63.0），esbuild 0.28.2，React 19.2.8，TypeScript 6.0.3。项目自己的依赖**没有安装**：npm 仓库被网络策略拒绝（HTTP 403）。所有命令都在 `prototype/` 下执行，环境变量为 `CK_TOOL_NODE_MODULES=<tool-node-modules>`（本机预装的工具包目录）。

| 文件 | 内容 | 被测代码 |
| --- | --- | --- |
| `baseline-tests.tap.txt` / `.json` / `.static.json` | 同一组测试在**未修改的归档源码**上运行：静态检查通过；浏览器测试 5 项通过、15 项失败 | 归档源码 + 测试环境（提交 `56611fb`） |
| `after-tests.tap.txt` / `.json` / `.static.json` | 修复后：静态检查 0 错误（145 个文件可解析；20 个服务端 / 纯逻辑模块通过严格类型检查；6 个组件对照宽松 React 桩检查）；单元测试 33/33；浏览器测试 20/20 | 推送的 G0-01 分支 HEAD（见交接记录） |
| `fix2-tests.json` / `.static.json` | 2026-10-24 setup 清理修复后（ENV-002 第 4 项）：静态检查 0 错误；单元测试 34/34；浏览器测试 22/22（新增 `e2e/setup.e2e.mjs` 2 项）。同一新测试在旧 `helpers.mjs` 上失败：mock 未关闭、子进程 60 秒内没有退出，整个 e2e 组被新加的组超时（`CK_TEST_TIMEOUT_SECONDS`）终止 | 提交 `2bfe1a0`（`tests/README.md` 说明段落在运行后才写，不影响代码） |
| `verify_import_allow_changes.json` | `python3 -I tools/verify_import.py --allow-changes`：归档 ZIP 与导入记录仍然一致；列出导入后有意修改的 12 个原源码文件和 3 份文档 | 同上 |

## 这些结果证明什么、不证明什么

- **证明**：在离线环境中，真实的页面代码和 API 路由代码能按预期处理：访问保护、反馈引用校验、本地存储容错、场景角色；语音客户端在真实（本机）WebRTC 连接上，能正确处理按 GA 格式模拟的 Realtime 事件，包括转写晚到、打断、识别失败、服务端挂断、断线重连、StrictMode 和诊断日志导出。
- 项目本身的 `pnpm install --frozen-lockfile` / `tsc --noEmit` / `pnpm build` 由 CI 在 PR #5 上运行并通过（run 39956032151，提交 `07c5fa3`），这些不在本目录。
- **不证明**：vinext SSR 和 Workers 运行时的行为（ENV-001）；真实 OpenAI 的事件时序、识别准确率、VAD、音质和费用；iPhone / Android 上的表现（docs/09）。

## 复现

```sh
cd prototype
CK_TOOL_NODE_MODULES=/path/to/node_modules-with-esbuild-and-playwright node tests/run.mjs all --report ../verification/G0-01/latest-tests.json
```
