# A2A-Forge 第1轮审视记录

## 审视范围
本轮基于当前工作区代码与文档进行了实现级审视，覆盖：

- 架构与功能基线：`CLAUDE.md`、`README.md`、`docs/codex_review.md`、`docs/codex_fix_todo.md`
- 前端组件：Agent/Test/Proxy/Community/Workspace/Settings 相关面板与对话框
- Rust 命令层：`agents`、`tasks`、`history`、`saved_tests`、`proxy`、`community`、`workspace`、`settings`
- 数据库与迁移：SQLite 初始化、migration、settings/history/saved_tests/proxy/community/workspace tables
- 状态管理：`agentStore`、`testStore`、`uiStore`、`workspaceStore`、`proxyStore`、`communityStore`

## 静态检查结果
- `npx tsc --noEmit`：通过，退出码 `0`，无类型错误输出。
- `npx vitest run`：通过，`7` 个测试文件、`40` 个测试全部通过，耗时约 `993ms`。
- `cd src-tauri && cargo check`：通过，`Finished dev profile [unoptimized + debuginfo] target(s) in 0.85s`。

## 上轮问题修复状态
- `[~]` FIX-01 流式任务状态管理时序问题：`finishTask` 已延后到流结束后，但超时分支仍会被当成 `completed`，实现未完全闭环。
- `[x]` FIX-02 AddAgent 始终写入默认工作区：`Sidebar` 已把 `activeWorkspaceId` 传给 `AddAgentDialog`。
- `[x]` FIX-03 Proxy 录制状态断裂：录制状态已优先写入 `proxy_handle.state.recording_session`。
- `[x]` FIX-04 前端直接写 SQLite（renameAgent）：已改为 Rust `rename_agent` command。
- `[x]` FIX-05 数据目录设置未生效：设置页已改为只读展示数据路径，不再暴露“修改路径”入口。
- `[~]` FIX-06 README 功能完成度表述超前：已加 `Beta`，但 v0.3-v0.5 仍全部打勾，和当前实现成熟度仍不完全一致。
- `[~]` FIX-07 凭据 AES-SQLite fallback：加入了 AES 逻辑，但实际 fallback 仍是进程内 `HashMap`，不是 SQLite 持久化。
- `[~]` FIX-08 Proxy requestCount 始终为 0：`get_proxy_status` 已读取真实计数，但 `start_proxy` 返回仍固定为 `0`。
- `[~]` FIX-09 Community 模块语义对齐：部分文案已向 “Directory” 收口，但 UI/命令/内部语义仍混有 “Community/Share” 概念。
- `[ ]` FIX-10 国际化收口：大量主界面仍存在硬编码英文。
- `[~]` FIX-11 替换 `window.prompt` 和 DOM event 通信：`App/Sidebar` 已去掉对应实现，但项目里仍有 `window.prompt`。
- `[x]` FIX-12 配置持久化来源统一：主题/语言走 Zustand persist，业务设置走后端 settings command，边界比上轮清晰。

## 新发现的问题

### Critical (阻塞核心功能)
本轮未发现会直接阻塞应用启动、类型检查、测试或 Rust 编译的致命问题。

### High (影响用户体验)
1. 历史记录写入了 `taskId`，不是技能名。  
问题描述：`saveHistory` 第二个参数应为 `skill_name`，但前端传入了 `taskId`，导致历史列表展示和搜索维度失真。  
影响范围：历史记录列表会显示 UUID，按技能名检索也会失效。  
相关文件路径：[src/components/test/TestPanel.tsx#L141](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/TestPanel.tsx#L141) [src-tauri/src/commands/history.rs#L8](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/history.rs#L8) [src/components/test/HistoryList.tsx#L134](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L134)  
建议修复方案：把 `saveHistory` 的第二个参数改为 `skill.id`，并补一条前端测试覆盖历史列表展示值。

2. Saved Tests 列表的数据结构与后端返回不匹配，当前功能基本不可用。  
问题描述：前端把返回值当成 `{ skillId, payload }`，但后端实际返回 `{ skillName, requestJson }`；客户端又额外按 `skillId` 过滤，结果会把数据全部过滤掉，重跑时 `test.payload` 也是 `undefined`。  
影响范围：保存的测试用例难以显示、无法稳定重跑，是 README 宣称能力中的实际功能断裂。  
相关文件路径：[src/components/test/SavedTestsList.tsx#L18](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L18) [src-tauri/src/commands/saved_tests.rs#L33](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/saved_tests.rs#L33)  
建议修复方案：统一前后端字段名，前端改为消费 `skillName/requestJson`，移除错误的二次过滤，并在重跑前显式 `JSON.parse(requestJson)`。

3. 认证头并未走 keyring，当前实际是明文存进 `settings`。  
问题描述：`credentials.rs` 虽新增了 keyring/AES 逻辑，但整个模块没有被调用；Agent 默认 headers 仍直接 `JSON.stringify` 后写入 SQLite settings。  
影响范围：README 中 “OS keychain credential storage” 的安全承诺未兑现，敏感 header 会以明文形式保存在本地数据库。  
相关文件路径：[src/stores/agentStore.ts#L104](/Users/orange/Documents/code/startup/a2a-workbench/src/stores/agentStore.ts#L104) [src/components/agent/AgentHeadersDialog.tsx#L19](/Users/orange/Documents/code/startup/a2a-workbench/src/components/agent/AgentHeadersDialog.tsx#L19) [src-tauri/src/credentials.rs#L140](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/credentials.rs#L140)  
建议修复方案：把敏感 header 的存取迁到 Rust command，优先落 OS keyring；fallback 若保留，必须真正写入加密 SQLite，而不是进程内内存表。

### Medium (代码质量/可维护性)
1. 流式任务的超时兜底仍会被误判为成功。  
问题描述：`useStreamingTask` 用 `Promise.race` 等待 5 分钟，若没有收到终态事件，`finalStatus` 为 `undefined`，当前代码仍会把任务标记为 `completed`。  
影响范围：长连接中断、SSE 丢包、代理异常时，UI 和历史都可能出现“假成功”。  
相关文件路径：[src/hooks/useStreamingTask.ts#L57](/Users/orange/Documents/code/startup/a2a-workbench/src/hooks/useStreamingTask.ts#L57)  
建议修复方案：超时分支应显式标记为 `failed` 或 `canceled`，并写入超时错误信息；同时最好返回真正的终态 payload，而不是仅靠 `lastChunk` 推断。

2. 数据库初始化仍由前端直接触发，架构边界没有完全收口。  
问题描述：`App.tsx` 仍在前端直接 `load("sqlite:workbench.db")`，这与“前端只做状态/UI，后端统一负责数据层”的目标不一致。  
影响范围：后续若做数据路径切换、迁移、只读模式或权限控制，会继续出现前后端职责交叉。  
相关文件路径：[src/App.tsx#L15](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L15)  
建议修复方案：把数据库 ready 状态收口到 Rust 启动或单一后端初始化 command，前端只等待状态。

3. README 路线图仍然偏乐观。  
问题描述：虽然已标注 `Beta`，但 v0.3-v0.5 仍全部勾选；而 Saved Tests、认证安全、部分 Community 语义与实现仍存在明显缺口。  
影响范围：对外预期管理仍偏高，容易造成试用落差。  
相关文件路径：[README.md#L114](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L114) [README_CN.md#L114](/Users/orange/Documents/code/startup/a2a-workbench/README_CN.md#L114)  
建议修复方案：将未闭环能力改成 `partial`/`in progress`，或按功能链路拆分“已实现”和“已验证”。

### Low (优化建议)
1. 国际化仍未收口。  
问题描述：Community、Saved Tests、Settings、启动态等区域仍有大量硬编码英文。  
影响范围：切换中文后体验不完整，和已有 i18n 架构不一致。  
相关文件路径：[src/components/community/CommunityPanel.tsx#L75](/Users/orange/Documents/code/startup/a2a-workbench/src/components/community/CommunityPanel.tsx#L75) [src/components/test/SavedTestsList.tsx#L43](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L43) [src/components/settings/SettingsPanel.tsx#L260](/Users/orange/Documents/code/startup/a2a-workbench/src/components/settings/SettingsPanel.tsx#L260) [src/App.tsx#L67](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L67)  
建议修复方案：继续把硬编码字符串替换为 `t("...")`，优先覆盖用户频繁接触的空状态、按钮、对话框和加载态。

2. 项目里仍残留 `window.prompt`。  
问题描述：虽然 `App/Sidebar` 已不再使用 prompt，但 Saved Tests 仍依赖浏览器原生 prompt。  
影响范围：交互风格不一致，不利于桌面端体验和后续可测试性。  
相关文件路径：[src/components/test/SavedTestsList.tsx#L41](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/SavedTestsList.tsx#L41)  
建议修复方案：改成受控对话框组件，顺手补 i18n。

3. Proxy 启动后的首个状态仍是固定计数。  
问题描述：`start_proxy` 返回的 `request_count` 还是写死 `0`，只有后续 `get_proxy_status` 才会读真实值。  
影响范围：虽然不影响功能，但状态展示不够一致。  
相关文件路径：[src-tauri/src/commands/proxy.rs#L22](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L22)  
建议修复方案：直接从新建的 `handle.state.request_count` 读取初始值，保持返回结构一致。