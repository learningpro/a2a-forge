# A2A-Forge 第7轮修复计划

基于: docs/codex_review_7.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-7-01: workspace import SQL字段不匹配 — created_at改为last_fetched_at

### High
- [x] TASK-7-02: 流式任务SSE竞态 — startTask移到channel.onmessage注册之前
- [x] TASK-7-03: Suite i18n残留 — 断言类型标签、placeholder、SuiteRunViewer状态/错误文案

### Medium
- [x] TASK-7-04: 清理Rust dead_code抑制 — 移除credentials.rs/error.rs的allow(dead_code)，删除未使用的WorkspaceExport结构体

### Low
- [x] TASK-7-05: ResponseViewer空态文案i18n

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
