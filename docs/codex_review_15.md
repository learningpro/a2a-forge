# A2A-Forge 第15轮审视记录

## 审视范围
- 已阅读架构说明：[CLAUDE.md](/Users/orange/Documents/code/startup/a2a-workbench/CLAUDE.md)
- 已阅读功能宣称：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md)
- 已对照上轮审视基线：[docs/codex_review_14.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_14.md)
- 已对照上轮修复清单：[docs/codex_fix_todo_14.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_14.md)
- 已运行 `npx tsc --noEmit`、`npx vitest run`、`cd src-tauri && cargo check`
- 已重点复查超时设置链路、typed IPC 边界、Zustand 订阅粒度、代理回放错误处理、历史/保存测试/工作区链路与测试覆盖

## 静态检查结果
- `npx tsc --noEmit`：通过
- `npx vitest run`：通过，`9` 个测试文件、`65` 个测试全部通过
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo]`
- 备注：`a2a.test.ts` 仍输出 `Invalid context JSON, skipping context data`，属于测试覆盖的预期告警，不是失败

## 上轮问题修复状态
- `TASK-14-01 历史记录时间戳单位不一致`：已完成，[HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L11) 已改为秒转毫秒
- `TASK-14-02 可编辑 Header 列表使用 index key`：已完成，[InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L190) 与 [AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L163) 均已改为稳定 `id`
- `TASK-14-03 剩余弹窗 dialog 语义`：已完成，[AgentHeadersDialog.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L124) 与 [StepEditor.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/StepEditor.tsx#L185) 已补齐 `role` / `aria-*`
- 第14轮报告中标记的更早遗留项，当前仍未完全解决：
- `TASK-13-04 magic number 收敛`：仍为部分完成，前端已抽常量，但 [proxyStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/proxyStore.ts#L40) 与 [proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L25) 仍保留硬编码默认值
- `typed IPC 被 serde_json::Value + 前端强转绕过`：仍未修复，[history.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L44)、[saved_tests.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L40)、[workspaces.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspaces.rs#L8)、[workspaceStore.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/workspaceStore.ts#L28)、[SavedTestsList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L38)
- `TASK-11-02 executions 订阅粒度过粗`：仍未修复，[SkillPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/SkillPanel.tsx#L176)
- `TASK-11-03 replay_recording 响应 JSON 解析静默降级`：仍未修复，[proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L279)

## 新发现的问题

### Critical
- 本轮未发现新的 Critical 问题

### High
- 全局超时设置单位前后端不一致，属于直接影响运行结果的配置缺陷。设置页以“毫秒”展示并保存 `timeout_seconds`，[SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L17) [SettingsPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L49)；数据库默认值却是 `30`，[db.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/db.rs#L96)；执行时又把该值再除以 `1000` 传给 Rust，[TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L53) [TestPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L149)。结果是设置页会把默认 `30s` 显示成 `30ms`，用户输入 `1000` 时实际生效约 `1s`，配置认知与真实行为明显错位。

### Medium
- 自动化测试覆盖仍明显偏向 store/工具函数，多个 README 已宣称完成的用户链路没有测试兜底。当前前端只有 `9` 个测试文件，[src/__tests__/a2a.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/__tests__/a2a.test.ts) 到 [src/stores/uiStore.test.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/uiStore.test.ts) 主要覆盖 payload/store/快捷键；未见 `HistoryList`、`SavedTestsList`、`CommunityPanel`、`workspaceStore`、代理录制回放等关键界面/流程测试。Rust 侧测试也仅集中在 [assertions.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/a2a/assertions.rs#L248) 和 [interceptor.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/interceptor.rs#L165)，对命令层和 SQLite 读写覆盖不足。

### Low
- 展示型列表里仍残留 `index key`，虽然风险低于可编辑表单，但顺序变化时依旧可能导致错误复用或渲染闪烁，例如 [ResponseViewer.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/ResponseViewer.tsx#L160) 与 [CommunityPanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/community/CommunityPanel.tsx#L136)

## 总结性评估

### 健康度评分
- `7.5/10`
- 结论：项目已经从“多点易碎”进入“整体可用、少数结构性问题待清”的阶段。编译、单测、Rust 检查全绿，且第14轮 todo 已全部完成；当前主要短板不再是大面积功能故障，而是配置一致性、类型边界和覆盖深度。

### 遗留风险 TOP 3
- 超时设置单位错位，可能让用户在生产验证时得到完全错误的超时行为，这是当前最需要优先修掉的用户可见缺陷。
- typed IPC 仍被 `serde_json::Value` 和前端强转穿透，导致 `tauri-specta` 的类型桥价值被削弱，后续演进时容易把运行时格式漂移带进 UI。
- 自动化测试未覆盖多条关键业务链路，尤其是历史记录、保存测试、社区目录、工作区与代理回放；这意味着以后改动这些区域时更容易回归而不自知。

### 下一步建议 TOP 3
- 先统一超时设置的单位语义。建议全链路明确成 `timeout_ms` 或 `timeout_secs` 其中一种，并补一组前端 + Rust 回归测试锁定行为。
- 把历史、保存测试、工作区等 `serde_json::Value` 返回改成明确的 Rust `struct`，前端去掉 `as unknown as`，恢复真正的 typed IPC。
- 补一轮高价值测试：`HistoryList`、`SavedTestsList`、`CommunityPanel`、`proxy replay`、`workspace import/export`，优先覆盖 README 已承诺的用户路径而不是继续堆工具函数测试。

### 质量提升对比
- 基于“前14轮累计修复 67 个问题”与当前只剩少数高/中风险项的现状判断，和第1轮相比，项目质量已经是显著提升。
- 如果把第1轮视为“核心链路存在较多明显缺陷、类型与交互细节不稳”的基线，当前大致提升了 `60% - 70%`。
- 更直观地说：项目已经从“需要持续修补才能稳定演示”提升到“可以作为 Beta 持续迭代，但还不适合对配置正确性和回归稳定性掉以轻心”的水平。