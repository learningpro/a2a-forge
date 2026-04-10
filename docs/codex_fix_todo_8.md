# A2A-Forge 第8轮修复计划

基于: docs/codex_review_8.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-8-01: workspace import缺少事务+URL唯一约束冲突 — 用事务包裹，URL冲突时映射到已有agent

### High
- [x] TASK-8-02: SSE竞态 — channel.onmessage在streamTask之前注册

### Medium
- [x] TASK-8-03: 未处理的Promise rejection — selectChain/Sidebar/clipboard写入加catch
- [x] TASK-8-04: active_tasks流式任务完成后未清理 — spawn结束时自动remove，active_tasks改为Arc<Mutex>

### Low
- [x] TASK-8-05: Rust unwrap()改为安全处理 — 时间戳unwrap_or_default，Client builder用expect

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
