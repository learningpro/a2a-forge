# A2A-Forge 第2轮审视记录

## 审视范围
本轮基于当前工作区代码完成了以下检查：

- 阅读 `CLAUDE.md` 与 `README.md`，核对架构分层、功能宣称与验证流程
- 阅读 `docs/codex_review_1.md` 与 `docs/codex_fix_todo_1.md`，逐项复核上轮问题与修复计划
- 抽查前端组件、Zustand 状态、Rust commands、SQLite 迁移与高级工作区能力
- 实际运行 `npx tsc --noEmit`、`npx vitest run`、`cargo check`

## 静态检查结果
- `npx tsc --noEmit`：通过，退出码 `0`，无类型错误输出。
- `npx vitest run`：通过，`7` 个测试文件、`40` 个测试全部通过，耗时约 `910ms`。
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo] target(s) in 0.59s`。

## 上轮问题修复状态
### 对 `docs/codex_review_1.md` 的复核
- `[x]` FIX-01 流式任务超时误判成功：已修复，超时分支现在会标记为 `failed`。
- `[x]` FIX-02 AddAgent 写入默认工作区：已修复，`Sidebar` 仍将 `activeWorkspaceId` 传入 `AddAgentDialog`。
- `[x]` FIX-03 Proxy 录制状态断裂：已修复。
- `[x]` FIX-04 前端直接写 SQLite renameAgent：已修复。
- `[x]` FIX-05 数据目录设置未生效：已按只读展示处理。
- `[~]` FIX-06 README 功能完成度表述超前：比上轮收敛，但仍有部分能力“文档已完成、入口未闭环”的情况。
- `[~]` FIX-07 凭据 AES-SQLite fallback：仍未真正落 SQLite，fallback 还是进程内内存缓存。
- `[x]` FIX-08 Proxy `requestCount` 固定为 0：已修复。
- `[~]` FIX-09 Community 语义对齐：仍混有 `Community / Share / Directory` 语义。
- `[ ]` FIX-10 国际化收口：仍有明显硬编码英文。
- `[x]` FIX-11 替换 `window.prompt`：当前 `src/` 中已无 `window.prompt`。
- `[x]` FIX-12 配置持久化来源统一：边界基本清晰，但自动化执行链路仍残留旧 headers 读取路径。

### 对 `docs/codex_fix_todo_1.md` 的复核
- `[x]` TASK-1-01 历史记录写入 `taskId`：已修复。
- `[x]` TASK-1-02 Saved Tests 字段不匹配：已修复。
- `[~]` TASK-1-03 认证头走 keyring：前端保存/读取已切到 credentials commands，但 Suite / Proxy / Request Chain 仍读取旧 `settings` 表。
- `[x]` TASK-1-04 流式任务超时误判成功：已修复。
- `[~]` TASK-1-05 数据库初始化仍由前端触发：仍未收口，且初始化失败会被吞掉后继续启动 UI。
- `[x]` TASK-1-06 README 路线图补充未实现项标注：已完成。
- `[x]` TASK-1-07 SavedTestsList 替换 `window.prompt`：已完成。
- `[x]` TASK-1-08 `start_proxy` 返回固定 `request_count`：已完成。

## 新发现的问题
### Critical (阻塞核心功能)
- 认证头存储迁移后，自动化执行链路仍从旧 `settings` 表读 headers，导致受保护 Agent 在测试套件、请求链、Proxy 转发场景下会丢失鉴权。
- 影响范围：`v0.2` Test Suites、`v0.3` Proxy、`v0.5` Request Chaining 对需要默认鉴权头的 Agent 实际不可用或行为错误。
- 相关文件路径：[src/stores/agentStore.ts:104](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/agentStore.ts#L104) [src-tauri/src/a2a/runner.rs:102](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/a2a/runner.rs#L102) [src-tauri/src/proxy/server.rs:156](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/server.rs#L156) [src-tauri/src/commands/workspace.rs:324](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L324)
- 建议修复方案：把“读取 agent 默认 headers”抽成统一 Rust 层能力，所有后端执行路径统一走 credentials 模块；完成迁移后删除对 `card:{id}:headers` settings 的依赖。

### High (影响用户体验)
- `Ctrl/Cmd+Shift+C` 导出的 curl 与实际请求不一致，快捷键路径没有合并 agent 默认 headers。
- 影响范围：README 宣称的 Curl Export 在使用默认鉴权头时失真，用户复制出的命令无法复现真实请求。
- 相关文件路径：[src/App.tsx:34](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L34) [src/components/test/TestPanel.tsx:62](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L62)
- 建议修复方案：复用 `TestPanel` 的合并逻辑，在快捷键导出路径中同时注入默认 headers 与自定义 headers。

- Test suite import/export 虽有 store 与后端命令，但桌面 UI 没有对应入口，README 的“在工作空间之间共享测试集”目前对普通用户不可达。
- 影响范围：v0.4 功能宣称与实际可操作性不一致。
- 相关文件路径：[src/stores/communityStore.ts:28](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/communityStore.ts#L28) [src/components/community/CommunityPanel.tsx:8](/Users/orange/Documents/code/startup/a2a-workbench/src/components/community/CommunityPanel.tsx#L8) [src/components/suite/SuitePanel.tsx:10](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuitePanel.tsx#L10)
- 建议修复方案：在 Suite 或 Community 面板补齐导入/导出入口，并把分享对象、目标工作区、冲突处理策略做成显式 UI。

### Medium (代码质量/可维护性)
- 数据库初始化失败后，前端仍会把 `dbReady` 设为 `true` 继续启动，后续所有依赖 DB 的命令会变成延迟失败。
- 影响范围：启动失败场景下没有明确阻断，问题表现会扩散成多个随机功能报错。
- 相关文件路径：[src/App.tsx:15](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L15)
- 建议修复方案：初始化失败时进入明确的 fatal error UI，或把 DB ready 状态下沉到 Rust 启动阶段，前端只消费单一“可用/不可用”信号。

- 凭据 fallback 注释写的是 “AES-SQLite fallback”，实际实现仍是进程内 `HashMap`，安全与持久化语义仍不一致。
- 影响范围：文档、注释与实际行为不一致，且 keyring 不可用时凭据会在重启后丢失。
- 相关文件路径：[src-tauri/src/credentials.rs:140](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/credentials.rs#L140)
- 建议修复方案：要么实现真正的加密 SQLite fallback，要么下调命名与注释，避免误导。

### Low (优化建议)
- 国际化仍未收口，Community / Workspace / 启动态仍有硬编码英文。
- 影响范围：中文模式体验不完整，也与项目已有 i18n 架构不一致。
- 相关文件路径：[src/components/community/CommunityPanel.tsx:75](/Users/orange/Documents/code/startup/a2a-workbench/src/components/community/CommunityPanel.tsx#L75) [src/components/workspace/WorkspacePanel.tsx:335](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L335) [src/App.tsx:67](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L67)
- 建议修复方案：继续将按钮、状态提示、输入占位符、导入结果提示统一替换为 `t("...")`。