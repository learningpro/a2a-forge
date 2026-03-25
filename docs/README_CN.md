<div align="center">

# 🔨 A2A-Forge

**A2A 协议 Agent 测试调试桌面工具**

[![Build](https://img.shields.io/github/actions/workflow/status/learningpro/a2a-forge/build.yml?style=flat-square)](https://github.com/learningpro/a2a-forge/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?style=flat-square&logo=tauri)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)

中文 | [English](README.md)

---

<img src="docs/screenshots/light-mode.png" alt="A2A-Forge 浅色模式" width="800" />

<sub>三栏布局：Agent 侧边栏 · 技能浏览器 · 测试面板与实时结果</sub>

<img src="docs/screenshots/dark-mode.png" alt="A2A-Forge 深色模式" width="800" />

<sub>深色模式，自动跟随系统主题</sub>

</div>

---

## 什么是 A2A-Forge？

A2A-Forge 是一款原生桌面应用，专为开发 [A2A（Agent-to-Agent）](https://google.github.io/A2A/) 协议 Agent 的工程师设计。可以理解为 **A2A 版的 Postman** —— 输入 Agent URL，浏览所有技能，直接运行测试，无需写代码。

基于 [Tauri 2](https://v2.tauri.app/) 构建，快速、轻量、跨平台。

## 功能特性

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
git clone https://github.com/learningpro/a2a-forge.git
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

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | [Tauri 2.x](https://v2.tauri.app/) (Rust) |
| 前端 | React 18 + TypeScript |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) |
| 状态管理 | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| 数据库 | SQLite (via tauri-plugin-sql) |
| 类型桥接 | [tauri-specta](https://github.com/oscartbeaumont/tauri-specta) |
| 编辑器 | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |

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

## 贡献

欢迎贡献！请提交 Issue 或 Pull Request。

```bash
npm run tauri dev        # 启动开发服务器
npx tsc --noEmit         # 类型检查
npx vitest run           # 运行测试
```

## 许可证

[MIT](LICENSE) — Copyright 2026 Orange Dong
