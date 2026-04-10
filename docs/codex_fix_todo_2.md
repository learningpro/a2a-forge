# A2A-Forge 第2轮修复计划

基于: docs/codex_review_2.md
日期: 2026-03-27

## Todolist

### Critical
- [x] TASK-2-01: 后端执行链路(suites/proxy/chains)仍从旧settings读headers — 统一走credentials模块

### High
- [x] TASK-2-02: Cmd+Shift+C curl导出缺少agent默认headers — src/App.tsx
- [x] TASK-2-03: Suite import/export UI入口缺失 — src/components/suite/SuiteList.tsx

### Medium
- [x] TASK-2-04: DB初始化失败被吞掉继续启动 — src/App.tsx
- [x] TASK-2-05: 凭据fallback实际是HashMap非SQLite — 注释和函数名对齐

### Low
- [x] TASK-2-06: 国际化继续收口 — Community/Workspace/Suite/App硬编码英文替换为t()

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 7 files, 40 tests passed
- cargo check: ✅ 通过
