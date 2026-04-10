# A2A-Forge 第4轮审视记录

## 审视范围
本轮完成了以下检查：

- 阅读 [CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md) 核对架构、数据流、命令分层与验证流程
- 阅读 [README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md) 核对功能宣称与 roadmap
- 逐项检查前端测试链路、输入表单、历史/保存测试、工作区面板、Zustand 状态管理、Rust `workspace/proxy/suites` 命令、SQLite migrations
- 实际运行 `npx tsc --noEmit`
- 实际运行 `npx vitest run`
- 实际运行 `cd src-tauri && cargo check`
- 对比 [docs/codex_review_3.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_3.md)
- 对比 [docs/codex_fix_todo_3.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_3.md)

## 静态检查结果
- `npx tsc --noEmit`：通过，退出码 `0`，无类型错误输出。
- `npx vitest run`：通过，`7` 个测试文件、`40` 个测试全部通过，耗时约 `1.68s`。
- `cd src-tauri && cargo check`：通过，输出 `Finished dev profile [unoptimized + debuginfo] target(s) in 1.07s`。

## 上轮问题修复状态
### 对 `docs/codex_review_3.md` 的复核
- `[x]` InputForm 的 `context/file` 未进入 payload：已修复。运行链路已把 `contextData`、`droppedFile` 传入 payload builder。相关实现见 [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L98) [a2a.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/a2a.ts)
- `[~]` Workspace 导入只导入 envVariables：部分修复。现在确实导入了 `agents/chains/chain_steps`，但导入后的 `chain_steps.agent_id` 仍保留旧工作区 agent id，未重建映射；同时 export/import 仍未覆盖 suites，所以“full workspace configs” 仍不成立。相关实现见 [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L408) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L475)
- `[x]` `replay_recording` 未复用 agent 默认鉴权头：已修复。相关实现见 [proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L231)
- `[~]` 国际化未收口：仍是部分修复，核心页面仍残留多处英文硬编码。相关实现见 [App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L140) [HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L12) [AppShell.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/AppShell.tsx#L46) [WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L234)
- `[x]` README 技术栈中 Tailwind 描述不准确：已修复。相关实现见 [README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L95)

### 对 `docs/codex_fix_todo_3.md` 的复核
- `[x]` TASK-3-01：已完成
- `[~]` TASK-3-02：部分完成
- `[x]` TASK-3-03：已完成
- `[~]` TASK-3-04：部分完成
- `[x]` TASK-3-05：已完成

## 新发现的问题
按严重程度分类：

### Critical (阻塞核心功能)
- 问题描述：Workspace export/import 仍不能产出“可运行的完整工作区”。导出链路会把 chain step 的 `agentId` 原样写出；导入 agents 时会生成新 id，但导入 chain steps 时仍写回旧 `agentId`，没有做旧 id 到新 id 的映射。同时 export/import 完全没有包含 test suites。
- 影响范围：README 宣称的 “Workspace sharing — export/import full workspace configs” 仍不成立；导入后的 chain 很容易直接运行失败，suite 也会丢失。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L131) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L408) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L501)
- 建议修复方案：定义稳定的 workspace export schema，导出 agent 的稳定标识并在导入阶段建立 `oldAgentId -> newAgentId` 映射后重写 chain steps；同时补齐 suites/test_steps 的导出导入和导入报告。

### High (影响用户体验)
- 问题描述：Curl 导出仍不是“等价请求”。虽然真实运行链路已经支持 `context/file`，但两个 curl 导出入口仍只把 `inputText` 传给 `buildTaskSendPayload()`，没有带上 `contextData` 和 `droppedFile`。
- 影响范围：对 JSON 上下文或文件输入类 skill，README 所称 “Copy equivalent curl commands” 不成立；用户复制出去的请求无法复现 UI 中的实际调用。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L41) [App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L44) [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L62)
- 建议修复方案：统一复用当前执行时的完整请求快照，至少包含 `text/context/file/customHeaders`，让 UI 执行与 curl 导出走同一份 payload 构建数据。

- 问题描述：历史记录和已保存测试用例只持久化 `{ skill, text }`，重新加载时也只恢复 `text`。`context/file/headers` 都不会保存，更不会在 rerun 时恢复。
- 影响范围：README 中 “saved test cases for one-click re-run” 只对纯文本输入成立；复杂请求无法可靠复跑，历史记录也不具备完整审计价值。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L42) [README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L87) [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L141) [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L179) [SavedTestsList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L61)
- 建议修复方案：把“请求快照”提升为显式类型，保存完整 payload 输入模型；历史回填、saved test rerun、curl export 都消费同一个快照结构。

### Medium (代码质量/可维护性)
- 问题描述：国际化仍未收口，多个用户可见文案仍是硬编码英文，包括初始化/错误提示、输入占位、历史列表、工作区导入导出等。
- 影响范围：中文模式体验不完整，后续继续新增页面时容易扩大未国际化范围。
- 相关文件路径：[App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L93) [HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L10) [AppShell.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/AppShell.tsx#L46) [WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L298)
- 建议修复方案：继续把 `title/placeholder/loading/status/confirm/result` 文案统一迁到 `t("...")`；再补一个轻量测试或 lint 规则，限制关键 UI 目录新增裸英文字符串。

- 问题描述：新增的 `context/file` payload 支持与 workspace import 关键路径缺少对应测试覆盖。当前 `a2a.test.ts` 仍只验证纯文本 `prompt`，没有覆盖 `context/file` 注入；workspace import/export 也没有回归测试。
- 影响范围：这类“编译通过但行为退化”的问题容易再次出现，本轮发现的 workspace/share 问题就是典型例子。
- 相关文件路径：[a2a.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/a2a.test.ts#L10) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L402)
- 建议修复方案：补前端单测验证 `context/file` 进入 payload；补 Rust 集成测试或最小导入导出回归测试，覆盖 agents/chains/steps/suites 的完整 round-trip。

### Low (优化建议)
- 当前未发现新的 Low 级问题，上一轮 Low 项已修复。