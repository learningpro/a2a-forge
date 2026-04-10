# A2A-Forge 第14轮修复计划

基于: docs/codex_review_14.md
日期: 2026-03-28

## Todolist

### Medium
- [x] TASK-14-01: 历史记录时间戳单位不一致 — formatTime将Unix秒转为毫秒
- [x] TASK-14-02: 可编辑Header列表使用index key — InputForm/AgentHeadersDialog改用稳定id

### Low
- [x] TASK-14-03: 剩余弹窗dialog语义 — AgentHeadersDialog/StepEditor加role/aria-modal/aria-labelledby

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
