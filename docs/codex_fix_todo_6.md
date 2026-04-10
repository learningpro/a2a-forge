# A2A-Forge 第6轮修复计划

基于: docs/codex_review_6.md
日期: 2026-03-28

## Todolist

### High
- [x] TASK-6-01: Suite模块大量硬编码英文 — SuiteEditor/StepEditor/SuiteRunViewer全部替换为t()
- [x] TASK-6-02: Workspace导入后未刷新列表/切换 — 导入后自动loadWorkspaces+setActiveWorkspace

### Medium
- [x] TASK-6-03: 补充workspaceAdvancedStore单测 — 12个测试覆盖env/chains/steps/run/diff/export/import
- [x] TASK-6-04: 补充streaming task状态解析单测 — 9个测试覆盖terminal states和timeout逻辑

### Low
- [x] TASK-6-05: 最后一批零散硬编码文案 — ProxyPanel Value.../WorkspacePanel Extracted:

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed (新增21个)
- cargo check: ✅ 通过
