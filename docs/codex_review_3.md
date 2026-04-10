# A2A-Forge 第3轮审视记录

## 审视范围
本轮完成了以下检查：

- 阅读 `CLAUDE.md`，核对项目架构、前后端职责、数据流与验证流程
- 阅读 `README.md`，核对功能宣称、路线图与技术栈说明
- 逐项抽查前端组件、Zustand 状态管理、Rust commands、SQLite 迁移与高级工作区能力
- 实际运行 `npx tsc --noEmit`
- 实际运行 `npx vitest run`
- 实际运行 `cd src-tauri && cargo check`
- 对比 [docs/codex_review_2.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_review_2.md)
- 对比 [docs/codex_fix_todo_2.md](/Users/orange/Documents/code/startup/a2a-workbench/docs/codex_fix_todo_2.md)

## 静态检查结果
- `npx tsc --noEmit`：通过，退出码 `0`，无类型错误输出。
- `npx vitest run`：通过，`7` 个测试文件、`40` 个测试全部通过，耗时约 `1.38s`。
- `cd src-tauri && cargo check`：通过，输出 `Finished dev profile [unoptimized + debuginfo] target(s) in 1.93s`。

## 上轮问题修复状态
### 对 `docs/codex_review_2.md` 的复核
- `[x]` 后端执行链路(suites/proxy/chains)仍从旧 settings 读 headers：已修复，Suite/Proxy/Chain 已统一改走 credentials。相关实现见 [runner.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/a2a/runner.rs#L102) [server.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/proxy/server.rs#L156) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L324)
- `[x]` `Cmd/Ctrl+Shift+C` curl 导出缺少 agent 默认 headers：已修复。相关实现见 [App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L35)
- `[x]` Suite import/export UI 入口缺失：已修复。相关实现见 [SuiteList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/suite/SuiteList.tsx#L40)
- `[x]` DB 初始化失败被吞掉继续启动：已修复。相关实现见 [App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L16)
- `[x]` 凭据 fallback 注释与真实行为不一致：已修复，现已明确为进程内加密缓存。相关实现见 [credentials.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/credentials.rs#L15)
- `[~]` 国际化继续收口：仅部分完成，Community/Workspace/Suite 有改善，但仍残留多处硬编码英文。相关实现见 [App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84) [HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L12) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L138) [AppShell.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/AppShell.tsx#L46)

### 对 `docs/codex_fix_todo_2.md` 的复核
- `[x]` TASK-2-01：已完成
- `[x]` TASK-2-02：已完成
- `[x]` TASK-2-03：已完成
- `[x]` TASK-2-04：已完成
- `[x]` TASK-2-05：已完成
- `[~]` TASK-2-06：部分完成，硬编码英文仍未完全收口

## 新发现的问题
### Critical (阻塞核心功能)
- 问题描述：README 宣称支持自适应输入 `text / JSON / file upload`，UI 里也有 `context` 与文件拖拽入口，但真实发请求时只把 `inputText` 包装成 `input: { prompt: text }`，`contextData` 与 `droppedFile` 完全没有进入 payload。
- 影响范围：所有依赖 JSON 上下文或文件输入的 skill 实际不可用；当前“文件上传/上下文编辑器”属于伪功能。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L37) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L27) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L247) [a2a.ts](/Users/orange/Documents/code/startup/a2a-workbench/src/lib/a2a.ts#L28)
- 建议修复方案：把测试输入建模为统一结构，显式区分 `message/context/files`；由 `buildTaskSendPayload/buildTaskSubscribePayload` 统一生成真实 `input`，并补充对应单测。

- 问题描述：README 宣称“Workspace sharing — export/import full workspace configs”，但后端导出只包含 `workspaceName/agents/envVariables/chains` 的浅层数据，且导入时只真正导入了 `envVariables`，没有导入 agents、suites、chains、chain steps，更没有重建关联。
- 影响范围：v0.5 工作区分享能力不成立；用户导入后拿到的不是“完整工作区”，而是一个只带环境变量的空壳工作区。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L131) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L402) [workspace.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/workspace.rs#L435) [WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L320)
- 建议修复方案：定义稳定的 workspace export schema，完整导出并导入 agents、suites、steps、chains、chain steps、必要 settings；同时为 secret/env 冲突给出显式重建策略和导入报告。

### High (影响用户体验)
- 问题描述：Proxy 的 `replay_recording` 直接重新发裸请求，没有复用 agent 默认鉴权头；和已修复的 suites/proxy/chains 路径不一致。
- 影响范围：对需要默认鉴权头的 Agent，Traffic replay 很容易全部回放失败，v0.3 “Traffic recording and replay” 在受保护代理场景下失真。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L119) [proxy.rs](/Users/orange/Documents/code/startup/a2a-workbench/src-tauri/src/commands/proxy.rs#L230)
- 建议修复方案：在 replay 路径复用 `credentials::get_agent_headers()`，统一走与正常执行一致的 header 合并逻辑，避免录制/回放行为偏离真实请求。

### Medium (代码质量/可维护性)
- 问题描述：国际化没有真正收口，仍有大量用户可见英文硬编码，且部分地方已经定义了 i18n key 却未使用。
- 影响范围：中文模式体验不完整，也会继续放大后续维护成本。
- 相关文件路径：[App.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/App.tsx#L84) [HistoryList.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/HistoryList.tsx#L12) [InputForm.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/test/InputForm.tsx#L138) [AppShell.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/layout/AppShell.tsx#L46) [WorkspacePanel.tsx](/Users/orange/Documents/code/startup/a2a-workbench/src/components/workspace/WorkspacePanel.tsx#L335)
- 建议修复方案：继续清理所有 `placeholder/title/button/empty-state/status` 的硬编码文本，统一走 `t("...")`，并补一个“禁止新增裸文本”的轻量测试或 lint 规则。

### Low (优化建议)
- 问题描述：README 的技术栈说明写的是 `Tailwind CSS 4`，但实际 UI 几乎完全是 inline style，仅在 [index.css](/Users/orange/Documents/code/startup/a2a-workbench/src/index.css#L1) 引入了 Tailwind。
- 影响范围：对外技术说明不准确，容易误导贡献者对样式体系的判断。
- 相关文件路径：[README.md](/Users/orange/Documents/code/startup/a2a-workbench/README.md#L95) [index.css](/Users/orange/Documents/code/startup/a2a-workbench/src/index.css#L1)
- 建议修复方案：要么把 README 改成“Tailwind 已接入，但当前 UI 主要采用 inline styles/CSS variables”，要么逐步把样式体系迁到 Tailwind。