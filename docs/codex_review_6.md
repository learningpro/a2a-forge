# A2A-Forge 第6轮审视记录

## 审视范围
- 已阅读架构文档：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)、功能宣称文档：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)。
- 前端：检查了 `src/components` 全部模块（agent/layout/test/suite/proxy/community/workspace/settings/shared）、核心 hooks 与 stores。
- Rust：检查了 `src-tauri/src/commands/*.rs`、`a2a/*`、`proxy/*`、`db.rs`、`lib.rs` 的命令注册与数据流。
- 数据库：检查了 9 轮 migration（`workspaces/agents/history/saved_tests/settings/suites/proxy/community/workspace_advanced`）。
- 状态管理：检查了 `agentStore/testStore/uiStore/suiteStore/proxyStore/communityStore/workspaceStore/workspaceAdvancedStore`。
- 历史对照：对比了 [docs/codex_review_5.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_5.md) 与 [docs/codex_fix_todo_5.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_5.md)。

## 静态检查结果
- `npx tsc --noEmit`：通过（exit code 0，无报错输出）。
- `npx vitest run`：通过，`7` 个测试文件、`44` 个测试全部通过。
- `cd src-tauri && cargo check`：通过（Finished `dev` profile）。
- `cd src-tauri && cargo test`：通过，`11 passed / 0 failed`；未看到 warning 输出。

## 上轮问题修复状态
- 对照 `docs/codex_review_5.md`：
- `[x]` Workspace export/import 未包含 suites（Critical）已修复，现已导出/导入 `suites + steps` 且含 agent ID remap（见 [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L438) 与 [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L551)）。
- `[x]` Zustand selector `?? {}` 反模式已修复，改为稳定常量 `EMPTY_HEADERS`（见 [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L22)）。
- `[x]` ProxyPanel tab 名称国际化已修复（见 [ProxyPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx)）。
- `[~]` AppShell/WorkspacePanel/ProxyPanel 硬编码文本：已修复一部分，但仍有残留（如 [WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L234)、[WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L335)、[ProxyPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L173)）。

- 对照 `docs/codex_fix_todo_5.md`：
- `[x]` TASK-5-01 suites 导入导出补齐：完成。
- `[x]` TASK-5-02 selector 反模式修复：完成。
- `[x]` TASK-5-03 ProxyPanel tab 国际化：完成。
- `[~]` TASK-5-04 AppShell/WorkspacePanel/ProxyPanel i18n 收口：部分完成（核心项完成，但仍有零散硬编码）。

## 新发现的问题

### Critical (阻塞核心功能)
- 本轮未发现新的 Critical 级阻塞问题。

### High (影响用户体验)
- 问题描述：`suite` 模块仍存在大量硬编码英文，和项目“用户可见字符串统一走 i18n”的约束不一致。
- 影响范围：中文/多语言体验不完整，且后续翻译维护成本持续上升。
- 相关文件路径：[SuiteEditor.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteEditor.tsx#L66)、[StepEditor.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L13)、[SuiteRunViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L46)、[SuiteList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteList.tsx#L100)。
- 建议修复方案：补齐 `i18n.tsx` 的 suite 相关 key，所有 literal 文案改为 `t("...")`，并补一条“中英文切换快照测试/文本渲染测试”。

- 问题描述：Workspace 导入成功后未刷新 workspace 列表、也未自动切换到新 workspace。
- 影响范围：用户“导入成功但看不到结果”，需手动触发其他动作才可能看到新工作区。
- 相关文件路径：[WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L332)。
- 建议修复方案：`handleImport` 成功后调用 `workspaceStore.loadWorkspaces()`，并提供“是否切换到新 workspace”的显式交互。

### Medium (代码质量/可维护性)
- 问题描述：前端关键链路测试覆盖不足（streaming、workspace advanced、suite UI 交互）。
- 影响范围：关键功能回归难以及时被 CI 捕获。
- 相关文件路径：[src/__tests__/a2a.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/a2a.test.ts)、[src/__tests__/suiteStore.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/suiteStore.test.ts)、[src/hooks/useStreamingTask.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts)、[src/stores/workspaceAdvancedStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceAdvancedStore.ts)。
- 建议修复方案：新增 `useStreamingTask` 单测、`workspaceAdvancedStore` 导入导出/链式执行单测、`suite` 组件交互测试（运行/重排/断言编辑）。

- 问题描述：Rust 测试主要覆盖 `a2a/assertions` 和 `proxy/interceptor`，未覆盖命令层（workspace/suites/proxy/tasks）与数据库迁移行为。
- 影响范围：后端命令改动易引入功能回归但难以在 `cargo test` 阶段暴露。
- 相关文件路径：[src-tauri/src/a2a/assertions.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/a2a/assertions.rs)、[src-tauri/src/proxy/interceptor.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/interceptor.rs)、[src-tauri/src/commands/workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs)。
- 建议修复方案：增加 `#[tokio::test]` + 临时 SQLite 的命令级集成测试，优先覆盖 `export/import_workspace`、`run_chain`、`run_test_suite`。

### Low (优化建议)
- 问题描述：仍有零散硬编码文案（如 `Value...`、`Extracted:`、`Imported as workspace:`、启动态 `Initializing...`）。
- 影响范围：文案一致性与可国际化性。
- 相关文件路径：[ProxyPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L173)、[WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L234)、[WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L335)、[App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84)。
- 建议修复方案：统一扫一轮 literal 文本并收口到 i18n key。