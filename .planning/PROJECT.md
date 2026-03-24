# A2A Workbench

## What This Is

A cross-platform desktop application for AI/LLM engineers to discover, inspect, and interactively test agents that expose Google's Agent-to-Agent (A2A) protocol. Users register agents by entering their well-known card URL, browse all advertised skills, and run live test interactions — all without writing any code. Built with Tauri 2.x (Rust backend + React/TypeScript frontend).

## Core Value

Users can add any A2A agent by URL, see all its skills, and test them interactively with real-time results — the fastest path from "I have an agent" to "I know it works."

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Agent card management (add by URL, delete, refresh, nickname, import/export)
- [ ] Skill browser with search, filtering by input/output modes
- [ ] Skill test panel with adaptive input (text/file/JSON), auth selection, header overrides
- [ ] Task lifecycle display (submitted → working → completed/failed/canceled)
- [ ] Streaming support via SSE (tasks/sendSubscribe)
- [ ] Response viewer (rendered markdown, file downloads, JSON tree, raw JSON)
- [ ] Test history persistence in SQLite with search and clear
- [ ] Saved test cases with one-click re-run
- [ ] Curl command export for any request
- [ ] Multiple named workspaces
- [ ] Global settings (timeout, proxy, theme, telemetry)
- [ ] Per-card settings (default auth headers, base URL override)
- [ ] Keyboard shortcuts for common actions
- [ ] Three-panel resizable layout (agents | skills | test)
- [ ] Dark/light theme with system mode detection

### Out of Scope

- Agent builder / code editor — not a development tool
- Hosted/cloud service — fully local, no telemetry by default
- General HTTP client — not a Postman replacement
- A2A push notifications — scope for v2
- Local mock agent mode — scope for v2
- Team sync via Git — evaluate post-MVP

## Context

- **A2A Protocol**: Google's Agent-to-Agent protocol. Agents serve cards at `/.well-known/agent.json` describing identity, capabilities, auth schemes, and skills. Tasks are created via `tasks/send` JSON-RPC and have lifecycle states.
- **Test Service**: AIGC Service at `https://aigc-service.echonlab.com` — 10 skills (image/video generation, music creation, media search). Auth via X-API-Key header. Async tasks with polling via tasks/get.
- **Target Users**: AI/LLM engineers (primary), QA engineers (secondary), product managers (tertiary)
- **UI Mockup**: Detailed HTML mockup provided with exact design language — warm neutrals, JetBrains Mono for code, Inter for UI text, subtle borders, mode tags (text/file/data)

## Constraints

- **Tech Stack**: Tauri 2.x, React 18, TypeScript, Vite, Tailwind CSS, Zustand, tauri-plugin-sql (SQLite), Monaco Editor, @tanstack/react-query
- **Platform**: macOS 13+, Windows 11, Ubuntu 22+
- **Performance**: App launch < 2s, round-trip test < 2s for text skills
- **Security**: HTTP requests from Rust backend only (no webview network), credentials in OS keychain via tauri-plugin-keychain

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri 2.x over Electron | Smaller binary, native OS sandbox, Rust backend for HTTP/SSE | — Pending |
| SQLite via tauri-plugin-sql | Simple local persistence, no external DB needed | — Pending |
| Zustand over Redux | Lightweight, minimal boilerplate for this scale | — Pending |
| Monaco Editor for JSON | Rich JSON editing with syntax highlighting, validation | — Pending |
| Rust-side HTTP | Avoids CORS/mixed-content, enables SSE handling | — Pending |

---
*Last updated: 2026-03-24 after initialization*
