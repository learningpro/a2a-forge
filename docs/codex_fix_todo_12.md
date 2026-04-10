# A2A-Forge 第12轮修复计划

基于: docs/codex_review_12.md
日期: 2026-03-28

## Todolist

### High
- [x] TASK-12-01: start_proxy并发竞争 — 持锁期间完成启动
- [x] TASK-12-02: 流式任务超时后未取消后端SSE — 超时时调用cancelTask

### Medium
- [x] TASK-12-03: workspace切换时清空陈旧状态 — SuitePanel/WorkspacePanel重置selection
- [x] TASK-12-04: Sidebar双重loadAgents — 移除handleWorkspaceChange中的冗余调用

### Low
- [x] TASK-12-05: HTML报告blob URL泄漏 — 添加revokeObjectURL延迟回收

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
