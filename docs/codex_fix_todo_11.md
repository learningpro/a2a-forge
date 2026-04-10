# A2A-Forge 第11轮修复计划

基于: docs/codex_review_11.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-11-01: HTML测试报告XSS注入 — 所有用户内容通过esc()转义后再拼入HTML

### Medium
- [x] TASK-11-02: executions Zustand订阅粒度过粗 — TestPanel/ResponseViewer改为按key订阅单个execution
- [x] TASK-11-03: replay_recording/a2a.ts无效JSON静默降级 — replay返回明确错误，a2a.ts加console.warn
- [x] TASK-11-04: 弹窗缺少dialog语义 — SettingsPanel/AddAgentDialog加role=dialog/aria-modal/aria-labelledby
- [x] TASK-11-05: timeout_seconds设置未接入运行时 — TestPanel读取settings传入sendTask

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
