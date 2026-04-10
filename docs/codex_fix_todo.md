# Codex Review Fix TODO

## Phase 1: P0 — 功能真假问题

### FIX-01: 流式任务状态管理时序问题
- **文件**: `src/hooks/useStreamingTask.ts`, `src/components/test/TestPanel.tsx`
- **问题**: `streamTask()` 返回 taskId 后立即调用 `finishTask()`，但 SSE 数据还在异步到达
- **修复**: 在 SSE channel 的 `onmessage` 中检测终态(completed/failed/canceled)后才调用 `finishTask()` 和 `saveHistory()`
- **验证**: `npx tsc --noEmit && npx vitest run`

### FIX-02: AddAgent 始终写入默认工作区
- **文件**: `src/components/agent/AddAgentDialog.tsx`, `src/components/layout/Sidebar.tsx`
- **问题**: `addAgent(..., "default")` 硬编码，忽略当前 activeWorkspaceId
- **修复**: 从 workspaceStore 或 props 获取 activeWorkspaceId 传入 addAgent
- **验证**: `npx tsc --noEmit && npx vitest run`

### FIX-03: Proxy 录制状态断裂
- **文件**: `src-tauri/src/commands/proxy.rs`, `src-tauri/src/proxy/server.rs`, `src-tauri/src/state.rs`
- **问题**: `start_recording` 写 AppState，但 proxy server 读 ProxyState，两个不同状态源
- **修复**: 让 start_recording/stop_recording 通过 proxy_handle 操作 ProxyState.recording_session
- **验证**: `cd src-tauri && cargo check && cargo test`

## Phase 2: P1 — 架构边界问题

### FIX-04: 前端直接写 SQLite（renameAgent）
- **文件**: `src/stores/agentStore.ts`
- **问题**: `renameAgent` 直接 `Database.load("sqlite:workbench.db")` 执行 SQL
- **修复**: 新增 Rust command `rename_agent`，前端改为调用 Tauri command
- **验证**: `npx tsc --noEmit && cd src-tauri && cargo check`

### FIX-05: 数据目录设置未生效 — 移除误导 UI
- **文件**: `src/components/settings/SettingsPanel.tsx`, `src-tauri/src/commands/settings.rs`
- **问题**: set_data_path 只写 settings 表，实际不切换数据库路径
- **修复**: 移除"更改数据目录"UI，保留 get_data_path 只读显示；或标注"coming soon"
- **验证**: `npx tsc --noEmit`

### FIX-06: README 功能完成度表述超前
- **文件**: `README.md`, `README_CN.md`
- **问题**: v0.3-v0.5 标记为完成，但关键链路有断层；Secure Auth/Community Hub 表述过满
- **修复**: 下调措辞，标注 beta/partial，移除未实现能力的宣称
- **验证**: 人工检查

### FIX-07: 凭据 AES-SQLite fallback 实现
- **文件**: `src-tauri/src/credentials.rs`
- **问题**: AES-SQLite fallback 是 stub，keyring 不可用时直接报错
- **修复**: 用 aes-gcm + machine-derived key 实现加密存储到 SQLite
- **验证**: `cd src-tauri && cargo check && cargo test`

### FIX-08: Proxy requestCount 始终为 0
- **文件**: `src-tauri/src/commands/proxy.rs`, `src-tauri/src/proxy/server.rs`
- **问题**: `get_proxy_status` 和 `start_proxy` 返回硬编码 `request_count: 0`
- **修复**: 从 ProxyState.request_count 读取真实值
- **验证**: `cd src-tauri && cargo check`

### FIX-09: Community 模块语义对齐
- **文件**: `src-tauri/src/commands/community.rs`, 前端 Community 面板
- **问题**: 宣称"社区"但实际是本地收藏夹
- **修复**: UI/文案改为"Local Directory"/"本地目录"，移除"popular/shared"等误导词
- **验证**: `npx tsc --noEmit`

## Phase 3: P2 — 产品完成度

### FIX-10: 国际化收口
- **文件**: `src/lib/i18n.tsx` + 各组件硬编码字符串
- **问题**: 大量组件仍硬编码英文，切换中文后体验不完整
- **修复**: 扫描所有组件，将硬编码字符串替换为 t("key")，补充 i18n 词条
- **验证**: `npx tsc --noEmit && npx vitest run`

### FIX-11: 替换 window.prompt 和 DOM event 通信
- **文件**: `src/App.tsx`, `src/components/layout/Sidebar.tsx`
- **问题**: 用 window.prompt 新建 workspace，用 dispatchEvent 跨组件通信
- **修复**: 用 store action + 对话框组件替代
- **验证**: `npx tsc --noEmit`

### FIX-12: 配置持久化来源统一
- **文件**: `src/stores/uiStore.ts`, `src/components/settings/SettingsPanel.tsx`
- **问题**: 部分设置同时存在 Zustand persist 和 SQLite settings
- **修复**: 纯 UI 布局用前端 persist，业务设置统一走后端 settings command
- **验证**: `npx tsc --noEmit && npx vitest run`

## 最终验证
```bash
npx tsc --noEmit && npx vitest run && cd src-tauri && cargo check && cargo test
```
