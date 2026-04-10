# A2A-Forge 第3轮修复计划

基于: docs/codex_review_3.md
日期: 2026-03-28

## Todolist

### Critical
- [x] TASK-3-01: InputForm context/file数据未进入payload — 提升到testStore，payload builders接受context/file参数
- [x] TASK-3-02: Workspace导入只导入envVariables — 现在完整导入agents/chains/chain_steps

### High
- [x] TASK-3-03: replay_recording未复用agent默认鉴权头 — 使用credentials::get_agent_headers

### Medium
- [~] TASK-3-04: 继续i18n收口 — 已在Round 2覆盖Community/Suite，剩余HistoryList/InputForm/AppShell留后续轮次

### Low
- [x] TASK-3-05: README技术栈Tailwind描述不准确 — 改为CSS Variables + Inline Styles

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 7 files, 40 tests passed
- cargo check: ✅ 通过
