# Stack Research

**Domain:** Tauri 2.x desktop app — A2A Protocol workbench (React/TypeScript frontend, Rust backend)
**Researched:** 2026-03-24
**Confidence:** HIGH (most versions verified against official docs and crates.io)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.10.3 | Desktop shell, Rust backend, IPC bridge | Latest stable (2026-03-04). Smaller binary than Electron, native OS sandbox, Rust gives us real HTTP/SSE handling without CORS issues, built-in capability system for security |
| React | 18.3.x | UI component framework | Required by TanStack Query v5 (uses `useSyncExternalStore`). 18 concurrent features useful for streaming task updates |
| TypeScript | 5.x | Type safety across frontend | Non-negotiable for IPC payloads — strong types catch Rust/JS boundary mismatches at compile time |
| Vite | 6.x | Frontend bundler and dev server | Official Tauri recommended bundler; `@tailwindcss/vite` plugin requires Vite 5+; fastest HMR for development |
| Rust | stable (1.77.2+ required) | Backend logic, HTTP, SSE, security | Tauri plugin minimum requirement is rustc 1.77.2; reqwest async HTTP/SSE runs natively without webview network stack |

### Tauri Official Plugins

| Plugin | Rust Crate Version | JS Package | Purpose | Why This Plugin |
|--------|-------------------|------------|---------|-----------------|
| tauri-plugin-sql | 2.3.2 | @tauri-apps/plugin-sql | SQLite persistence for agent cards, test history, saved test cases | Official plugin, sqlx 0.8 underneath, supports migrations, JS API executes queries directly from frontend |
| tauri-plugin-http | 2.5.7 | @tauri-apps/plugin-http | HTTP client in Rust for A2A JSON-RPC calls | Avoids CORS and mixed-content issues; all network traffic stays in Rust, no webview fetch needed |
| tauri-plugin-window-state | 2.4.1 | @tauri-apps/plugin-window-state | Persist/restore window size and position across restarts | Official plugin, zero-config: register once in Rust and all windows remember their state |
| tauri-plugin-store | 2.4.2 | @tauri-apps/plugin-store | Key-value persistence for global settings (theme, timeout, proxy) | Use for flat preferences only; SQLite handles structured user data |

### Credential Storage

| Plugin | Version | Purpose | Why |
|--------|---------|---------|-----|
| tauri-plugin-keyring | 0.1.0 (unstable) | OS keychain for API keys and auth headers | Community plugin by HuakunShen; thin wrapper over Rust `keyring` crate; uses macOS Keychain, Windows Credential Manager, Linux Secret Service. Only cross-platform OS keychain option. Tauri 2 compatible (requires tauri 2.1.0+). |

**Credential storage caveat:** `tauri-plugin-keyring` is at v0.1.0 (December 2024) and marked unstable. The official Tauri Stronghold plugin is deprecated (will be removed in v3). If keyring proves unreliable, the fallback is encrypting credentials in SQLite using a key derived from a machine-specific identifier. Plan for this contingency in Phase 1.

### State Management

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Zustand | 5.0.12 | Client-side UI state (selected agent, active skill, panel sizes, theme) | v5 drops React < 18 and removes use-sync-external-store dependency. 1KB, minimal boilerplate, no Provider wrapping. Correct pick for this scale — Redux is overkill, Context causes unnecessary re-renders across three panels |
| @tanstack/react-query | 5.95.x | Server-state (agent cards via Tauri commands, task polling) | v5 stable, requires React 18. `useQuery` + `useMutation` model maps cleanly to Tauri `invoke()` calls. Manages loading/error/stale states for agent fetches and task lifecycle polling. Combine with Zustand: react-query for async data, Zustand for UI state |

### UI Layer

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Tailwind CSS | 4.2.x | Utility CSS | v4 ships a first-party Vite plugin (`@tailwindcss/vite`), eliminating PostCSS config. CSS-based config via `@import "tailwindcss"`. 5x faster full builds, 100x faster incremental. No `tailwind.config.js` needed — configure in CSS. Install: `npm install tailwindcss @tailwindcss/vite` |
| @monaco-editor/react | 4.6.x (stable) / 4.7.0-rc.0 (React 19) | JSON/text input editing with syntax highlighting | No webpack config needed, works with Vite, ~380K weekly npm downloads vs 114K for react-monaco-editor. Underlying `monaco-editor` is at 0.55.1. Use `loader.config({ monaco })` pattern to bundle locally instead of CDN for desktop app reliability |
| react-markdown | 10.x | Render markdown in agent responses | Current major version. Use with `remark-gfm` for GitHub Flavored Markdown (tables, strikethrough, task lists) and `rehype-highlight` for code syntax |
| remark-gfm | 4.x | GFM extensions for react-markdown | Required for A2A response rendering (tables, code blocks) |
| rehype-highlight | — | Code syntax highlighting in markdown | Works with react-markdown via rehypePlugins prop |

### SSE / Streaming

| Approach | Crate | Purpose | Why |
|----------|-------|---------|-----|
| reqwest-eventsource | latest | Consume SSE stream from A2A agents in Rust | Natural pairing with reqwest (already used by tauri-plugin-http). Wraps reqwest response bytes into EventSource-compatible stream with retry |
| Tauri Channels | built-in | Stream SSE chunks from Rust to React frontend | Preferred over `app.emit()` for high-throughput ordered data (SSE chunks). Channels are optimized for streaming; the event system is for infrequent messages. Pattern: frontend creates Channel, passes to Rust command, Rust writes SSE chunks to Channel |

**SSE Architecture:** A2A `tasks/sendSubscribe` opens an SSE connection. The Rust backend opens the SSE stream using reqwest-eventsource, reads chunks, and forwards them to the React frontend via a Tauri Channel. The React component subscribes to the channel and pipes updates to react-query or Zustand state for the task lifecycle display.

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| @tauri-apps/cli | 2.x | Build, dev, bundle commands | `npm run tauri dev` and `npm run tauri build` |
| @vitejs/plugin-react | 4.x | React fast refresh in Vite | Use the SWC variant (`@vitejs/plugin-react-swc`) for faster builds in dev |
| TypeScript | 5.x | Type checker | Strict mode; define Zod or manual types for all Tauri IPC payloads |

## Installation

```bash
# Scaffold with create-tauri-app (selects React + TypeScript + Vite)
npm create tauri-app@latest

# Frontend: core
npm install react react-dom
npm install @tanstack/react-query zustand
npm install react-markdown remark-gfm rehype-highlight

# Frontend: UI
npm install tailwindcss @tailwindcss/vite

# Frontend: Monaco editor (bundle locally, not CDN)
npm install @monaco-editor/react monaco-editor

# Frontend: Tauri plugin JS bindings
npm install @tauri-apps/plugin-sql
npm install @tauri-apps/plugin-http
npm install @tauri-apps/plugin-window-state
npm install @tauri-apps/plugin-store

# Dev dependencies
npm install -D @vitejs/plugin-react-swc typescript @tauri-apps/cli

# Rust: Cargo.toml additions
# tauri-plugin-sql = { version = "2", features = ["sqlite"] }
# tauri-plugin-http = "2"
# tauri-plugin-window-state = "2"
# tauri-plugin-store = "2"
# tauri-plugin-keyring = "0.1"   # community plugin
# reqwest = { version = "0.12", features = ["stream"] }
# reqwest-eventsource = "0.6"
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tokio = { version = "1", features = ["full"] }
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|------------------------|
| Tauri 2 | Electron | Only if you need Node.js-specific native modules, or your team has zero Rust experience and can't hire it — binary size 10x+ larger |
| Vite | webpack | Never for new Tauri projects in 2026; webpack config complexity is unnecessary overhead |
| Tailwind CSS 4 | Tailwind CSS 3 | Only if you must support Safari < 16.4, Chrome < 111, or Firefox < 128. v3 remains stable but v4 is clearly the current standard |
| Zustand 5 | Jotai | Jotai is better for fine-grained atomic state (like spreadsheet cells). For this app with 3-5 top-level domain stores (agents, skills, tasks, settings, UI), Zustand's store-per-domain pattern is simpler |
| Zustand 5 | Redux Toolkit | RTK is better when you need time-travel debugging, complex middleware chains, or team familiarity with Redux. Not warranted at this scale |
| @monaco-editor/react | CodeMirror 6 | CodeMirror 6 is more mobile-friendly and lighter. Use it if Monaco's ~4MB bundle becomes a concern — unlikely in a desktop app |
| tauri-plugin-keyring | Stronghold | Stronghold is officially deprecated; do not use for new Tauri 2 projects |
| reqwest-eventsource | tauri-plugin-sse | tauri-plugin-sse is a community plugin that mirrors the browser EventSource API from JS. Use it if you want the streaming to be triggered from JS rather than Rust. For A2A the Rust-side approach gives more control over auth headers and error recovery |
| Tauri Channel | app.emit() events | Use emit() only for infrequent notifications (task state changes). Use Channels for SSE chunk streams. Channels are ordered and optimized for throughput; emit() is JSON-serialized and lossy under load |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| tauri-plugin-stronghold | Officially deprecated, will be removed in Tauri v3 | tauri-plugin-keyring |
| webview fetch() / XMLHttpRequest for A2A calls | Hits CORS restrictions against arbitrary agent URLs; mixed content issues on http:// agents; no SSE streaming control | tauri-plugin-http (Rust-side reqwest) |
| react-monaco-editor | Requires webpack configuration changes; 3x fewer downloads than @monaco-editor/react; the webpack dependency is incompatible with the Vite stack | @monaco-editor/react |
| Monaco loaded from CDN | Desktop app may run offline; CDN requests fail without network; loading time introduces flash of unstyled editor | Bundle monaco via npm: `loader.config({ monaco })` |
| Electron | 60-120MB binary vs ~5MB Tauri; no Rust backend means SSE must go through webview with CORS constraints | Tauri 2 |
| Redux / Redux Toolkit | Massive boilerplate for a single-user desktop app; action/reducer ceremony for what is essentially 4-5 stores | Zustand |
| tailwind.config.js (v3 pattern) | Tailwind v4 uses CSS-based config; creating a v3-style config in a v4 project causes confusion and unused config options | @import "tailwindcss" in CSS + CSS custom properties |

## Stack Patterns

**For Tauri command that streams SSE to frontend:**
```rust
// Rust: use Tauri Channel for ordered, high-throughput data
#[tauri::command]
async fn send_subscribe(channel: tauri::ipc::Channel<SseEvent>, url: String, ...) {
    // reqwest-eventsource reads SSE
    // channel.send(event) forwards each chunk
}
```

**For infrequent task state updates:**
```rust
// Use app.emit() for state transitions (submitted → working → completed)
app.emit("task-state", TaskStatePayload { id, state })?;
```

**For settings persistence (flat key-value):**
- Use `tauri-plugin-store` for: timeout, proxy URL, theme, telemetry flag

**For structured data persistence (queryable, relational):**
- Use `tauri-plugin-sql` + SQLite for: agent cards, test history, saved test cases, workspace definitions

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| tauri 2.10.3 | tauri-plugin-sql 2.3.2, tauri-plugin-http 2.5.7 | All official plugins track tauri ^2 |
| @tanstack/react-query 5.x | React 18+ | Hard requirement: v5 uses useSyncExternalStore from React 18 |
| zustand 5.x | React 18+ | Dropped React < 18 in v5; uses native useSyncExternalStore |
| tailwindcss 4.x | Vite 5+ | @tailwindcss/vite plugin requires Vite 5+. Tauri 2 scaffolding uses Vite 6 by default |
| @monaco-editor/react 4.6.x | React 16.8–19.x | React 19 support is in 4.7.0-rc.0 (install with @next) |
| tauri-plugin-keyring 0.1.0 | tauri 2.1.0+ | Community plugin, unstable, requires Tauri ≥ 2.1.0 |
| Rust | 1.77.2+ | Hard minimum for all Tauri 2 official plugins |

## Sources

- [docs.rs/crate/tauri/latest](https://docs.rs/crate/tauri/latest) — Tauri 2.10.3 confirmed (HIGH confidence)
- [docs.rs/crate/tauri-plugin-sql/latest](https://docs.rs/crate/tauri-plugin-sql/latest) — 2.3.2 confirmed (HIGH confidence)
- [docs.rs/crate/tauri-plugin-http/latest](https://docs.rs/crate/tauri-plugin-http/latest) — 2.5.7 confirmed (HIGH confidence)
- [v2.tauri.app/plugin/](https://v2.tauri.app/plugin/) — Official plugin list, window-state confirmed (HIGH confidence)
- [v2.tauri.app/plugin/window-state/](https://v2.tauri.app/plugin/window-state/) — 2.4.1 confirmed (HIGH confidence)
- [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) — v4 stable, @tailwindcss/vite 4.2.2 (HIGH confidence)
- [github.com/pmndrs/zustand/releases](https://github.com/pmndrs/zustand/releases) — Zustand 5.0.12 confirmed (HIGH confidence)
- [tanstack.com/query/latest](https://tanstack.com/query/latest) — TanStack Query 5.95.x (HIGH confidence)
- [npmjs.com/package/@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react) — @monaco-editor/react 4.6.x stable, 4.7.0-rc.0 for React 19 (MEDIUM confidence — npm page returned 403, confirmed via web search)
- [lib.rs/crates/tauri-plugin-keyring](https://lib.rs/crates/tauri-plugin-keyring) — 0.1.0 unstable, Tauri 2.1.0+ requirement confirmed (HIGH confidence)
- [v2.tauri.app/develop/calling-frontend/](https://v2.tauri.app/develop/calling-frontend/) — Channels vs emit() pattern confirmed (HIGH confidence)
- [aptabase.com/blog/persistent-state-tauri-apps](https://aptabase.com/blog/persistent-state-tauri-apps) — Store vs SQLite decision rationale (MEDIUM confidence)

---
*Stack research for: Tauri 2.x desktop app with React/TypeScript — A2A Protocol Workbench*
*Researched: 2026-03-24*
