# A2A-Forge 第10轮修复计划

基于: docs/codex_review_10.md
日期: 2026-03-28

## Todolist

### High
- [x] TASK-10-01: Workspace agent URL全局唯一导致跨workspace隐式耦合 — 新增migration移除UNIQUE约束，简化import逻辑

### Medium
- [x] TASK-10-02: Proxy录制可在代理未启动时开始 — 前端禁止在proxy未运行时点击录制
- [x] TASK-10-03: Chain执行无效JSON静默降级 — 替换失败时返回明确Serialization错误
- [x] TASK-10-04: Settings面板死配置 — 移除proxy_url和telemetry UI，保留timeout（已生效）

## 验证结果
- npx tsc --noEmit: ✅ 通过
- npx vitest run: ✅ 9 files, 65 tests passed
- cargo check: ✅ 通过
