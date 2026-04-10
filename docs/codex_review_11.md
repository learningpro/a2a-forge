# A2A-Forge 第11轮审视记录

## 审视范围
- 已阅读项目架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视与修复清单：[docs/codex_review_10.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_10.md)、[docs/codex_fix_todo_10.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_10.md)
- 已逐项检查前端组件、Zustand stores、Rust `agents/tasks/suites/proxy/workspace/settings` 命令、SQLite 迁移与导入导出链路
- 本轮额外重点复核了 a11y、Rust 错误处理一致性、数据库 N+1、前端重渲染、安全性

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo]`
- 结论：当前主干编译与单测基线稳定，但静态检查未覆盖本轮发现的语义级问题

## 上轮问题修复状态
- `TASK-10-01 Workspace agent URL全局唯一导致跨workspace隐式耦合`：已完成。第 10 个 migration 已移除 `agents.url` 的唯一约束，[src-tauri/src/db.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L295)；`import_workspace` 也改为始终创建当前 workspace 自己的 agent，并重映射 chain/suite 的 agentId，[src-tauri/src/commands/workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L498)
- `TASK-10-02 Proxy录制可在代理未启动时开始`：已完成。前端录制按钮已在 `!proxyRunning` 时禁用，[src/components/proxy/ProxyPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L276)
- `TASK-10-03 Chain执行无效JSON静默降级`：已完成。`run_chain` 现在会对变量替换后的 JSON 显式返回 `Serialization` 错误，[src-tauri/src/commands/workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L302)
- `TASK-10-04 Settings面板死配置`：部分完成。`proxy_url/telemetry` UI 已移除，但 `timeout_seconds` 仍只在设置页读写，[src/components/settings/SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L24)，实际发送任务时仍固定走默认 `30s` 或前端传 `null`，[src-tauri/src/commands/tasks.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L14)、[src/components/test/TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L136)

## 新发现的问题

### Critical
- HTML 测试报告存在明确的 XSS 注入面。`export_report("html")` 把 `suite_name`、`step_name`、断言 `message`、`error_message` 等未转义内容直接拼进 HTML 字符串，[src-tauri/src/commands/suites.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/suites.rs#L364)。这些字段部分来自远端 agent 返回值或可编辑测试配置，攻击者可构造脚本注入报告。前端随后用 `window.open(url, "_blank")` 打开该 blob HTML，[src/components/suite/SuiteRunViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteRunViewer.tsx#L13)，进一步放大了利用面。这个问题已超出“预览不安全”，属于可执行内容注入。

### High
- 本轮未发现新的 High 问题

### Medium
- a11y 存在系统性键盘不可达问题。多个核心列表项仍使用仅 `onClick` 的 `<div>` 作为交互控件，没有 `button` 语义、`tabIndex`、键盘事件或选中态语义，例如 agent 选择项、历史记录、suite 列表、workspace chain 列表、proxy traffic 展开项，[src/components/agent/AgentListItem.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentListItem.tsx#L72)、[src/components/test/HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L120)、[src/components/suite/SuiteList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteList.tsx#L215)、[src/components/workspace/WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L160)、[src/components/proxy/ProxyPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L338)。`JsonTree` 的折叠箭头虽然写了 `role="button"`，但仍没有 `tabIndex`/键盘处理，[src/components/test/JsonTree.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/JsonTree.tsx#L169)
- 弹窗缺少基本无障碍语义与焦点管理。`SettingsPanel`、`AddAgentDialog` 都是普通 `<div>` 覆盖层，没有 `role="dialog"`、`aria-modal`、标题关联，也没有 focus trap 或返回焦点逻辑，[src/components/settings/SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L113)、[src/components/agent/AddAgentDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AddAgentDialog.tsx#L110)。键盘用户和屏幕阅读器都会受影响
- `executions` 的 Zustand 订阅粒度过粗，导致不必要重渲染。`TestPanel`、`SkillPanel`、`ResponseViewer` 都直接订阅整个 `executions` map，[src/components/test/TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L39)、[src/components/layout/SkillPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/SkillPanel.tsx#L176)、[src/components/test/ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L43)。任一技能流式 chunk 追加，都会让整块测试区和技能列表重渲染；技能数一多或 SSE 频率一高，UI 会出现可感知抖动
- 数据库查询存在可见的 N+1 模式。`export_workspace` 先查 chains/suites，再在循环内分别查每个 chain 的 steps、每个 suite 的 steps，[src-tauri/src/commands/workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L410)。`run_chain` 和 `replay_recording` 也在循环内逐条按 agent_id 查 URL，[src-tauri/src/commands/workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L307)、[src-tauri/src/commands/proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L240)。当前数据量小时不明显，但 workspace/suite 增长后会线性放大延迟
- Rust/前端对无效 JSON 的错误处理仍不一致。`run_chain` 已改成显式失败，但 `replay_recording` 仍把损坏的 `request_json` 静默降级为 `{}`，响应体解析失败也静默变成 `{}`，[src-tauri/src/commands/proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L241)。前端普通发任务时，`contextData` 解析失败同样被直接吞掉，[src/lib/a2a.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/a2a.ts#L36)。这会制造“请求成功但语义已变”的伪成功状态

### Low
- 表单可访问性仍偏弱，多个输入框只靠邻近文本或 placeholder 说明，没有显式 `<label htmlFor>` 绑定。例如 Add Agent、Settings、文件拖拽区都存在这个问题，[src/components/agent/AddAgentDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AddAgentDialog.tsx#L163)、[src/components/settings/SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L163)、[src/components/test/InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L253)
- `start_proxy` 在“已运行”这种业务冲突场景下返回 `AppError::Io`，[src-tauri/src/commands/proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L22)。这不影响功能，但会让前端无法按错误种类区分“资源冲突”和“真实 IO 故障”

结论：第10轮的结构性修复大多成立，但 `TASK-10-04` 仍未完全闭环。本轮最重要的新问题是 HTML 报告的 XSS 风险；其次是 a11y 的系统性缺口、`executions` 订阅过粗造成的重渲染，以及几条仍在静默吞错的 JSON 路径。