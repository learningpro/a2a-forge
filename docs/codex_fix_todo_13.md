# A2A-Forge 第13轮修复计划

基于: docs/codex_review_13.md
日期: 2026-03-28

## Todolist

### Medium
- [x] TASK-13-01: submit_to_community对损坏card_json静默写入 — 改为显式报错
- [x] TASK-13-02: 主标签页条件渲染导致不必要卸载 — 改为display:none保持挂载

### Low
- [x] TASK-13-03: 未定义CSS变量 --radius-sm — 在index.css @theme中定义
- [x] TASK-13-04: Magic number端口/超时提取为常量 — 新建lib/constants.ts，替换ProxyPanel/TestPanel/useStreamingTask

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
