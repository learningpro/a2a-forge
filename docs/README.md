<div align="center">

# 🔨 A2A-Forge

**The desktop workbench for testing and debugging A2A protocol agents**

[![Build](https://img.shields.io/github/actions/workflow/status/anthropics/a2a-forge/build.yml?style=flat-square)](https://github.com/anthropics/a2a-forge/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?style=flat-square&logo=tauri)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)

[English](#features) · [中文](#功能特性)

---

<img src="docs/screenshots/light-mode.png" alt="A2A-Forge Light Mode" width="800" />

<sub>Three-panel layout: agents sidebar · skill browser · test panel with live results</sub>

<img src="docs/screenshots/dark-mode.png" alt="A2A-Forge Dark Mode" width="800" />

<sub>Dark mode with system-aware theme detection</sub>

</div>

---

## What is A2A-Forge?

A2A-Forge is a native desktop application for developers building [A2A (Agent-to-Agent)](https://google.github.io/A2A/) protocol agents. Think of it as **Postman for A2A** — add any agent by URL, browse its skills, and run live test interactions without writing code.

Built with [Tauri 2](https://v2.tauri.app/) for a fast, lightweight, cross-platform experience.

## Features

- 🔍 **Agent Discovery** — Fetch and inspect `.well-known/agent.json` agent cards instantly
- ⚡ **Skill Testing** — Invoke any skill with adaptive input (text, JSON, file upload)
- 📡 **Live Streaming** — SSE-based streaming with real-time status updates for async tasks
- 🔐 **Secure Auth** — Per-agent default headers with OS keychain credential storage
- 🖼️ **Smart Preview** — Auto-detect and render images, video, and audio inline
- 📋 **Curl Export** — Copy equivalent curl commands with one click
- 📜 **History** — Searchable execution history with saved test cases
- 🗂️ **Workspaces** — Organize agents into separate workspaces
- 🌗 **Themes** — System-aware dark/light mode with manual override
- ⌨️ **Keyboard First** — `Ctrl+N` add agent · `Ctrl+Enter` run · `Ctrl+Shift+C` copy curl

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) v18+
- Platform dependencies: see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install & Run

```bash
git clone https://github.com/user/a2a-forge.git
cd a2a-forge
npm install
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
# Output: .dmg (macOS) / .msi + .exe (Windows)
```

## Usage

### 1. Add an Agent

Click **+ Add agent card** or press `Ctrl/Cmd+N`. Enter the agent's base URL — A2A-Forge fetches the card from `/.well-known/agent.json` and displays all available skills.

### 2. Configure Auth

Click the ⚙️ gear icon next to the agent name to set default headers (e.g., `X-API-Key`). These persist across sessions and apply to all skill tests for that agent.

### 3. Test a Skill

Select a skill → write your input → click **Run** (or `Ctrl/Cmd+Enter`). The response viewer renders results with smart media detection — images display inline, videos play in-app, JSON is syntax-highlighted.

### 4. Review & Iterate

Every execution is saved to history. Save frequently-used requests as named test cases for one-click re-run. Copy the equivalent curl command to share with teammates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Tauri 2.x](https://v2.tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| Database | SQLite (via tauri-plugin-sql) |
| Type Bridge | [tauri-specta](https://github.com/oscartbeaumont/tauri-specta) |
| Editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |

## Roadmap

### v0.1 — Current Release ✅

- Agent card management (add, delete, refresh, import/export)
- Skill browser with search and mode filtering
- Adaptive test input (text, JSON, file)
- Sync + async task execution with auto-polling
- SSE streaming support
- Response viewer with smart media preview
- Test history and saved test cases
- Per-agent auth headers (persisted)
- Workspaces, settings, keyboard shortcuts

### v0.2 — Automated Testing

- [ ] Test suites — group test cases into automated sequences
- [ ] Assertions — define expected outputs and auto-validate
- [ ] CI integration — run test suites from command line
- [ ] Test reports — export results as HTML/JSON

### v0.3 — Local Registry Proxy

- [ ] Local A2A registry — act as a proxy for agent discovery
- [ ] Request/response interception and modification
- [ ] Latency simulation and fault injection
- [ ] Traffic recording and replay

### v0.4 — Community Hub

- [ ] Community agent directory — discover and load popular A2A agents
- [ ] Shared test collections — import/export community test suites
- [ ] Agent health monitoring — periodic card refresh with alerts
- [ ] Favorites — star and organize frequently-used agents

### v0.5 — Advanced Workspace

- [ ] Workspace sharing — export/import full workspace configs
- [ ] Environment variables — per-workspace variable substitution
- [ ] Request chaining — pipe output of one skill into another
- [ ] Diff view — compare responses across runs

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

```bash
# Development
npm run tauri dev        # Start dev server
npx tsc --noEmit         # Type check
npx vitest run           # Run tests
```

## License

[MIT](LICENSE) — Copyright 2026 Orange Dong

---

<div align="center">

# 🔨 A2A-Forge

**A2A 协议 Agent 测试调试桌面工具**

</div>

## 功能特性

A2A-Forge 是一款原生桌面应用，专为开发 [A2A（Agent-to-Agent）](https://google.github.io/A2A/) 协议 Agent 的工程师设计。可以理解为 **A2A 版的 Postman** —— 输入 Agent URL，浏览所有技能，直接运行测试，无需写代码。

- 🔍 **Agent 发现** — 自动获取并解析 `.well-known/agent.json` Agent 卡片
- ⚡ **技能测试** — 自适应输入（文本、JSON、文件上传），一键调用任意技能
- 📡 **实时流式** — 基于 SSE 的流式响应，异步任务自动轮询
- 🔐 **安全认证** — 每个 Agent 独立配置默认 Headers，凭证存储在系统钥匙串
- 🖼️ **智能预览** — 自动检测并内联渲染图片、视频、音频
- 📋 **Curl 导出** — 一键复制等效 curl 命令
- 📜 **历史记录** — 可搜索的执行历史，支持保存测试用例一键重跑
- 🗂️ **工作空间** — 将 Agent 分组管理到不同工作空间
- 🌗 **主题切换** — 跟随系统的深色/浅色模式，支持手动覆盖
- ⌨️ **键盘优先** — `Ctrl+N` 添加 · `Ctrl+Enter` 运行 · `Ctrl+Shift+C` 复制 curl

## 快速开始

### 环境要求

- [Rust](https://rustup.rs/)（stable 工具链）
- [Node.js](https://nodejs.org/) v18+
- 平台依赖：参见 [Tauri 环境准备](https://v2.tauri.app/start/prerequisites/)

### 安装运行

```bash
git clone https://github.com/user/a2a-forge.git
cd a2a-forge
npm install
npm run tauri dev
```

### 生产构建

```bash
npm run tauri build
# 输出：.dmg (macOS) / .msi + .exe (Windows)
```

## 使用方法

### 1. 添加 Agent

点击 **+ Add agent card** 或按 `Ctrl/Cmd+N`，输入 Agent 的 URL，A2A-Forge 会自动获取 Agent 卡片并展示所有技能。

### 2. 配置认证

点击 Agent 名称旁的 ⚙️ 齿轮图标，设置默认 Headers（如 `X-API-Key`）。配置会持久化到本地数据库，对该 Agent 的所有技能测试自动生效。

### 3. 测试技能

选择技能 → 填写输入 → 点击 **Run**（或 `Ctrl/Cmd+Enter`）。响应查看器会智能渲染结果 —— 图片直接显示、视频可播放、JSON 语法高亮。

### 4. 回顾迭代

每次执行自动保存到历史记录。常用请求可保存为命名测试用例，一键重跑。支持复制等效 curl 命令分享给团队。

## 路线图

### v0.1 — 当前版本 ✅

Agent 管理、技能浏览、自适应测试、异步轮询、SSE 流式、智能媒体预览、历史记录、认证配置、工作空间

### v0.2 — 自动化测试

- [ ] 测试套件 — 将测试用例组合为自动化序列
- [ ] 断言验证 — 定义预期输出并自动校验
- [ ] CI 集成 — 命令行运行测试套件
- [ ] 测试报告 — 导出 HTML/JSON 格式报告

### v0.3 — 本地注册代理

- [ ] 本地 A2A 注册中心 — 作为 Agent 发现的代理
- [ ] 请求/响应拦截与修改
- [ ] 延迟模拟与故障注入
- [ ] 流量录制与回放

### v0.4 — 社区中心

- [ ] 社区 Agent 目录 — 发现和加载优质 A2A Agent
- [ ] 共享测试集 — 导入/导出社区测试套件
- [ ] Agent 健康监控 — 定期刷新卡片并告警
- [ ] 收藏夹 — 收藏和整理常用 Agent

### v0.5 — 高级工作空间

- [ ] 工作空间共享 — 导出/导入完整工作空间配置
- [ ] 环境变量 — 按工作空间的变量替换
- [ ] 请求链 — 将一个技能的输出传递给另一个
- [ ] Diff 视图 — 跨运行对比响应结果

## 许可证

[MIT](LICENSE) — Copyright 2026 Orange Dong
