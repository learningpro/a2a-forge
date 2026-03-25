---
title: 我做了一个 A2A 协议的 Postman —— A2A-Forge 开源了
tags: A2A, Agent, Tauri, React, 开源
category: 前端
---

# 我做了一个 A2A 协议的 Postman —— A2A-Forge 开源了

> Google 的 A2A（Agent-to-Agent）协议正在成为 AI Agent 互联的标准。但开发者测试 Agent 的体验还停留在写 curl 的阶段。所以我做了 A2A-Forge —— 一个专为 A2A 协议设计的桌面测试工具。

## 先看效果

![A2A-Forge 浅色模式](https://github.com/learningpro/a2a-forge/raw/main/docs/screenshots/light-mode.png)

![A2A-Forge 深色模式](https://github.com/learningpro/a2a-forge/raw/main/docs/screenshots/dark-mode.png)

## 为什么做这个？

如果你在做 AI Agent 开发，大概率已经听说过 Google 的 [A2A 协议](https://google.github.io/A2A/)。它定义了一套标准的 Agent 间通信方式：

- Agent 通过 `/.well-known/agent.json` 暴露自己的能力（Agent Card）
- 调用方通过 JSON-RPC 发送 `tasks/send` 请求来调用技能
- 支持异步任务、SSE 流式响应

听起来很美好，但实际开发中你会发现：

1. **每次测试都要写 curl** —— 构造 JSON-RPC payload、带上 auth header、轮询异步结果……
2. **没有可视化工具** —— 返回的 base64 图片只能手动解码查看
3. **调试效率低** —— 改一个参数就要重新拼一遍 curl

REST API 有 Postman，GraphQL 有 Playground，gRPC 有 BloomRPC。但 A2A 协议？什么都没有。

所以我做了 **A2A-Forge**。

## 它能做什么？

### 🔍 一键发现 Agent 能力

输入 Agent 的 URL，自动获取 Agent Card，展示所有技能、输入输出模式、认证方式：

```
https://your-agent.example.com
→ 自动 fetch /.well-known/agent.json
→ 解析出 10 个 skills
→ 展示 inputModes、outputModes、examples
```

### ⚡ 自适应测试面板

根据技能声明的 `inputModes` 自动切换输入方式：

- **text** → 多行文本编辑器
- **application/json** → Monaco JSON 编辑器（语法高亮 + 校验）
- **file** → 拖拽上传

不用手动构造 JSON-RPC payload，填好参数点 Run 就行。

### 📡 异步任务自动轮询

A2A 的很多任务是异步的（比如图片生成、视频生成）。A2A-Forge 会：

1. 发送 `tasks/send` 请求
2. 检测到 `pending`/`running` 状态
3. 自动每秒轮询 `tasks/get`
4. 直到任务完成或失败

你只需要点一下 Run，然后等结果。

### 🖼️ 智能媒体预览

返回结果里有图片 URL？直接渲染。有视频？内嵌播放器。有音频？播放控件。

A2A-Forge 会深度扫描整个 JSON 响应树，自动检测：
- CDN URL（`.jpg`、`.mp4`、`.mp3` 等）
- Base64 data URL（`data:image/jpeg;base64,...`）

不用再手动复制 URL 到浏览器查看了。

### 🔐 认证一次，处处生效

每个 Agent 可以独立配置默认 Headers（比如 `X-API-Key`）。配置一次，持久化到本地 SQLite，之后该 Agent 的所有技能测试自动带上认证。

### ⌨️ 键盘优先

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd+N` | 添加 Agent |
| `Ctrl/Cmd+Enter` | 运行测试 |
| `Ctrl/Cmd+Shift+C` | 复制 curl 命令 |

### 📋 更多功能

- **Curl 导出** —— 一键复制等效 curl 命令，方便分享
- **历史记录** —— 所有执行自动保存，可搜索、可清除
- **保存测试用例** —— 常用请求保存为命名用例，一键重跑
- **工作空间** —— 将 Agent 分组管理
- **深色模式** —— 跟随系统，也可手动切换
- **并发执行** —— 同一个 Agent 的多个技能可以同时跑

## 技术栈

作为一个技术博客，当然要聊聊怎么做的：

| 层级 | 选型 | 为什么 |
|------|------|--------|
| 桌面框架 | **Tauri 2.x** | 比 Electron 小 10 倍，Rust 后端处理 HTTP/SSE |
| 前端 | **React 18 + TypeScript** | 生态成熟，类型安全 |
| 样式 | **Tailwind CSS 4** | Vite 插件，零配置 |
| 状态管理 | **Zustand 5** | 轻量，selector 模式避免不必要的 re-render |
| 数据库 | **SQLite** | 通过 tauri-plugin-sql，本地持久化 |
| 类型桥接 | **tauri-specta** | Rust 类型自动生成 TypeScript 定义 |
| JSON 编辑 | **Monaco Editor** | 懒加载，不影响启动速度 |

### 架构亮点

**所有 HTTP 请求走 Rust 后端**

Tauri 的 webview 不直接发网络请求（避免 CORS 问题）。所有 A2A 调用通过 Rust 的 `reqwest` 发出：

```
用户点 Run
  → React 调用 commands.sendTask()（TypeScript）
  → Tauri IPC → Rust send_task 命令
  → reqwest POST 到 agent_url/a2a
  → 如果异步：自动轮询 tasks/get
  → 返回结果给前端
  → ResponseViewer 智能渲染
```

**Per-skill 并发执行**

testStore 用 `agentId:skillId` 作为 key 存储每个技能的执行状态，互不干扰：

```typescript
// 每个技能独立的执行状态
executions: Record<string, SkillExecution>
// key: "agent-123:image_generate" → {status: "running", ...}
// key: "agent-123:video_generate" → {status: "completed", ...}
```

**Zustand 的坑**

开发过程中踩了一个大坑：Zustand selector 返回不稳定引用会导致无限 re-render。

```typescript
// ❌ 错误：每次都创建新对象
useStore((s) => s.headers ?? {})

// ❌ 错误：函数调用每次返回新引用
useStore((s) => s.getAgent())

// ✅ 正确：选择原始值 + useMemo 派生
const headers = useStore((s) => s.headers);
const merged = useMemo(() => headers ?? {}, [headers]);
```

这个问题导致了白屏，花了不少时间排查。记录在 CLAUDE.md 里了，希望能帮到其他 Zustand 用户。

## 快速体验

```bash
# 克隆
git clone https://github.com/learningpro/a2a-forge.git
cd a2a-forge

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 或者构建生产版本
npm run tauri build
```

前提：需要安装 [Rust](https://rustup.rs/) 和 [Node.js](https://nodejs.org/) v18+。

## 路线图

当前是 v0.1，后续计划：

- **v0.2 自动化测试** —— 测试套件、断言验证、CI 集成
- **v0.3 本地注册代理** —— 请求拦截、延迟模拟、流量录制
- **v0.4 社区中心** —— 社区 Agent 目录、共享测试集、收藏夹
- **v0.5 高级工作空间** —— 环境变量、请求链、Diff 视图

## 最后

A2A 协议还很新，生态在快速发展。如果你也在做 Agent 开发，欢迎试用 A2A-Forge，也欢迎提 Issue 和 PR。

⭐ **GitHub:** [github.com/learningpro/a2a-forge](https://github.com/learningpro/a2a-forge)

如果觉得有用，给个 Star 支持一下 🙏

---

*我是 Orange，一个在 AI Agent 领域折腾的开发者。如果你对 A2A 协议、Agent 开发、Tauri 桌面应用感兴趣，欢迎交流。*
