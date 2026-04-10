# A2A-Forge 第7轮审视记录

## 审视范围
- 已阅读架构文档：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)、功能宣称文档：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)。
- 已对照上轮审视与修复计划：[docs/codex_review_6.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_6.md)、[docs/codex_fix_todo_6.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_6.md)。
- 前端重点检查了 `suite/workspace/proxy/test/layout` 组件、`useStreamingTask`、`workspace/suite/test/proxy` 相关 Zustand store。
- Rust 重点检查了 [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs)、[suites.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/suites.rs)、[tasks.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs)、[db.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs)、[lib.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/lib.rs)。
- 数据库重点核对了 migration 与运行时 SQL 是否一致，尤其是 workspace import/export 路径。
- 额外关注了 `cargo warning`、Rust `dead_code` 抑制、以及前端潜在运行时错误。

## 静态检查结果
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过。
- `cd src-tauri && cargo check`：通过，未看到 `warning` 输出。
- 但“无 warning”不代表 Rust 树没有 dead code 风险；当前存在显式抑制：
  [credentials.rs:1](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/credentials.rs#L1)、[workspace.rs:68](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L68)、[error.rs:23](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/error.rs#L23)。

## 上轮问题修复状态
- 对照 `docs/codex_review_6.md`：
- `Suite 模块大量硬编码英文`：部分修复，未完全修复。`SuiteEditor` 主体已接入 `t()`，但 [StepEditor.tsx:13](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L13) 仍保留断言类型英文，且 [SuiteRunViewer.tsx:113](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L113)、[SuiteRunViewer.tsx:120](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L120)、[SuiteRunViewer.tsx:175](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L175) 仍有硬编码。
- `Workspace 导入后未刷新列表/切换`：前端补丁已落地，[WorkspacePanel.tsx:332](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L332) 确实在导入后执行 `loadWorkspaces + setActiveWorkspace`。
- `workspaceAdvancedStore 单测补充`：已完成，测试文件存在且本轮通过：[workspaceAdvancedStore.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/workspaceAdvancedStore.test.ts)。
- `streaming task 状态解析单测补充`：已完成但覆盖不充分，当前测试只验证抽出的纯函数逻辑，未覆盖真实 hook/store 时序：[streamingTask.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts)。

- 对照 `docs/codex_fix_todo_6.md`：
- `TASK-6-01`：应标记为 `部分完成`，不是 `已完成`。计划写的是“全部替换为 t()”，但源码仍有残留：[docs/codex_fix_todo_6.md:9](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_6.md#L9)。
- `TASK-6-02`：前端交互层完成，但整条功能链路仍有后端运行时阻断，见下方 Critical。
- `TASK-6-03`：完成。
- `TASK-6-04`：完成，但测试深度不足，未覆盖真实竞态问题。
- `TASK-6-05`：计划项内提到的 `ProxyPanel/WorkspacePanel` 零散文案已处理，但应用级别仍残留硬编码：[App.tsx:84](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84)。

## 新发现的问题

### Critical
- `workspace import` 当前会在导入 agent 阶段直接失败。migration 中 `agents` 表定义的是 `last_fetched_at`，没有 `created_at` 字段：[db.rs:42](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L42)。但导入逻辑执行的是 `INSERT INTO agents (..., created_at)`：[workspace.rs:512](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L512)。这会导致 `import_workspace` 运行时报 SQL 错误，`TASK-6-02` 前端的刷新/切换逻辑实际上无法走到成功态。

### High
- 流式任务存在明显竞态，早到的 SSE chunk 可能被清空。`useStreamingTask` 先注册 `channel.onmessage` 并允许 `appendChunk()` 写入，再 `await commands.streamTask(...)`，最后才调用 `startTask()`：[useStreamingTask.ts:27](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L27)、[useStreamingTask.ts:47](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L47)、[useStreamingTask.ts:55](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L55)。而 `startTask()` 会把 `chunks` 重置为空数组：[testStore.ts:74](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L74)。如果后端很快推送首个 `pending/running` 事件，前端会丢失最早的状态或 artifact，属于真实运行时风险。
- `suite` 模块国际化未真正收口，但修复计划标成了完成。断言类型标签和 placeholder 仍是英文：[StepEditor.tsx:13](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L13)、[StepEditor.tsx:81](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L81)、[StepEditor.tsx:94](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L94)；运行结果区也仍有硬编码：[SuiteRunViewer.tsx:113](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L113)、[SuiteRunViewer.tsx:120](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L120)、[SuiteRunViewer.tsx:175](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L175)。这与 [i18n.tsx:107](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/i18n.tsx#L107) 之后已经存在大量 suite key 的状态不一致。

### Medium
- `streamingTask` 测试没有覆盖真实 hook/store 时序，只验证了复制出来的状态决策逻辑：[streamingTask.test.ts:1](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts#L1)。因此上面的 SSE 竞态问题不会被当前测试捕获。
- Rust 侧通过 `#[allow(dead_code)]`/`#![allow(dead_code)]` 压住了 dead code 信号，导致 `cargo check` “无 warning” 的信息含量偏低。当前可见抑制点包括：[credentials.rs:1](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/credentials.rs#L1)、[workspace.rs:68](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L68)、[error.rs:23](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/error.rs#L23)。其中 `WorkspaceExport` 结构体当前未被实际使用，属于典型应清理或改为真正复用的对象。

### Low
- 应用启动/数据库失败文案仍是硬编码英文，且没有复用已存在的 i18n key。[App.tsx:84](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84)、[App.tsx:97](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L97) 对应的翻译 key 已经存在于 [i18n.tsx:108](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/i18n.tsx#L108)。
- `ResponseViewer` 空态文案仍为硬编码英文 `Run a test to see results here`，未走国际化：[ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx)。

结论：第6轮里“测试补强”和“导入后刷新/切换”的表面工作基本做了，但本轮发现 `workspace import` 后端 SQL 已经失配，属于更高优先级的功能性回归；同时 `suite i18n` 和 `streaming` 时序问题说明上轮的“完成”判定偏乐观。