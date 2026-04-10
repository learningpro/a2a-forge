# A2A-Forge 第5轮修复计划

基于: docs/codex_review_5.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-5-01: Workspace export/import补齐suites — 完整导出/导入test_suites和test_steps，含agent ID重映射

### High
- [x] TASK-5-02: 修复Zustand selector反模式 ?? {} — 使用稳定常量EMPTY_HEADERS
- [x] TASK-5-03: ProxyPanel tab名称国际化 — 使用t()替换直接渲染tab名

### Medium
- [x] TASK-5-04: AppShell/WorkspacePanel/ProxyPanel剩余i18n — Settings title, secret badge, Export/Import labels

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 7 files, 44 tests passed
- cargo check: ✅ 通过
