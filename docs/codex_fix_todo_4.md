# A2A-Forge 第4轮修复计划

基于: docs/codex_review_4.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-4-01: Workspace import agent ID映射 — 导入时建立oldId->newId映射，chain_steps使用新ID

### High
- [x] TASK-4-02: Curl导出缺少context/file — App.tsx和TestPanel.tsx的curl路径已传入context/file
- [x] TASK-4-03: 历史记录和saved tests只保存text — 扩展请求快照包含context/file，历史回填恢复完整状态

### Medium
- [x] TASK-4-04: 补充a2a.ts context/file单测 — 新增4个测试用例覆盖context/file/both/invalid
- [x] TASK-4-05: i18n收口 — InputForm/HistoryList全部替换为t()调用

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 7 files, 44 tests passed (新增4个)
- cargo check: ✅ 通过
