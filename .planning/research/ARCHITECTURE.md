# Architecture Research

**Domain:** Tauri 2.x desktop app — React frontend + Rust backend + SQLite + A2A protocol client
**Researched:** 2026-03-24
**Confidence:** HIGH (Tauri 2 official docs + verified patterns from production templates)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend (WebView)                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  AgentPanel  │  │  SkillPanel  │  │   TestPanel  │               │
│  │  (list/card) │  │ (browser/    │  │ (input/      │               │
│  │              │  │  filter)     │  │  response)   │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                  │                       │
│  ┌──────┴────────────────┴──────────────────┴───────────────────┐   │
│  │           Zustand Stores (agentStore / testStore /           │   │
│  │                    workspaceStore / uiStore)                  │   │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                        │
│  ┌──────────────────────────┴────────────────────────────────────┐   │
│  │   Tauri Bridge Layer (tauri-specta generated bindings.ts)     │   │
│  │   commands.*  /  events.listen()  /  Channel                  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                  IPC (invoke / emit / Channel)
┌────────────────────────────────┴────────────────────────────────────┐
│                          Rust Core (src-tauri)                       │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  commands/   │  │  commands/   │  │  commands/   │               │
│  │  agents.rs   │  │  tasks.rs    │  │  settings.rs │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                  │                       │
│  ┌──────┴────────────────┴──────────────────┴───────────────────┐   │
│  │                      AppState (Mutex-wrapped)                  │   │
│  │   db: SqlitePool   http_client: reqwest::Client               │   │
│  │   active_tasks: HashMap<TaskId, AbortHandle>                   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────┐       ┌──────────────────────────────────┐  │
│  │   tauri-plugin-sql  │       │     a2a_client / reqwest         │  │
│  │   SQLite (sqlx)     │       │   (HTTP POST JSON-RPC + SSE)     │  │
│  └─────────────────────┘       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                              External A2A Agents
                         (HTTP /.well-known/agent.json,
                          tasks/send, tasks/sendSubscribe SSE)
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| AgentPanel | List registered agents, add/delete/refresh, nickname editing | agentStore, invoke agent commands |
| SkillPanel | Browse skills for selected agent, filter by mode | agentStore (derived), uiStore |
| TestPanel | Adaptive input form, auth selection, result display, history | testStore, invoke task commands |
| agentStore (Zustand) | Agent card list, selected agent, per-card settings | Rust commands via invoke |
| testStore (Zustand) | Active task state, streaming chunks, history cache | Rust commands + Tauri events |
| workspaceStore (Zustand) | Named workspace registry, active workspace | Rust commands |
| uiStore (Zustand) | Layout state (panel widths), theme, keyboard shortcut state | Local only, persisted via localStorage |
| Tauri Bridge (bindings.ts) | Type-safe wrappers around invoke/events (tauri-specta generated) | Frontend ↔ Rust boundary |
| commands/agents.rs | fetch_agent_card, upsert_agent, delete_agent, list_agents | DB (plugin-sql), reqwest HTTP |
| commands/tasks.rs | send_task, send_subscribe (streaming), cancel_task, get_history | reqwest + SSE, DB, AppHandle emit |
| commands/settings.rs | get_settings, save_settings, get_workspace, save_workspace | DB |
| AppState | Shared Rust runtime state: DB pool, HTTP client, active task handles | All commands via tauri::State |
| tauri-plugin-sql | SQLite persistence for all domain data | commands/* |
| reqwest / a2a_client | Outbound A2A HTTP: JSON-RPC POST + SSE stream consumption | External agents |

---

## Recommended Project Structure

```
a2a-workbench/
├── src/                            # React frontend
│   ├── main.tsx                    # App entry — ReactDOM.createRoot
│   ├── App.tsx                     # Root layout (three-panel shell + router)
│   ├── bindings.ts                 # AUTO-GENERATED by tauri-specta (do not edit)
│   │
│   ├── components/
│   │   ├── agent/
│   │   │   ├── AgentList.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   └── AddAgentDialog.tsx
│   │   ├── skill/
│   │   │   ├── SkillBrowser.tsx
│   │   │   └── SkillCard.tsx
│   │   ├── test/
│   │   │   ├── TestPanel.tsx
│   │   │   ├── InputForm.tsx       # Adaptive: text/file/JSON inputs
│   │   │   ├── ResponseViewer.tsx  # Markdown, JSON tree, raw
│   │   │   ├── TaskStatus.tsx      # Status badge + lifecycle display
│   │   │   └── HistoryList.tsx
│   │   └── ui/                     # Shared primitives (shadcn/ui wrappers)
│   │       ├── Button.tsx
│   │       ├── ResizablePanels.tsx
│   │       └── JsonTree.tsx
│   │
│   ├── stores/
│   │   ├── agentStore.ts           # Agent cards, selected agent, per-card settings
│   │   ├── testStore.ts            # Active task, streaming state, result
│   │   ├── workspaceStore.ts       # Workspace registry + active workspace
│   │   └── uiStore.ts              # Panel widths, theme (localStorage persist)
│   │
│   ├── hooks/
│   │   ├── useStreamingTask.ts     # Subscribe to Tauri task events, pipe to testStore
│   │   ├── useAgentCard.ts         # Fetch + cache agent card via TanStack Query
│   │   └── useKeyboardShortcuts.ts # Global keyboard handler
│   │
│   ├── lib/
│   │   ├── a2a.ts                  # A2A type definitions (AgentCard, Skill, Task)
│   │   ├── curl.ts                 # Generate curl command from request params
│   │   └── format.ts               # Markdown render, JSON format, file size
│   │
│   └── types/
│       └── index.ts                # Shared TypeScript types
│
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json            # Permission grants for commands + plugins
│   ├── icons/
│   └── src/
│       ├── main.rs                 # Desktop entry — calls lib::run()
│       ├── lib.rs                  # Builder setup: plugins, state, commands, specta
│       │
│       ├── commands/
│       │   ├── mod.rs              # Re-exports all command modules
│       │   ├── agents.rs           # fetch_agent_card, list_agents, upsert_agent, delete_agent
│       │   ├── tasks.rs            # send_task, stream_task, cancel_task, get_task
│       │   ├── history.rs          # list_history, get_history_entry, clear_history
│       │   ├── workspaces.rs       # list_workspaces, create_workspace, set_active_workspace
│       │   └── settings.rs         # get_settings, save_settings
│       │
│       ├── state.rs                # AppState struct definition + constructor
│       ├── db.rs                   # Migration definitions, DB init helpers
│       ├── a2a/
│       │   ├── mod.rs
│       │   ├── client.rs           # A2A HTTP client (reqwest) — JSON-RPC send + SSE
│       │   ├── types.rs            # AgentCard, Skill, Task, Message Rust structs (serde)
│       │   └── sse.rs              # SSE stream consumer — yields events to AppHandle
│       └── error.rs                # AppError enum (thiserror + serde::Serialize)
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Structure Rationale

- **`src/bindings.ts` (auto-generated):** tauri-specta writes this file during debug builds. Never edit by hand. Provides fully-typed `commands.*` and `events.*` wrappers with IDE autocomplete.
- **`src/stores/`:** One Zustand store per domain concept. Keeps state boundaries explicit and avoids cross-domain coupling. uiStore is the only one that does NOT call Rust — it persists to localStorage directly.
- **`src/hooks/`:** Side-effect logic (Tauri event listeners, keyboard handlers) lives here, not in components. Components stay declarative.
- **`src-tauri/src/commands/`:** Feature-grouped command files. All exported via `commands/mod.rs` into a single `generate_handler![]` call in `lib.rs`. Never split across multiple `invoke_handler` calls.
- **`src-tauri/src/a2a/`:** A2A protocol logic isolated from Tauri machinery. `client.rs` is a plain Rust async module — easier to test in isolation and reuse from multiple commands.
- **`src-tauri/src/error.rs`:** Single error type implementing `thiserror::Error + serde::Serialize`. All commands return `Result<T, AppError>`, so frontend always receives typed error information.

---

## Architectural Patterns

### Pattern 1: Type-Safe Command Bridge (tauri-specta)

**What:** Generate TypeScript bindings from Rust command signatures at build time. Frontend imports generated `commands` and `events` objects rather than calling raw `invoke()` strings.

**When to use:** Always — for every Tauri command. Eliminates entire class of runtime type errors.

**Trade-offs:** Requires debug build to regenerate `bindings.ts` when Rust signatures change. Small overhead in build pipeline, large gain in correctness.

**Example:**

```rust
// src-tauri/src/lib.rs
use tauri_specta::{collect_commands, ts};

pub fn run() {
    let invoke_handler = {
        let builder = ts::builder()
            .commands(collect_commands![
                commands::agents::fetch_agent_card,
                commands::agents::list_agents,
                commands::tasks::send_task,
                commands::tasks::stream_task,
            ]);
        #[cfg(debug_assertions)]
        let builder = builder.path("../src/bindings.ts");
        builder.build().unwrap()
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:workbench.db", db::migrations())
            .build())
        .manage(state::AppState::new())
        .invoke_handler(invoke_handler)
        .run(tauri::generate_context!())
        .unwrap();
}
```

```typescript
// src/stores/agentStore.ts
import { commands } from "../bindings";  // fully typed

const agents = await commands.listAgents();  // -> AgentCard[]
```

### Pattern 2: SSE Streaming via Tauri Channels

**What:** For A2A `tasks/sendSubscribe` streaming, the Rust command opens an SSE connection to the agent, consumes each event, and forwards it to the frontend via a Tauri `Channel<T>`. The Channel delivers ordered, typed messages with backpressure.

**When to use:** Any streaming operation. Channels are preferred over global events for per-task streams because they scope delivery to the caller.

**Trade-offs:** Channels require the frontend to pass a `Channel` instance in the invoke call. Slightly more setup than `app.emit()` but eliminates event fan-out issues when multiple tasks run concurrently.

**Example:**

```rust
// src-tauri/src/commands/tasks.rs
use tauri::ipc::Channel;
use crate::a2a::types::TaskEvent;

#[tauri::command]
pub async fn stream_task(
    agent_url: String,
    payload: serde_json::Value,
    on_event: Channel<TaskEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    let client = state.http_client.clone();
    let mut stream = crate::a2a::sse::open_stream(&client, &agent_url, payload).await?;
    while let Some(event) = stream.next().await {
        on_event.send(event?)?;
    }
    Ok("done".into())
}
```

```typescript
// src/hooks/useStreamingTask.ts
import { Channel } from "@tauri-apps/api/core";
import { commands } from "../bindings";
import type { TaskEvent } from "../bindings";

export function useStreamingTask() {
  const dispatch = useTestStore((s) => s.appendChunk);

  async function run(agentUrl: string, payload: unknown) {
    const channel = new Channel<TaskEvent>();
    channel.onmessage = (event) => dispatch(event);
    await commands.streamTask(agentUrl, payload, channel);
  }

  return { run };
}
```

### Pattern 3: AppState — Shared Rust Runtime State

**What:** A single `AppState` struct held in Tauri's managed state system, providing all commands with access to the DB connection pool and HTTP client without global variables or re-initialization overhead.

**When to use:** Always. Any resource that should live for the app's lifetime (DB pool, HTTP client, active task registry) belongs in AppState.

**Trade-offs:** Fields needing mutation require `Mutex` or `RwLock` wrapping. `tokio::sync::Mutex` for async commands, `std::sync::Mutex` for sync commands. Avoid holding locks across await points.

**Example:**

```rust
// src-tauri/src/state.rs
use std::collections::HashMap;
use tokio::sync::Mutex;
use tokio::task::AbortHandle;

pub struct AppState {
    pub http_client: reqwest::Client,                  // immutable, Clone-cheap
    pub active_tasks: Mutex<HashMap<String, AbortHandle>>, // mutable
}

impl AppState {
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap(),
            active_tasks: Mutex::new(HashMap::new()),
        }
    }
}
```

### Pattern 4: Zustand Store Slices with Explicit Boundaries

**What:** Four distinct Zustand stores. Each store owns a single domain. Cross-domain reads happen by subscribing to another store's state — never by stores calling each other's actions.

**When to use:** This scale of app (3 panels, moderate state). One store per domain prevents the "mega-store" anti-pattern while avoiding over-fragmentation.

**Trade-offs:** React components may need to import from multiple stores. This is intentional — it makes data flow explicit and traceable.

**Example:**

```typescript
// src/stores/testStore.ts
import { create } from "zustand";
import type { TaskEvent } from "../lib/a2a";

interface TestState {
  taskId: string | null;
  status: "idle" | "running" | "completed" | "failed";
  chunks: TaskEvent[];
  result: unknown | null;

  // Actions
  startTask: (taskId: string) => void;
  appendChunk: (event: TaskEvent) => void;
  finishTask: (result: unknown) => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  taskId: null,
  status: "idle",
  chunks: [],
  result: null,

  startTask: (taskId) => set({ taskId, status: "running", chunks: [], result: null }),
  appendChunk: (event) => set((s) => ({ chunks: [...s.chunks, event] })),
  finishTask: (result) => set({ status: "completed", result }),
  reset: () => set({ taskId: null, status: "idle", chunks: [], result: null }),
}));
```

---

## Data Flow

### Request Flow: Standard Invoke (e.g., Add Agent)

```
User enters agent URL → AddAgentDialog
    ↓
commands.fetchAgentCard(url)         [tauri-specta invoke]
    ↓
Rust: commands/agents.rs             [#[tauri::command]]
    ↓
reqwest GET /.well-known/agent.json  [HTTP to external agent]
    ↓
Parse JSON → AgentCard struct (serde)
    ↓
INSERT INTO agents (tauri-plugin-sql) [SQLite write]
    ↓
Return AgentCard to frontend
    ↓
agentStore.addAgent(card)            [Zustand mutation]
    ↓
AgentList re-renders                 [React reactive]
```

### Request Flow: SSE Streaming Task

```
User clicks "Send" in TestPanel
    ↓
useStreamingTask.run(agentUrl, payload)
    ↓
Channel<TaskEvent> created (frontend)
    ↓
commands.streamTask(agentUrl, payload, channel)   [invoke]
    ↓
Rust: commands/tasks.rs
    ↓
reqwest POST tasks/sendSubscribe → SSE response
    ↓
Loop: parse SSE event → channel.send(TaskEvent)   [ordered delivery]
    ↓
channel.onmessage(event)             [frontend callback]
    ↓
testStore.appendChunk(event)         [Zustand mutation]
    ↓
ResponseViewer re-renders chunk      [incremental React update]
    ↓
[stream ends / task terminal state]
    ↓
testStore.finishTask(result)
    ↓
DB INSERT into history               [via commands.saveHistory]
```

### Request Flow: Cancel Task

```
User clicks "Cancel"
    ↓
commands.cancelTask(taskId)          [invoke]
    ↓
Rust: look up AbortHandle in AppState.active_tasks
    ↓
abort_handle.abort()                 [tokio task cancellation]
    ↓
POST tasks/cancel to agent           [optional best-effort]
    ↓
Return Ok("cancelled")
    ↓
testStore.finishTask({ cancelled: true })
```

### State Management Flow

```
agentStore (Zustand)
    ↑ populated by invoke on app load / user action
    ↑ subscribes to Tauri "agent-refreshed" events (global app.emit)

testStore (Zustand)
    ↑ driven by channel.onmessage during streaming
    ↑ reset on new task start

workspaceStore (Zustand)
    ↑ populated by invoke on app load
    ↑ mutations call invoke immediately (optimistic update pattern)

uiStore (Zustand + persist middleware → localStorage)
    ↑ never calls Rust — pure frontend state
```

---

## SQLite Schema Design

### Migrations (defined in `src-tauri/src/db.rs`)

```sql
-- Migration 1: agents
CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,           -- UUID v4
    url         TEXT NOT NULL UNIQUE,       -- canonical card URL
    nickname    TEXT,
    card_json   TEXT NOT NULL,              -- raw AgentCard JSON blob
    last_fetched_at  INTEGER NOT NULL,      -- Unix timestamp
    workspace_id     TEXT NOT NULL REFERENCES workspaces(id)
);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);

-- Migration 2: workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);
INSERT OR IGNORE INTO workspaces(id, name, created_at)
    VALUES('default', 'Default', unixepoch());

-- Migration 3: history
CREATE TABLE IF NOT EXISTS history (
    id           TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_name   TEXT NOT NULL,
    request_json TEXT NOT NULL,             -- full JSON-RPC request
    response_json TEXT,                     -- full response (null if cancelled)
    status       TEXT NOT NULL,             -- completed | failed | cancelled
    duration_ms  INTEGER,
    created_at   INTEGER NOT NULL
);
CREATE INDEX idx_history_agent ON history(agent_id);
CREATE INDEX idx_history_created ON history(created_at DESC);

-- Migration 4: saved_tests
CREATE TABLE IF NOT EXISTS saved_tests (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_name   TEXT NOT NULL,
    request_json TEXT NOT NULL,
    created_at   INTEGER NOT NULL
);

-- Migration 5: settings
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings VALUES
    ('theme', '"system"'),
    ('timeout_seconds', '30'),
    ('proxy_url', 'null');
```

### Schema Design Rationale

- `card_json TEXT` — store the raw AgentCard blob rather than normalizing skills into separate tables. Skills are display-only derived data; querying the JSON blob with `json_extract()` is sufficient and avoids migration churn when the A2A spec evolves.
- `request_json` / `response_json` — full message blobs in history. History is append-only; no partial updates needed. JSON blobs prevent schema changes when message formats evolve.
- `workspace_id` on agents — simple workspace scoping. No workspace-level DB files (would complicate migrations).
- `settings` as key-value — avoids schema migration for adding new settings. Values are JSON-encoded strings.

---

## Component Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| React component ↔ Zustand store | Direct store subscription | Both | Components read state, dispatch actions |
| Zustand store ↔ Rust commands | `commands.*` (invoke) | Frontend → Rust → return | Type-safe via tauri-specta bindings |
| Rust streaming → Frontend | `Channel<T>` | Rust → Frontend | Per-task, ordered, no fan-out |
| Rust broadcast → Frontend | `AppHandle::emit()` | Rust → all windows | Used for app-wide events (agent refreshed) |
| Rust ↔ SQLite | tauri-plugin-sql (sqlx) | Both | Inside Rust only; frontend never touches DB directly |
| Rust ↔ External agents | reqwest HTTP | Rust → agent | All network in Rust; no webview network calls |
| Frontend ↔ OS keychain | tauri-plugin-keychain | Both | Credentials never in SQLite or Zustand |

---

## Build Order Implications

The component dependency graph dictates this build order:

**Phase 1: Foundation**
1. `error.rs` — AppError type (everything depends on this)
2. `state.rs` — AppState struct (all commands need it)
3. `db.rs` — migrations (must run before commands touch DB)
4. `lib.rs` builder setup — wires plugins, state, capabilities

**Phase 2: A2A Client**
5. `a2a/types.rs` — domain types (AgentCard, Task, etc.)
6. `a2a/client.rs` — HTTP POST JSON-RPC
7. `a2a/sse.rs` — SSE stream consumer

**Phase 3: Commands**
8. `commands/agents.rs` — depends on a2a/client + DB
9. `commands/tasks.rs` — depends on a2a/client + a2a/sse + AppState
10. `commands/history.rs` — depends on DB only
11. `commands/settings.rs` — depends on DB only
12. `commands/workspaces.rs` — depends on DB only

**Phase 4: Frontend Core**
13. `bindings.ts` — auto-generated after Rust commands exist
14. `stores/` — Zustand stores (depends on bindings types)
15. `lib/a2a.ts` — shared type definitions

**Phase 5: Frontend UI**
16. `components/agent/` — depends on agentStore
17. `components/skill/` — depends on agentStore (derived)
18. `components/test/` — depends on testStore + hooks
19. `hooks/useStreamingTask.ts` — depends on Channel + testStore

---

## Anti-Patterns

### Anti-Pattern 1: Network Requests in the Webview

**What people do:** Use `fetch()` in React components to call A2A agents directly.

**Why it's wrong:** Triggers CORS errors, exposes API keys in frontend JS, and bypasses the security model. The project explicitly requires all HTTP from Rust.

**Do this instead:** All network calls go through Rust commands. The Rust `reqwest::Client` in AppState handles HTTP with no CORS constraints, and credentials stay in the OS keychain accessed only from Rust.

### Anti-Pattern 2: Multiple `invoke_handler` Calls

**What people do:** Call `.invoke_handler()` multiple times in the builder for different command groups.

**Why it's wrong:** Only the last call wins. Commands registered in earlier calls become unreachable from the frontend — silent failures, no compile error.

**Do this instead:** All commands in a single `tauri::generate_handler![]` call via `commands/mod.rs` re-exports. Use `tauri-specta`'s `collect_commands!` macro which wraps this correctly.

### Anti-Pattern 3: Blocking the Rust Main Thread with Sync I/O

**What people do:** Use synchronous `reqwest::blocking` or `std::fs` in Tauri commands without `async`.

**Why it's wrong:** Tauri's WebView event loop shares the thread. Blocking it causes UI freezes and dropped IPC messages.

**Do this instead:** All commands are `async`. Use `reqwest` async, `tokio::fs`, and `tokio::sync::Mutex`. Tauri automatically spawns async commands on the tokio runtime.

### Anti-Pattern 4: Holding Mutex Across Await Points

**What people do:** Lock a `std::sync::Mutex`, then `.await` something inside the lock guard's scope.

**Why it's wrong:** `std::sync::MutexGuard` is not `Send`. This causes a compile error, or if worked around, deadlock risk.

**Do this instead:** Use `tokio::sync::Mutex` for any state accessed in async commands. Alternatively, lock → clone data → unlock → await with the clone.

### Anti-Pattern 5: Storing Credentials in SQLite

**What people do:** Save API keys or auth tokens in the `settings` table for convenience.

**Why it's wrong:** SQLite file is readable by other processes on the filesystem. Credentials are sensitive.

**Do this instead:** Store credentials in OS keychain via `tauri-plugin-keychain`. Store only a reference key name in SQLite (e.g., `agent_{id}_api_key_name`).

### Anti-Pattern 6: One Zustand Store for Everything

**What people do:** Put agent list, active task, streaming chunks, UI state, and settings all in one Zustand store.

**Why it's wrong:** Every component re-renders on any state change. Streaming chunks update 10-50 times per second; this would cause the agent list panel to re-render on every chunk.

**Do this instead:** Separate stores by update frequency and domain. `uiStore` and `agentStore` are stable. `testStore` is volatile during streaming. Components subscribe only to the store slice they need.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| A2A agent (card fetch) | `reqwest GET /.well-known/agent.json` | From Rust, returns JSON blob |
| A2A agent (task send) | `reqwest POST {agent_url}` with JSON-RPC body | Synchronous, returns Task |
| A2A agent (streaming) | `reqwest POST` → `text/event-stream` SSE | `reqwest-eventsource` or `eventsource-client` crate |
| OS keychain | `tauri-plugin-keychain` | Credential storage only, not SQLite |

### Internal Boundaries

| Boundary | Communication | Consideration |
|----------|---------------|---------------|
| TestPanel ↔ ResponseViewer | Props + testStore subscription | ResponseViewer subscribes to `chunks` slice only |
| testStore ↔ history | After task completes, store calls `commands.saveHistory()` | Fire-and-forget; failures logged but don't block UI |
| agentStore ↔ workspaceStore | agentStore filters by `workspaceStore.activeId` | One-way data dependency; workspaceStore does not know about agents |
| commands/tasks.rs ↔ commands/history.rs | None — history saved by a separate invoke from frontend | Keeps Rust commands single-responsibility |

---

## Scaling Considerations

This is a local desktop app with one user. Traditional web scaling doesn't apply. The relevant limits are:

| Concern | Practical Limit | Mitigation |
|---------|-----------------|------------|
| Number of agents | ~1,000 | Index on workspace_id; list API paginates |
| History rows | ~100,000 | Add `created_at` index (already planned); offer clear/archive |
| Streaming chunk rate | ~50 events/sec | Channel delivers ordered; React batches renders via `startTransition` |
| Concurrent tasks | App supports 1 active task per design | `active_tasks` HashMap tracks AbortHandles for cancel |
| Binary size | Tauri ~6MB base; reqwest adds ~2MB | Use `default-features = false` on reqwest; only enable `json` + `stream` features |

---

## Sources

- [Tauri 2.x Architecture Concepts](https://v2.tauri.app/concept/architecture/) — official (HIGH confidence)
- [Tauri 2.x: Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/) — official (HIGH confidence)
- [Tauri 2.x: Calling Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/) — official (HIGH confidence)
- [Tauri 2.x: State Management](https://v2.tauri.app/develop/state-management/) — official (HIGH confidence)
- [Tauri 2.x: Project Structure](https://v2.tauri.app/start/project-structure/) — official (HIGH confidence)
- [Tauri 2.x: SQL Plugin](https://v2.tauri.app/plugin/sql/) — official (HIGH confidence)
- [tauri-specta: Typesafe Tauri Commands](https://github.com/specta-rs/tauri-specta) — official repo (HIGH confidence)
- [A2A Protocol: Streaming & Async](https://a2a-protocol.org/latest/topics/streaming-and-async/) — official A2A spec (HIGH confidence)
- [reqwest-eventsource crate](https://docs.rs/reqwest-eventsource/) — crates.io (HIGH confidence)
- [tauri-apps/awesome-tauri](https://github.com/tauri-apps/awesome-tauri) — community reference (MEDIUM confidence)
- [Zustand cross-window sync in Tauri](https://www.gethopp.app/blog/tauri-window-state-sync) — production case study (MEDIUM confidence)
- [How to organize Tauri commands in Rust](https://dev.to/n3rd/how-to-reasonably-keep-your-tauri-commands-organized-in-rust-2gmo) — community guide (MEDIUM confidence)

---

*Architecture research for: A2A Workbench (Tauri 2.x + React + SQLite + A2A protocol)*
*Researched: 2026-03-24*
