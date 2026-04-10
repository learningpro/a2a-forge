# A2A-Forge 第9轮修复计划

基于: docs/codex_review_9.md
日期: 2026-03-28

## Todolist

### High
- [x] TASK-9-01: SSE首包丢失 — startTask保留已有chunks而非重置为空数组

### Medium
- [x] TASK-9-02: useStreamingTask 5分钟超时定时器未清理 — 保存timer id并在streamDone时clearTimeout
- [x] TASK-9-03: Sidebar loadWorkspaces裸调用 — 加catch

### Low
- [x] TASK-9-04: 清理短生命周期定时器 — HistoryList debounce卸载清理，TestPanel curlCopied/rerun用ref追踪
- [x] TASK-9-05: 删除未使用的SettingsModal.tsx

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
