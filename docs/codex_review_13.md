# A2A-Forge 第13轮审视记录

## 审视范围
- 已阅读架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视与修复清单：[docs/codex_review_12.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_12.md)、[docs/codex_fix_todo_12.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_12.md)
- 已抽查前端主布局、测试面板、Suite/Proxy/Workspace/Community 组件、Zustand stores、Rust `tasks/proxy/community/settings/history/saved_tests/workspaces` 命令、SQLite 相关链路
- 本轮额外聚焦了 4 个方向：不必要重新挂载、Rust 返回类型安全、magic number/配置常量、CSS 变量定义完整性

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo]`
- 备注：`vitest` 中 `a2a.test.ts` 打印了 `Invalid context JSON, skipping context data`，这是测试刻意覆盖的告警路径，不是失败

## 上轮问题修复状态
- `docs/codex_fix_todo_12.md` 中 5 项均已完成：
- `TASK-12-01 start_proxy并发竞争`：已修复，[proxy.rs:22](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L22)
- `TASK-12-02 流式任务超时未取消后端SSE`：已修复，[useStreamingTask.ts:70](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L70)
- `TASK-12-03 workspace切换时清空陈旧状态`：已修复，[SuitePanel.tsx:15](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuitePanel.tsx#L15)、[WorkspacePanel.tsx:15](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L15)
- `TASK-12-04 Sidebar双重loadAgents`：已修复，[Sidebar.tsx:51](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L51)
- `TASK-12-05 HTML报告blob URL泄漏`：已修复，[SuiteRunViewer.tsx:13](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L13)

- `docs/codex_review_12.md` 中未纳入 todo 的遗留问题，当前仍未完全收口：
- `TASK-11-02 executions 订阅粒度过粗`：仍未修复，`SkillPanel` 继续订阅整个 `executions` map，[SkillPanel.tsx:176](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/SkillPanel.tsx#L176)
- `TASK-11-03 replay_recording 响应 JSON 解析静默降级`：仍未修复，[proxy.rs:279](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L279)
- `TASK-11-04 弹窗缺少 dialog 语义`：仍未修复，[AgentHeadersDialog.tsx:101](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L101)、[StepEditor.tsx:173](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L173)

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题

### High
- 本轮未发现新的 High 问题

### Medium
- 主标签页采用条件渲染，切换 `test/suites/proxy/community/workspace` 时会直接卸载非激活面板，导致面板内本地状态丢失并触发重复初始化。`ProxyPanel` 的 `activeTab/port`、`WorkspacePanel` 的 `activeTab` 及其子表单草稿都会在切换后重置，这属于不必要重新挂载。[TestPanel.tsx:37](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/TestPanel.tsx#L37)、[ProxyPanel.tsx:19](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L19)、[WorkspacePanel.tsx:13](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L13)
- 多个 Rust IPC 命令仍返回 `serde_json::Value`，前端再用 `as unknown as ...` 强转，绕过了 `specta` 的类型桥。这使字段改名、数值类型漂移、空值形态变化都不会在编译期暴露，和项目“typed IPC”目标不一致。[settings.rs:8](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/settings.rs#L8)、[saved_tests.rs:40](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L40)、[workspaces.rs:8](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspaces.rs#L8)、[history.rs:44](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L44)、[workspaceStore.ts:28](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceStore.ts#L28)、[SavedTestsList.tsx:35](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L35)
- `submit_to_community` 对本地损坏的 `card_json` 直接 `unwrap_or_default()`，会把无效 agent 以 `Unknown`、空描述、`0 skills` 的伪数据写进社区目录，而不是报错阻止脏数据进入数据库。[community.rs:111](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/community.rs#L111)

### Low
- 存在未定义 CSS 变量引用。重命名输入框使用了 `var(--radius-sm)`，但全局变量只定义了 `--radius-md` 和 `--radius-lg`，当前样式会静默失效。[AgentListItem.tsx:117](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentListItem.tsx#L117)、[index.css](/Users/orange/Documents/code/startup/a2a-workbench/src/index.css)
- 代理端口和多个超时值仍以 magic number 分散在前后端，容易产生配置漂移。`9339` 同时出现在 store、组件、Rust 命令和 registry 输出；`30000/60000/5min` 也分散在多处默认值中，建议统一抽为共享常量或设置项。[proxyStore.ts:43](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/proxyStore.ts#L43)、[ProxyPanel.tsx:20](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L20)、[proxy.rs:28](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L28)、[registry.rs:42](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/registry.rs#L42)、[TestPanel.tsx:45](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L45)、[StepEditor.tsx:139](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L139)、[useStreamingTask.ts:64](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L64)

总体结论：第 12 轮 todo 已基本兑现，但历史遗留项并未完全清空。本轮新增风险主要集中在“主标签页不必要卸载”和“Rust IPC 返回值弱类型”两类结构性问题，它们短期不一定炸，但会持续放大维护成本和隐藏回归。