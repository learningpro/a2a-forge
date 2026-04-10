# A2A-Forge 项目审视记录

更新日期：2026-03-27

## 审视范围

本次基于当前代码仓库做了一轮实现层审查，重点覆盖：

- 前端主流程：Agent 管理、手动测试、Suite、Proxy、Community、Workspace、Settings
- Rust 命令层与 SQLite 持久化
- 功能宣称与实际落地的一致性
- 测试覆盖与工程可维护性

已执行验证：

- `npm test`：通过，7 个测试文件 / 40 个测试
- `cargo test`：通过，11 个测试

结论先行：

- 项目当前“功能面”很大，但实现成熟度明显不均衡。
- 核心手动测试能力已经成型，但多处扩展功能仍存在闭环不完整、状态不同步、能力宣称超前的问题。
- 当前更像是“功能型原型 + 一部分已可用模块”，还不适合把 `README` 中的 v0.3-v0.5 能力整体视为稳定完成。

## 已确认问题

### 1. 流式任务状态管理存在严重时序问题

影响：

- 流式任务在刚拿到 `taskId` 后就被立即 `finishTask`
- 很可能出现 UI 过早显示 completed、结果为空、历史记录写入不完整
- 实际 SSE 事件到达时，状态已经被提前收口

代码位置：

- `src/hooks/useStreamingTask.ts:36-49`
- `src/components/test/TestPanel.tsx:99-157`

说明：

- `commands.streamTask(...)` 返回的只是启动成功后的 `taskId`，不是流结束信号。
- 现在的实现拿到 `taskId` 后立刻调用 `finishTask(...)`，但真正的流数据仍通过 `channel.onmessage` 异步到达。
- 后续 `saveHistory(...)` 直接读取 store 当前状态，导致历史结果极可能是 `null`、最后一个 chunk，或状态错误。

建议优先级：`P0`

---

### 2. “添加 Agent”始终写入默认工作区，工作区隔离被破坏

影响：

- 用户在非默认工作区中新增 Agent 时，数据会落到 `default`
- 工作区概念对最基础的新增流程不成立

代码位置：

- `src/components/agent/AddAgentDialog.tsx:51-58`
- `src/components/layout/Sidebar.tsx:21-25`

说明：

- `Sidebar` 明确持有 `activeWorkspaceId`
- 但 `AddAgentDialog` 调用 `addAgent(..., "default")`
- 这不是体验问题，是直接的数据归属错误

建议优先级：`P0`

---

### 3. Proxy 录制功能状态断裂，开始录制后大概率不会真正落盘

影响：

- “Start Recording” 可能只改了 UI/store 状态，没有改到真实代理服务状态
- 录制列表/流量回放能力会表现为不稳定或完全无数据

代码位置：

- `src-tauri/src/commands/proxy.rs:158-176`
- `src-tauri/src/proxy/server.rs:30-35`
- `src-tauri/src/proxy/server.rs:222-248`

说明：

- `start_recording/stop_recording` 修改的是 `AppState.recording_session`
- 实际请求录制读取的是 `ProxyState.recording_session`
- `start_server` 时创建了独立的 `ProxyState`，并没有和 `AppState` 共享录制状态

这意味着当前“录制已开启”的逻辑和真实代理进程不是同一个状态源。

建议优先级：`P0`

---

### 4. 数据层边界被前端直接绕开，后续会放大维护成本

影响：

- 前端直接写 SQLite，破坏 Tauri command 作为唯一后端入口的边界
- 后续若引入权限控制、数据迁移、路径切换、审计日志，会出现行为不一致

代码位置：

- `src/stores/agentStore.ts:81-91`
- `src/App.tsx:14-21`

说明：

- `renameAgent` 直接 `Database.load("sqlite:workbench.db")` 后执行 SQL
- 前端还承担了数据库初始化职责
- 这与项目已经具备完整 Rust command 层的结构不一致，属于架构退化

建议：

- 所有读写统一走 Rust command
- 前端只做状态管理，不直接触达 SQLite

建议优先级：`P1`

---

### 5. 设置里的“数据目录”实际上没有真正生效

影响：

- 设置页向用户暴露了“更改数据存储路径”
- 但当前实现看起来只是在 settings 表里写入了一个字符串
- 实际数据库、文件、导入导出并没有切换到该路径

代码位置：

- `src/components/settings/SettingsPanel.tsx:28-38`
- `src/components/settings/SettingsPanel.tsx:70-79`
- `src-tauri/src/commands/settings.rs:50-75`

说明：

- `get_data_path()` 总是返回 `app_data_dir()`
- `set_data_path()` 只是保存 `data_path` setting
- 没有看到数据库连接、文件存储、迁移逻辑真正读取这个 setting

当前这个能力是“有 UI、有文案、无真实切换”的状态，容易误导用户。

建议优先级：`P1`

---

### 6. README/路线图对功能完成度的表述明显超前

影响：

- 对外预期管理失真
- 容易在试用、发布、社区传播时暴露反差

代码位置：

- `README.md:34-45`
- `README.md:107-133`

典型不一致点：

- README 声称 `Secure Auth` 已完成，但凭据 fallback 仍是 stub
- README 声称 Community Hub 已完成“discover and load popular A2A agents”，但当前实现是本地 SQLite 表驱动，`submit_to_community` 只是把本地 agent 复制到本地 community 表
- README 声称健康监控带 alerts / 周期性检查，但当前代码只有手动触发检查
- README 把 v0.3-v0.5 全部标记为完成，但关键链路仍存在明显实现断层

相关代码：

- `src-tauri/src/credentials.rs:16-18`
- `src-tauri/src/credentials.rs:83-97`
- `src-tauri/src/commands/community.rs:67-129`
- `src-tauri/src/commands/community.rs:204-260`

建议优先级：`P1`

---

### 7. 凭据安全能力未闭环，文档与实现不一致

影响：

- 一旦 keyring 不可用，凭据能力直接降级为报错
- README 对“安全认证”表述过满

代码位置：

- `src-tauri/src/credentials.rs:18-29`
- `src-tauri/src/credentials.rs:34-43`
- `src-tauri/src/credentials.rs:83-97`

说明：

- AES-SQLite fallback 仍是未实现占位
- 删除逻辑也未覆盖 fallback 路径
- 如果目标是跨平台桌面工具，这一块不能长期停留在 stub

建议优先级：`P1`

---

### 8. Community 能力本质仍是“本地收藏夹 + 本地目录”，不是真正社区能力

影响：

- 当前模块更接近“本地组织视图”，不是联网社区
- “popular agents / shared collections” 这类表述会让用户误以为有远程源、同步源、审核源

代码位置：

- `src-tauri/src/commands/community.rs:69-95`
- `src-tauri/src/commands/community.rs:99-129`

说明：

- `list_community_agents` 只查本地 `community_agents`
- `submit_to_community` 只是把本地 `agents` 复制一份到本地 `community_agents`
- 没有远程 registry、签名、评分来源、同步机制

这不是“小功能缺一点”，而是产品语义和实现语义不一致。

建议优先级：`P1`

---

### 9. Proxy 状态信息对 UI 暴露不完整，指标可信度不足

影响：

- UI 中的代理状态缺乏真实运行指标
- `requestCount` 永远为 0，无法反映真实流量

代码位置：

- `src-tauri/src/commands/proxy.rs:46`
- `src-tauri/src/commands/proxy.rs:68-69`
- `src-tauri/src/proxy/server.rs:105-109`
- `src-tauri/src/proxy/server.rs:209-219`

说明：

- 服务内部确实在累计 `request_count`
- 但 command 返回值没有读取真实 server state 中的计数，只是固定写 0

建议优先级：`P1`

---

### 10. 国际化只做了局部覆盖，大量主界面仍硬编码英文

影响：

- 已提供中英文切换，但体验并不完整
- 切换到中文后仍会看到大量英文文本

代码位置：

- 词条定义：`src/lib/i18n.tsx:4-108`
- 大量硬编码示例：
  - `src/components/agent/AddAgentDialog.tsx:38`
  - `src/components/layout/Sidebar.tsx:60`
  - `src/components/proxy/ProxyPanel.tsx:43-53`
  - `src/components/workspace/WorkspacePanel.tsx:34`

说明：

- 当前 i18n 更像“部分接入”，还不能算完整双语支持

建议优先级：`P2`

## 需要优化的实现点

### 1. 主路径交互还偏“原型式”

表现：

- `window.prompt(...)` 仍用于新建 workspace
- 多处通过 `document.dispatchEvent(...)` 做跨组件通信
- 复制 curl、运行测试等交互没有统一反馈与错误处理

代码位置：

- `src/App.tsx:26-34`
- `src/components/layout/Sidebar.tsx:38-43`
- `src/components/layout/Sidebar.tsx:59-63`

建议：

- 用 store 或显式 action 替代全局 DOM event
- 用统一的对话框/输入框替代 `window.prompt`
- 为复制、保存、运行失败建立一致的 toast/notice 机制

### 2. 测试覆盖以纯 store/unit test 为主，关键集成功能几乎没被保护

观察：

- 当前测试主要覆盖 util、store、局部逻辑
- 对以下高风险链路几乎没有集成测试：
  - streaming task 生命周期
  - proxy 录制/回放
  - community 流程
  - workspace chain 执行
  - settings 数据路径切换

结果：

- 单测全部通过，但不能说明核心产品链路稳定

建议：

- 增加 Rust command 层集成测试
- 增加 Tauri mock 或端到端烟测
- 优先补 streaming、proxy、workspace chain 三条链路

### 3. 配置持久化来源分裂

表现：

- UI 配置有的存在 Zustand persist
- 有的存在 SQLite settings
- 有的同时存在两份

代码位置：

- `src/stores/uiStore.ts:20-44`
- `src/components/settings/SettingsPanel.tsx:40-68`
- `src-tauri/src/commands/settings.rs:33-47`

风险：

- 状态来源不单一
- 跨端/重启/未来同步时很容易出现“显示值”和“实际值”不一致

建议：

- 明确一套规则：
  - 纯 UI 临时布局：前端 persist
  - 与业务行为相关的设置：统一落后端 settings

### 4. Workspace 高级能力缺少输入约束和错误引导

表现：

- Chain step 的 request/extract JSON 基本靠用户手写
- 无 schema 校验、无 JSON 格式预检、无 JSONPath 引导

代码位置：

- `src/components/workspace/WorkspacePanel.tsx:192-208`
- `src-tauri/src/commands/workspace.rs:205-227`

建议：

- 前端先做 JSON 校验和错误提示
- 给 extract 配置做结构化表单
- Chain 执行结果中区分“模板替换失败 / JSON 解析失败 / JSONPath 提取失败”

## 正向评价

当前代码也有一些比较扎实的基础：

- 整体模块划分清晰，前后端命令边界大体成型
- 手动测试、Suite、Proxy、Workspace 都有独立面板，结构扩展性不错
- React + Zustand 使用方式整体直接，学习成本低
- Rust 侧命令与 SQLite schema 已具备继续完善的基础
- 现有单元测试虽然偏浅，但至少覆盖了部分核心 store 和工具函数

## 建议的整改顺序

### 第一阶段：先修“功能真假问题”

1. 修复 streaming 生命周期与历史记录落盘
2. 修复 Add Agent 工作区归属
3. 修复 proxy 录制状态共享
4. 下调 README 中不准确的“已完成”表述

### 第二阶段：修“架构边界问题”

1. 去掉前端直接写 SQLite
2. 统一 settings 持久化策略
3. 明确数据目录能力到底要不要做成真实可切换

### 第三阶段：补“产品完成度”

1. Community 模块明确做本地目录还是远程社区
2. 完成安全凭据 fallback
3. 补高风险链路集成测试
4. 完成国际化收口

## 总结

这个项目现在最主要的问题不是“代码完全不可用”，而是：

- 产品包装已经像一个成熟桌面工具
- 但实现层还有不少原型阶段遗留

如果后续要继续推进，建议先把“对外宣称”和“真实能力”对齐，再集中修掉几条关键链路的断点。这样比继续横向加功能更划算。
