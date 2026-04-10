# A2A-Forge 第1轮修复计划

基于: docs/codex_review_1.md
日期: 2026-03-27

## Todolist

### High
- [x] TASK-1-01: 历史记录写入 taskId 而非 skill name — src/components/test/TestPanel.tsx
- [x] TASK-1-02: Saved Tests 前后端字段不匹配导致功能不可用 — src/components/test/SavedTestsList.tsx
- [x] TASK-1-03: 认证头未走 keyring，明文存 settings — 新增 credentials commands，前端改用 keyring 存储

### Medium
- [x] TASK-1-04: 流式任务超时误判为成功 — src/hooks/useStreamingTask.ts
- [~] TASK-1-05: 数据库初始化仍由前端触发 — tauri-plugin-sql 要求前端 Database.load() 触发迁移，移除需替换整个插件，本轮跳过
- [x] TASK-1-06: README 路线图仍偏乐观 — 添加未实现项标注

### Low
- [x] TASK-1-07: SavedTestsList 残留 window.prompt — 替换为内联输入框 + i18n
- [x] TASK-1-08: start_proxy 返回固定 request_count: 0 — 改为从 handle.state 读取

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 7 files, 40 tests passed
- cargo check: ✅ 通过
- cargo test: ✅ 通过
