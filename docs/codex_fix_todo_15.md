# A2A-Forge 第15轮修复计划

基于: docs/codex_review_15.md
日期: 2026-03-28

## Todolist

### High
- [x] TASK-15-01: 超时设置单位前后端不一致 — 统一为毫秒显示，秒存储，读取时*1000，保存时/1000

### Medium
- [x] TASK-15-02: SkillPanel executions订阅粒度过粗 — 移入SkillItem组件按key订阅
- [x] TASK-15-03: replay_recording响应JSON静默降级 — 改为保留原始响应文本

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
