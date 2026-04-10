# A2A-Forge 第10轮审视记录

## 审视范围
- 已阅读架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视与修复计划：[docs/codex_review_9.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_9.md)、[docs/codex_fix_todo_9.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_9.md)
- 逐项检查了前端布局、测试面板、Suite/Proxy/Community/Workspace/Settings 组件，主要 Zustand store，以及 Rust `agents/tasks/workspace/workspaces/community/proxy/settings` 命令与 SQLite 迁移

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过
- 本轮未见新的 TypeScript 编译错误或 Rust 编译 warning

## 上轮问题修复状态
- [docs/codex_fix_todo_9.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_9.md) 中 5 个事项，本轮复核均已落地
- `TASK-9-01 SSE首包丢失`：已修复，[testStore.ts#L74](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L74) 已保留已有 `chunks`
- `TASK-9-02 5分钟超时定时器未清理`：已修复，[useStreamingTask.ts#L61](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L61)
- `TASK-9-03 Sidebar loadWorkspaces 裸调用`：已修复，[Sidebar.tsx#L48](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/Sidebar.tsx#L48)
- `TASK-9-04 短生命周期定时器清理`：已修复，[TestPanel.tsx#L47](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L47)、[HistoryList.tsx#L50](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L50)
- `TASK-9-05 删除 SettingsModal.tsx`：已完成，`src/components/settings/` 下仅剩 [SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx)

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题

### High
- Workspace 导入在遇到重复 agent URL 时，会把导入数据映射到“其他 workspace 已存在的 agent”，而不是在新 workspace 内建立可见实体。这与 `agents.url` 的全局唯一约束叠加后，会导致导入后的 chain/suite 引用当前 workspace 列表中不存在的 agent，形成跨 workspace 的隐式耦合和不可见依赖。[db.rs#L42](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L42)、[workspace.rs#L502](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L502)、[workspace.rs#L538](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L538)、[workspace.rs#L561](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L561)、[WorkspacePanel.tsx#L200](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L200)、[WorkspacePanel.tsx#L228](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L228)

### Medium
- Proxy 录制可以在代理未启动时直接开始，但该 session 只写入 `AppState.recording_session`；真正启动代理时，`ProxyState.recording_session` 又从 `None` 初始化，之前的录制状态不会继承，导致用户以为“已开始录制”，实际不会录到任何流量。[ProxyPanel.tsx#L264](/Users/orange/Documents/code/startup/a2a-workbench/src/components/proxy/ProxyPanel.tsx#L264)、[proxy.rs#L163](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L163)、[server.rs#L52](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/server.rs#L52)
- Request chain 执行时对变量替换后的 JSON 直接 `unwrap_or_default()`，无效 JSON 会被静默降级为 `{}` 并继续发请求，配置错误不会被显式暴露，容易产出误导性的“执行成功但结果不对”。[workspace.rs#L302](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L302)
- Settings 面板里的 `timeout_seconds`、`proxy_url`、`telemetry_enabled` 当前基本是“可保存但不生效”的死配置。代码搜索显示这些 key 只在设置面板和初始化迁移中出现；运行时任务发送仍只使用调用参数默认值 `30s`，没有消费这些持久化设置。这是一个真实的产品一致性问题。这里我基于全文搜索做出推断。[SettingsPanel.tsx#L30](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L30)、[SettingsPanel.tsx#L53](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L53)、[tasks.rs#L14](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/tasks.rs#L14)、[settings.rs#L35](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/settings.rs#L35)

### Low
- 流式任务相关测试仍未覆盖真实 `hook + Channel + store` 时序，只验证了抽离后的状态判定逻辑。上一轮 SSE 竞态虽然已修好，但这类问题未来仍可能绕过测试网。[streamingTask.test.ts#L3](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/streamingTask.test.ts#L3)、[useStreamingTask.ts#L27](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L27)、[testStore.ts#L74](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/testStore.ts#L74)

## 总结性评估

### 项目健康度
整体健康度为“良好，接近可收尾状态”。静态检查全绿，第 9 轮修复项本轮复核均成立，主干功能面已经从“明显时序/资源清理问题”转向“跨模块语义一致性和产品边角闭环”问题。说明工程基本盘是稳的。

### 遗留风险
最值得关注的不是编译质量，而是数据模型与产品语义之间的偏差。当前最大的风险是 workspace 隔离边界不彻底，尤其是 agent 的全局唯一 URL 与导入逻辑共同造成的跨 workspace 引用。其次是少量“UI 提供了能力，但运行时并未真正实现”的设置项，以及 proxy/chain 这类进阶能力在异常路径上的用户感知不够清晰。

### 下一步建议
1. 优先修正 workspace/agent 关系模型。要么允许同 URL 在不同 workspace 各自存在，要么把 agent 抽成全局实体并显式建立 workspace-agent 关联表，不能继续维持当前半隔离状态。
2. 修掉 proxy 录制启动语义和 chain JSON 校验问题，让进阶功能在异常路径上“明确失败”而不是静默退化。
3. 收紧设置面板，只保留真正生效的配置；未接入运行时的项要么实现，要么先下线。
4. 增加一层集成测试：覆盖 `useStreamingTask`、workspace import、proxy recording 这三条最容易再次回归的链路。