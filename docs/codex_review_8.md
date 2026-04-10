# A2A-Forge 第8轮审视记录

## 审视范围
- 已阅读架构文档：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)。
- 已阅读功能宣称文档：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)。
- 已对照上轮审视与修复计划：[docs/codex_review_7.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_7.md)、[docs/codex_fix_todo_7.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_7.md)。
- 前端重点检查了 `layout/agent/test/suite/workspace/settings` 组件、`useStreamingTask`、`agent/test/ui/workspace/suite/proxy/community` 各 Zustand store。
- Rust 重点检查了 `agents/tasks/workspace/history/saved_tests/workspaces` 命令、[db.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs)、[state.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/state.rs) 与导入导出链路。
- 重点关注了运行时 SQL 失配、未处理 Promise rejection、Rust `unwrap()` 可能 panic 的位置。

## 静态检查结果
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过。
- `cd src-tauri && cargo check`：通过。

## 上轮问题修复状态
- `TASK-7-01 workspace import SQL字段不匹配`：已修复。`import_workspace` 已改为写入 `last_fetched_at`，[workspace.rs#L501](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L501) 与 schema 中的 `agents.last_fetched_at` 一致，[db.rs#L42](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L42)。
- `TASK-7-02 流式任务SSE竞态`：部分完成，未真正修复。`startTask()` 不再在注册 `onmessage` 之后触发，但 `channel.onmessage` 仍然是在 `await commands.streamTask(...)` 之后才赋值，[useStreamingTask.ts#L29](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L29)、[useStreamingTask.ts#L41](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L41)，早到事件仍可能丢失。
- `TASK-7-03 Suite i18n残留`：已修复。断言类型和结果区均已接入 `t()`，[StepEditor.tsx#L13](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L13)、[SuiteRunViewer.tsx#L113](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L113)。
- `TASK-7-04 清理 dead_code 抑制`：已完成。本轮全文搜索未再发现 `allow(dead_code)` 或 `WorkspaceExport` 残留。
- `TASK-7-05 ResponseViewer 空态 i18n`：已完成，空态已走翻译路径，[ResponseViewer.tsx#L135](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L135)。
- 上轮 `streamingTask` 测试覆盖不足：仍未修复。当前测试依然只是抽离的纯函数测试，没有覆盖真实 hook/channel/store 时序，[streamingTask.test.ts#L3](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts#L3)。

## 新发现的问题

### Critical
- `workspace import` 仍存在真实运行时 SQL 失败路径，而且失败后会留下部分导入数据。`agents.url` 在 schema 中是全局 `UNIQUE`，[db.rs#L44](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L44)；`import_workspace()` 会先插入新 workspace，再逐个插入 agent，[workspace.rs#L470](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L470)、[workspace.rs#L501](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L501)。只要导入包里有 URL 已存在于别的 workspace，导入就会触发 SQLite `UNIQUE constraint failed: agents.url`。更严重的是这里没有事务，失败前已插入的 workspace/env vars 不会回滚，数据库会留下半导入状态。

### High
- SSE 竞态仍然存在，早到的流式事件仍可能丢失。前端是在 `await commands.streamTask(...)` 返回后才设置 `channel.onmessage`，[useStreamingTask.ts#L29](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L29)、[useStreamingTask.ts#L41](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L41)；而 Rust 端在 `stream_task` 内部已经启动了事件消费任务，[tasks.rs#L59](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L59)。如果后端首个 `pending/running` 事件很快到达，前端仍有窗口丢掉首包。

### Medium
- 仍有多处前端未处理的 Promise rejection。
  - `selectChain()` 直接 `.then(set)`，没有 `.catch()`，[workspaceAdvancedStore.ts#L93](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceAdvancedStore.ts#L93)。
  - Sidebar 挂载时 `loadWorkspaces()`、创建 workspace 时 `createWorkspace()` 都是直接调用，调用点没有 `await/catch`，[Sidebar.tsx#L47](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L47)、[Sidebar.tsx#L64](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L64)；而 `workspaceStore` 这两个方法本身会抛错。
  - 多处剪贴板写入未兜底，权限被拒绝时会直接形成 rejection，[TestPanel.tsx#L83](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L83)、[App.tsx#L62](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L62)、[WorkspacePanel.tsx#L326](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L326)。
- `active_tasks` 只在 `cancel_task()` 时删除，正常完成的流式任务不会清理，长期运行会积累无效 `AbortHandle`。[tasks.rs#L103](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L103)、[tasks.rs#L118](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L118)。

### Low
- Rust 侧仍有若干 `unwrap()` 潜在 panic 点，和本轮“重点关注 unwrap 风险”的目标不一致。最明显的是应用启动时构建 `reqwest::Client` 直接 `unwrap()`，[state.rs#L17](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/state.rs#L17)；另外多处时间戳生成仍用 `duration_since(UNIX_EPOCH).unwrap()`，[agents.rs#L61](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/agents.rs#L61)、[agents.rs#L170](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/agents.rs#L170)、[agents.rs#L293](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/agents.rs#L293)、[history.rs#L19](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L19)、[saved_tests.rs#L17](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L17)、[workspaces.rs#L37](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspaces.rs#L37)。这些点平时不易触发，但严格来说仍是可避免的 panic 源。