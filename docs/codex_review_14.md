# A2A-Forge 第14轮审视记录

## 审视范围
- 已阅读架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视与修复基线：[docs/codex_review_13.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_13.md)、[docs/codex_fix_todo_13.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_13.md)
- 已运行 `npx tsc --noEmit`、`npx vitest run`、`cd src-tauri && cargo check`
- 已重点审查 React 列表 `key`、Rust SQL 构造、前后端类型桥、历史/保存测试/工作区链路、以及明显重复实现
- Rust SQL 注入专项结论：本轮未发现新的直接注入风险；检出的动态 SQL 仅拼接固定子句，用户输入仍通过 `bind` 参数化，例如 [history.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L53)、[saved_tests.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L47)

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo]`
- 备注：`a2a.test.ts` 仍打印 `Invalid context JSON, skipping context data`，这是测试覆盖的预期告警，不是失败

## 上轮问题修复状态
- `TASK-13-01 submit_to_community 对损坏 card_json 静默写入`：已完成，现已显式报错，[community.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/community.rs#L109)
- `TASK-13-02 主标签页条件渲染导致不必要卸载`：已完成，已改为保持挂载并用 `display` 切换，[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/TestPanel.tsx#L35)
- `TASK-13-03 未定义 CSS 变量 --radius-sm`：已完成，[index.css](/Users/orange/Documents/code/startup/a2a-workbench/src/index.css#L12)
- `TASK-13-04 Magic number 端口/超时提取为常量`：部分完成。前端已抽出常量并接入 `[constants.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/constants.ts#L1)`、[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L22)、[useStreamingTask.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L6)，但后端和部分 store 仍保留硬编码默认值，如 [proxyStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/proxyStore.ts#L43)、[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L28)、[suites.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/suites.rs#L144)、[workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L202)、[registry.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/registry.rs#L42)
- 第13轮报告中未纳入 todo 的遗留项，仍未修复：
- `typed IPC` 被 `serde_json::Value` + 前端强转绕过，问题仍在，[history.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L44)、[saved_tests.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L40)、[workspaces.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspaces.rs#L8)、[workspaceStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceStore.ts#L28)、[HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L36)、[SavedTestsList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L38)
- `TASK-11-02 executions 订阅粒度过粗`：仍未修复，[SkillPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/SkillPanel.tsx#L176)
- `TASK-11-03 replay_recording 响应 JSON 解析静默降级`：仍未修复，[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L279)
- `TASK-11-04 弹窗缺少 dialog 语义`：仍未修复，[AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L101)、[StepEditor.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L174)

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题

### High
- 本轮未发现新的 High 问题

### Medium
- 历史记录时间戳单位前后端不一致。Rust 保存和返回的是 Unix 秒，[history.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L19)；前端 `HistoryList` 按毫秒计算相对时间并直接传给 `new Date()`，[HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L11)。这会让历史时间显示明显错误，属于直接可见的功能缺陷。
- 两个可编辑的 Header 列表仍使用数组下标作为 `key`，删除或插入中间行时会复用错误的 input 实例，导致光标跳动、输入内容串行到相邻行，严重时会把请求头或默认鉴权头编辑到错误条目上。[InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L184)、[AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L153)

### Low
- 展示型列表里仍有多处不稳定的 index key。当前影响比可编辑表单小，但一旦列表顺序变化，仍可能造成错误复用或预览闪烁，例如社区标签和响应媒体列表。[CommunityPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/community/CommunityPanel.tsx#L136)、[ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L160)、[ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L174)
- Header 行编辑逻辑在测试输入面板和默认请求头弹窗里重复实现了一套 `HeaderEntry`、增删改和序列化流程，维护时很容易出现修一处漏一处；本轮发现的 index key 问题就是两处同时存在的直接证据。[InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L13)、[AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L5)

总体结论：第13轮 todo 中 3 项已完成，1 项只做了前端侧收敛；上轮遗留问题仍有数项未清。第14轮新增问题里，最值得优先修的是“历史时间戳单位错误”和“可编辑列表使用 index key”，前者是明确的用户可见错误，后者会在请求头编辑场景里制造隐蔽但实际影响请求行为的渲染错乱。