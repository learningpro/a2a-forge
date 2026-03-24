# Roadmap: A2A Workbench

## Overview

Build a Tauri 2.x desktop app that lets engineers add any A2A agent by URL, browse its skills, and run live test interactions — no code required. The build order follows the feature dependency chain: foundation first (nothing works without it), then agent discovery (skills require cards), then full task execution (testing requires skills). Three phases, each delivering a coherent and independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Tauri 2 scaffold with SQLite, permissions ACL, typed Rust/React bridge, and three-panel shell UI (completed 2026-03-24)
- [x] **Phase 2: Agent and Skill Discovery** - Add agents by URL, browse and filter skills, manage cards across sessions (completed 2026-03-24)
- [x] **Phase 3: Task Execution and Testing** - Full test workflow — adaptive input, sync and streaming send, response viewer, history, saved tests, curl export, settings (completed 2026-03-24)

## Phase Details

### Phase 1: Foundation
**Goal**: The application shell is running with all infrastructure correct — users see the three-panel layout, can switch themes, and the app is ready to receive agent cards
**Depends on**: Nothing (first phase)
**Requirements**: UIUX-01, UIUX-02, UIUX-05, SECR-01, SECR-02
**Success Criteria** (what must be TRUE):
  1. The app launches in under 2 seconds on macOS, Windows, and Linux and shows the three-panel layout (agents sidebar, skill list, test panel)
  2. Dark and light themes work, with system mode auto-detected and a manual override in settings
  3. All HTTP requests are routed through the Rust backend — the webview makes no outbound network calls
  4. Credentials are stored in the OS keychain, not in SQLite plaintext
  5. SQLite is initialized with WAL mode and the full schema; the app can read and write records without errors
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Scaffold Tauri project, Rust backend modules (error, state, db, commands), capabilities ACL, tauri.conf.json
- [x] 01-02-PLAN.md — Frontend theme system, Zustand stores, three-panel layout components, visual verification

### Phase 2: Agent and Skill Discovery
**Goal**: Users can register any A2A agent by URL, browse all its skills with search and filtering, and manage their card library across sessions
**Depends on**: Phase 1
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07, SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05
**Success Criteria** (what must be TRUE):
  1. User enters a base URL, the app fetches `/.well-known/agent.json`, shows a loading state, and displays the card or a descriptive error on failure
  2. User can give a card a local nickname, delete it with confirmation (removing associated history), and manually refresh it to re-fetch the latest version
  3. Cards survive app restart — all registered agents reappear on relaunch
  4. User can import and export cards as a JSON bundle
  5. All skills in a selected card are listed with name, description, input modes, and output modes; skills are searchable by name/description and filterable by mode; clicking a skill opens the test panel
**Plans:** 4/4 plans complete

Plans:
- [x] 02-01-PLAN.md — Rust A2A types, 7 agent CRUD commands, lib.rs wiring, dialog plugin
- [x] 02-02-PLAN.md — agentStore CRUD, AddAgentDialog with debounced preview, Sidebar agent list
- [x] 02-03-PLAN.md — SkillPanel with search, filter chips, mode tags, skill selection
- [x] 02-04-PLAN.md — Card management UI (rename/refresh/delete hover menu, import/export)

### Phase 3: Task Execution and Testing
**Goal**: Users can compose and send test messages to any skill, see real-time results including streaming responses, and access full history of past executions
**Depends on**: Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, TEST-10, TEST-11, TEST-12, HIST-01, HIST-02, HIST-03, WORK-01, SETT-01, SETT-02, UIUX-03, UIUX-04
**Success Criteria** (what must be TRUE):
  1. User can compose a test message using an adaptive input form (text editor, file drag-and-drop, or Monaco JSON editor based on the skill's declared input modes), select an auth scheme, override request headers, and send via tasks/send — seeing the task lifecycle (submitted → working → completed/failed) with latency in ms
  2. When an agent advertises streaming, the app sends via tasks/sendSubscribe (SSE) and shows response chunks incrementally in real time
  3. The response viewer renders message parts natively: markdown text is formatted, files are downloadable, and data is shown as a collapsible JSON tree; raw JSON is always available
  4. Every execution is saved to SQLite with timestamp, agent, skill, request/response payload, latency, and status; history is browsable, searchable, and clearable per agent or globally
  5. User can save any request/response as a named test case and re-run it with one click; user can copy the equivalent curl command for any request
  6. App supports multiple named workspaces, global settings (timeout, proxy, theme, telemetry), and per-card settings (default auth headers, base URL override); keyboard shortcuts work for add card, run test, and copy curl; empty states guide new users with example public A2A agents
**Plans:** 5/5 plans complete

Plans:
- [ ] 03-01-PLAN.md — Rust backend: all command modules (tasks, history, saved_tests, workspaces, settings), A2A client, Cargo deps
- [ ] 03-02-PLAN.md — Frontend infrastructure: testStore, workspaceStore, a2a/curl utilities, hooks, bindings, unit tests
- [ ] 03-03-PLAN.md — Test panel input: SkillMetadata, InputForm with Monaco, auth selection, Run button with send/stream
- [ ] 03-04-PLAN.md — Response viewer: JsonTree with mockup colors, ResponseViewer, HistoryList, SavedTestsList
- [ ] 03-05-PLAN.md — Settings modal, workspace selector, keyboard shortcuts, empty states, visual checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete    | 2026-03-24 |
| 2. Agent and Skill Discovery | 4/4 | Complete    | 2026-03-24 |
| 3. Task Execution and Testing | 5/5 | Complete    | 2026-03-24 |
