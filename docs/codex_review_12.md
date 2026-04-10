# A2A-Forge 第12轮审视记录

## 审视范围
- 已阅读架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视与修复清单：[docs/codex_review_11.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_11.md)、[docs/codex_fix_todo_11.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_11.md)
- 已逐项检查前端组件、Zustand stores、Rust `tasks/proxy/suites/workspace/agents` 命令、SQLite 导出导入链路
- 本轮重点复核了错误边界、Rust 并发安全、workspace/suite/chain 状态边界、事件/对象 URL 资源回收

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo]`
- 额外说明：前端已存在顶层渲染错误边界 [main.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/main.tsx#L7)，但它只覆盖 React render/lifecycle 同步错误，不覆盖异步命令、事件处理器和被吞掉的 Promise 错误

## 上轮问题修复状态
- `TASK-11-01 HTML测试报告XSS注入`：已完成。HTML 导出已统一做 `esc()` 转义，[suites.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/suites.rs#L364)
- `TASK-11-02 executions Zustand订阅粒度过粗`：部分完成。`TestPanel`、`ResponseViewer` 已改为按 `execKey` 订阅，[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L69)、[ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L40)；但 `SkillPanel` 仍订阅整个 `executions` map，[SkillPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/SkillPanel.tsx#L176)
- `TASK-11-03 replay_recording/a2a.ts 无效JSON静默降级`：部分完成。录制请求 JSON 现在会显式报错，[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L241)；前端也会 `console.warn`，[a2a.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/a2a.ts#L34)；但 `replay_recording` 对响应 JSON 解析失败仍 `unwrap_or_default()` 静默吞错，[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L284)
- `TASK-11-04 弹窗缺少 dialog 语义`：部分完成。`SettingsPanel`、`AddAgentDialog` 已补 `role="dialog"` / `aria-modal`，[SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L125)、[AddAgentDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AddAgentDialog.tsx#L129)；但 `AgentHeadersDialog`、`StepEditor` 仍是普通覆盖层，[AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L101)、[StepEditor.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L173)
- `TASK-11-05 timeout_seconds 设置未接入运行时`：已完成。`TestPanel` 读取设置并把超时传入 `sendTask`，[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L51)、[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L144)
- 上轮未列入 todo 但在 review_11 中提出的问题里，以下仍未解决：键盘不可达交互项、部分弹窗无语义、`export_workspace/run_chain/replay_recording` 的 N+1 查询，[AgentListItem.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentListItem.tsx#L72)、[SuiteList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteList.tsx#L215)、[JsonTree.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/JsonTree.tsx#L171)、[workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L307)、[workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L410)、[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L246)

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题

### High
- `start_proxy` 存在并发竞争窗口。它先在一次加锁里检查 `proxy_handle` 是否为空，再释放锁去 `start_server()`，最后重新加锁写回 handle；两个并发调用可以同时通过检查并分别启动代理，后写入者覆盖前者，导致前一个代理实例失去控制句柄，`stop_proxy` 无法关闭它。[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L30)
- 流式任务超时后没有回收后端 SSE 任务。前端 `useStreamingTask()` 在 5 分钟超时后只把本地状态标记为失败，并没有调用 `cancelTask`；Rust 侧 `stream_task` 生成的后台任务和 `active_tasks` 项会继续存活，直到远端自然结束或通道发送失败，这会造成连接与内存长期占用。[useStreamingTask.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L58)、[tasks.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L61)

### Medium
- workspace/suite/chain 切换存在陈旧状态泄漏。切换 workspace 时，`SuitePanel` 只 reload 列表但不清空 `selectedSuiteId`，`WorkspacePanel` 也只 reload `env/chains` 而不清空 `selectedChainId`、`chainSteps`、`chainRunResult`；结果是右侧编辑区可能继续展示上一个 workspace 的 suite/chain 详情与运行结果。[SuitePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuitePanel.tsx#L15)、[WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L15)、[workspaceAdvancedStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceAdvancedStore.ts#L72)
- suite/chain 的异步加载缺少“只接受当前选择”的保护。`selectSuite()` 与 `selectChain()` 发起异步加载后，若用户快速切换到另一个项，较慢返回的旧请求仍会直接 `set({ steps/runHistory/chainSteps })` 覆盖当前视图，形成典型的 out-of-order race。[suiteStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/suiteStore.ts#L83)、[workspaceAdvancedStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceAdvancedStore.ts#L93)
- workspace 切换时 agent 列表也有同类竞态。`Sidebar` 在 `handleWorkspaceChange()` 里主动 `loadAgents(id)`，同时 `activeWorkspaceId` 的 `useEffect` 又会再调一次；而 `agentStore.loadAgents()` 没有请求序号或 workspace 校验，快速切换时旧 workspace 的响应可以覆盖新 workspace 的 agents。[Sidebar.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L51)、[agentStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/agentStore.ts#L38)

### Low
- HTML 报告导出有对象 URL 泄漏。`SuiteRunViewer` 为 HTML blob 调用了 `URL.createObjectURL()` 并 `window.open()`，但没有 `revokeObjectURL()`；反复导出会累积浏览器内存占用。[SuiteRunViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L18)
- 错误边界虽已存在，但交互链路仍有大量“catch 后直接忽略”的静默失败点，用户会看到无反馈的 no-op 而不是降级 UI。例如历史、设置、保存用例、导入等路径都直接吞错，这会削弱现有 Error Boundary 的实际价值。[HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L45)、[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L52)

结论：第11轮的核心修复里，XSS 与 timeout 接线已经落地，但 a11y、N+1、部分静默降级仍未真正收口。第12轮最值得优先处理的是 `start_proxy` 的并发竞争，以及流式 SSE 任务超时后的后端资源泄漏。