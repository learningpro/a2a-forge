# A2A-Forge 第9轮审视记录

## 审视范围
- 已阅读架构文档：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)。
- 已阅读功能宣称文档：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)。
- 已对照上轮审视与修复计划：[docs/codex_review_8.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_8.md)、[docs/codex_fix_todo_8.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_8.md)。
- 前端逐项检查了 `layout/agent/test/suite/proxy/community/workspace/settings` 组件、[useStreamingTask.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts)、[useKeyboardShortcuts.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useKeyboardShortcuts.ts)、[useTheme.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useTheme.ts) 以及各 Zustand store。
- Rust 重点检查了 `tasks/workspace/agents/history/saved_tests/workspaces/community/proxy` 命令、[db.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs)、[state.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/state.rs)、[lib.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/lib.rs)。
- 本轮重点关注了 `cargo warning`、前端定时器/监听器清理、未处理 Promise、未使用依赖/导入，以及第 8 轮标记为已完成的事项是否真的闭环。

## 静态检查结果
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过。
- `cd src-tauri && cargo check`：通过。
- `cargo check` 输出中未见新的 Rust warning。
- `tsconfig.json` 开启了 `noUnusedLocals` / `noUnusedParameters`，本轮未发现会被编译器直接报出的未使用导入；但仍发现了“未使用文件/依赖”级别的残留，见下文 Low。

## 上轮问题修复状态
- `TASK-8-01 workspace import缺少事务+URL唯一约束冲突`：已修复。`import_workspace()` 已使用事务包裹，并在 URL 冲突时映射到既有 agent，[workspace.rs#L470](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L470)、[workspace.rs#L502](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L502)、[db.rs#L44](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L44)。
- `TASK-8-02 SSE竞态`：未真正修复。`channel.onmessage` 的注册顺序改对了，[useStreamingTask.ts#L27](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L27)；但首包若在 `startTask()` 前到达，会先写入 `emptyExecution`，随后被 `startTask()` 的 `chunks: []` 覆盖，[useStreamingTask.ts#L38](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L38)、[useStreamingTask.ts#L56](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L56)、[testStore.ts#L89](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L89)、[testStore.ts#L74](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L74)。
- `TASK-8-03 未处理的Promise rejection`：部分修复。`selectChain()`、剪贴板写入、创建 workspace 已补 `catch`；但 Sidebar 挂载时 `loadWorkspaces()` 仍是裸调用，[workspaceAdvancedStore.ts#L89](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceAdvancedStore.ts#L89)、[TestPanel.tsx#L83](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L83)、[Sidebar.tsx#L47](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L47)。
- `TASK-8-04 active_tasks流式任务完成后未清理`：已修复。[tasks.rs#L102](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L102) 已在流自然结束时移除任务，[state.rs#L10](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/state.rs#L10) 也已改为 `Arc<Mutex<...>>`。
- `TASK-8-05 Rust unwrap()改为安全处理`：基本完成。此前时间戳 `unwrap()` 已去掉；`reqwest::Client` 构建改成了 `expect`，[state.rs#L18](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/state.rs#L18)。这不再是运行期 warning 问题，但仍是启动期硬失败点，不算 bug，只是保留了显式 fail-fast。
- 上轮提到的 `streamingTask` 测试覆盖不足：仍未修复。当前测试仍是抽离纯函数测试，没有覆盖真实 hook/channel/store 的时序，[streamingTask.test.ts#L3](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts#L3)。

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题。

### High
- SSE 首包丢失问题仍然真实存在，而且第 8 轮 Todo 将其标为已完成并不成立。虽然 `channel.onmessage` 已在 `streamTask()` 前注册，[useStreamingTask.ts#L27](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L27)；但事件回调会立刻 `appendChunk()`，[useStreamingTask.ts#L38](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L38)，而此时执行态尚未由 `startTask()` 初始化，[useStreamingTask.ts#L56](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L56)。`appendChunk()` 会基于 `emptyExecution` 建立临时记录，[testStore.ts#L92](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L92)；随后 `startTask()` 直接把同一 key 覆盖成 `chunks: []`，[testStore.ts#L74](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L74)，导致早到的 `pending/running` 首包仍会丢失。这个问题会直接影响流式状态展示和结果时间线。

### Medium
- `useStreamingTask()` 的 5 分钟超时定时器没有清理，正常完成的流式任务也会额外悬挂一个 5 分钟的 closure。[useStreamingTask.ts#L60](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L60) 里 `Promise.race()` 使用 `setTimeout()`，但没有保存 timer id 并在 `streamDone` 先完成时 `clearTimeout()`。高频流式测试时，这会形成可累计的短期内存滞留，属于你特别要求关注的前端泄漏风险。
- 第 8 轮 Todo 中“未处理的 Promise rejection 已完成”不准确，Sidebar 初始加载仍有裸 Promise 调用。[Sidebar.tsx#L47](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L47) 直接调用 `loadWorkspaces()`，而 store 实现本身会抛错而不是内部吞掉异常，[workspaceStore.ts#L24](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceStore.ts#L24)。如果 Tauri 命令失败，这里仍可能形成未处理 rejection。
- `streamingTask` 的测试仍无法覆盖真实时序 bug，所以本轮 High 问题没有被测试网拦住。[streamingTask.test.ts#L5](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts#L5) 明确写着只测试抽离逻辑；它没有覆盖 `Channel` 事件先于 `startTask()` 到达时的 store 覆盖行为。

### Low
- 仍有几处短生命周期定时器未在卸载时清理，严格来说都属于轻量泄漏风险。
  - 历史搜索 debounce 没有在卸载时 `clearTimeout()`，[HistoryList.tsx#L60](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L60)。
  - 保存测试名输入框聚焦延时没有清理，[SavedTestsList.tsx#L56](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L56)。
  - `curlCopied` 复位定时器和 rerun 延时没有清理，[TestPanel.tsx#L85](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L85)、[TestPanel.tsx#L221](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L221)。
- 存在未使用的前端残留文件：[SettingsModal.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsModal.tsx) 当前未被任何组件引用，但仍保留了一整套旧设置 UI 和硬编码英文文案，[SettingsModal.tsx#L201](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsModal.tsx#L201)。这不会影响运行，但会增加维护噪音，并且与当前 [SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx) 的实现分叉。
- 存在疑似未使用的 npm 依赖。基于全文搜索，`@tauri-apps/plugin-dialog`、`@tauri-apps/plugin-fs`、`@tauri-apps/plugin-store`、`@tauri-apps/plugin-window-state`、`geist` 在 `src/` 中没有任何导入，[package.json#L18](/Users/orange/Documents/code/startup/a2a-workbench/package.json#L18)。这里我做一个保守推断：它们可能仅因 Rust 侧插件初始化或未来设计预留而保留，但从当前前端实现看，它们至少不是“正在被 TS 代码直接使用”的依赖。
- 未发现新的 Rust `cargo warning`，也未发现新的未使用导入编译警告；当前问题更多集中在运行时时序和轻量资源清理，而不是编译面。

