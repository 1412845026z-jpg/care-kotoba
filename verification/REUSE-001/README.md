# REUSE-001 检查记录

环境：Claude Code 云端 Linux 沙箱，Node v22.22.0，Chromium 153（Playwright 1.63.0），esbuild 0.28.2；项目依赖未安装（npm 不可达）。命令在 `prototype/` 下执行，`CK_TOOL_NODE_MODULES=<tool-node-modules>`。

| 文件 | 内容 | 被测代码 |
| --- | --- | --- |
| `fix1-tests.json` / `.static.json` | ENV-002 第 2、3 项修复后：static 0 错误；unit 50/50；e2e 25/25 | `a8507d2` |
| `fix1-codex-edges.json` | Codex 的 `verification/ENV-002/reproduce_edges.mjs` 在新代码上的输出：2 个 create、2 个被接受、0 个被拒；4 个注音输入都返回 null，没有异常（诊断输出，不是断言） | `a8507d2` |

不证明：vinext SSR、Workers 运行时、真实 OpenAI 的事件顺序和 `error.event_id`、真机表现。项目自身的 tsc / build 由 PR 上的 CI 运行。
