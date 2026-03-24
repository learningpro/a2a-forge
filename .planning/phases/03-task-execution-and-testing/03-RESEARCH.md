# Phase 3: Task Execution and Testing — Research

**Researched:** 2026-03-24
**Domain:** Tauri 2.x + React 18 + Rust — A2A task execution, SSE streaming, Monaco Editor, Markdown rendering, SQLite history, workspaces, settings
**Confidence:** HIGH (primary sources: existing codebase, official Tauri docs, A2A spec, npm/crates.io)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test Input Panel (Left Column)**
- Tab row: message | context data | headers — matching mockup exactly
- "message" tab: multi-line textarea for text mode input
- "context data" tab: Monaco JSON editor with syntax highlighting for data mode
- "headers" tab: key-value editor for custom request headers (Bearer tokens, API keys)
- File input: drag-and-drop zone when skill has file inputMode — shows filename after selection
- Input area adapts based on selected skill's inputModes
- Examples section below input: clickable chips that populate the input textarea
- Auth row at bottom: dropdown populated from card's auth schemes + credential values from keychain

**Task Execution**
- "Run" button sends tasks/send JSON-RPC to agent endpoint via Rust command
- Request format: `{"jsonrpc": "2.0", "method": "tasks/send", "params": {"id": "<uuid>", "message": {"role": "user", "parts": [{"type": "text", "text": "..."}]}, "metadata": {"skill_id": "..."}}, "id": 1}`
- Real-time status indicator: green dot + "Run" → amber dot + "Running…" → green dot + "Run" on completion
- Status badge updates: submitted → working → completed/failed/canceled
- Latency displayed in ms
- Task ID shown in response area

**SSE Streaming**
- When agent advertises `streaming: true` in capabilities, use tasks/sendSubscribe instead of tasks/send
- Rust SSE consumer: reqwest-eventsource crate consuming SSE events
- Forward chunks to frontend via Tauri Channel (ordered, scoped to caller)
- Frontend incrementally appends response parts as they arrive
- Status badge updates in real-time as SSE events arrive

**Response Viewer (Right Column)**
- Two tabs: "rendered" (default) | "raw json"
- Status bar at top: status pill (completed=green, failed=red, working=amber) + latency + tab toggle
- Rendered view: Task ID row in monospace, message bubbles with role label, text parts as markdown, file parts as download links, data parts as formatted JSON
- Raw JSON view: full JSON-RPC response in syntax-highlighted collapsible tree
- JSON tree colors (light): keys=#185fa5, strings=#1d9e75, numbers=#854f0b, booleans=#993556
- JSON tree colors (dark): keys=#85b7eb, strings=#5dcaa5, numbers=#ef9f27, booleans=#ed93b1

**Curl Export**
- Format: `curl -X POST {url}/a2a -H "Content-Type: application/json" -H "{auth_header}" -d '{json_rpc_body}'`
- Copies to clipboard with notification

**Test History**
- All executions saved to SQLite history table (already exists in schema: id, agent_id, skill_name, request_json, response_json, status, duration_ms, created_at)
- History browsable in a panel/view — list with search
- Clear history: per agent or globally, with confirmation

**Saved Test Cases**
- Saved to SQLite saved_tests table (already exists: id, name, agent_id, skill_name, request_json, created_at)
- One-click re-run

**Workspaces**
- Multiple named workspaces; selector in sidebar footer
- Switching workspace filters agent list
- Default workspace already created in Phase 1

**Settings**
- Global: default timeout (ms), proxy URL, theme, telemetry opt-in → SQLite settings table
- Per-card: default auth headers, base URL override

**Keyboard Shortcuts**
- Ctrl/Cmd+N: Add agent card
- Ctrl/Cmd+Enter: Run test
- Ctrl/Cmd+Shift+C: Copy curl command

**Empty States**
- No agents: "Get started by adding your first A2A agent" + example URL (https://aigc-service.echonlab.com)
- No skills: "Select an agent to browse its skills"
- No test results: "Select a skill and run a test to see results here"

**Specific Colors (exact)**
- completed=#1D9E75, working=#EF9F27, failed=#E24B4A (run button dot)
- AIGC Service URL: https://aigc-service.echonlab.com with API key WFmYS00N2U0LThkYmItMTgzOGVkZjlmN

### Claude's Discretion
- Monaco Editor integration details and lazy loading
- Markdown rendering library choice
- History panel layout (inline vs separate view)
- Settings panel layout (modal vs page)
- Exact keyboard shortcut implementation
- Workspace CRUD UI details
- Error boundary and retry patterns

### Deferred Ideas (OUT OF SCOPE)
- A2A push notifications (agent-initiated messages) — v2
- input-required task state handling — v2
- Local mock agent mode for offline testing — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Panel shows full skill metadata (id, name, description, input/output modes, examples) | agentStore.selectedSkillId → AgentSkill type has all fields |
| TEST-02 | Adaptive input area (text → textarea, file → drag-drop, data → Monaco JSON editor) | Monaco lazy-load pattern, inputModes field on AgentSkill |
| TEST-03 | Auth method selection if card declares multiple schemes | AgentCard has no authSchemes field yet — needs extension or read from raw card_json |
| TEST-04 | Override request headers via key-value editor | Headers tab in input panel; added to JSON-RPC request |
| TEST-05 | tasks/send JSON-RPC with real-time status indicator | Rust command pattern established; reqwest already installed |
| TEST-06 | SSE streaming via tasks/sendSubscribe | reqwest-eventsource crate needed (not yet in Cargo.toml); Tauri Channel pattern |
| TEST-07 | Response viewer: collapsible JSON tree | Custom JsonTree component with exact colors from mockup |
| TEST-08 | Response viewer: native part rendering (markdown, file download, data JSON) | react-markdown + remark-gfm; not yet installed |
| TEST-09 | Status badge and latency display | testStore state machine; mockup colors locked |
| TEST-10 | Save request/response as named Test Case | saved_tests table exists; needs save_test + list_saved_tests Rust commands |
| TEST-11 | Re-run saved Test Case with one click | Populate input from saved request_json, fire send_task |
| TEST-12 | Copy curl command | lib/curl.ts utility; clipboard API via navigator |
| HIST-01 | All executions saved to SQLite history | history table exists; needs save_history + list_history Rust commands |
| HIST-02 | History browsable and searchable | HistoryList component; search filters history rows |
| HIST-03 | Clear history per agent or globally | clear_history Rust command with agent_id param |
| WORK-01 | Multiple named workspaces with selector | workspaces table exists; needs list_workspaces + create_workspace Rust commands + workspaceStore |
| SETT-01 | Global settings: timeout, proxy, theme, telemetry | settings table exists; get_settings/save_settings stubs need implementation |
| SETT-02 | Per-card settings: default auth headers, base URL override | New settings keys keyed by agent_id; stored in settings table |
| UIUX-03 | Keyboard shortcuts for add card, run test, copy curl | useKeyboardShortcuts hook with useEffect + keydown handler |
| UIUX-04 | Empty states guide new users | Conditional rendering based on store state |
</phase_requirements>

---

## Summary

Phase 3 is the largest and final phase, implementing the complete test execution workflow on top of a solid Phase 1/2 foundation. The Rust backend already has AppState (http_client + active_tasks), the SQLite schema (history, saved_tests, settings, workspaces tables all created), the error type, and the tauri-specta binding pattern. The frontend has Zustand stores (agentStore with selectedSkillId, uiStore) and the TypeScript bindings pattern.

The three highest-complexity challenges are: (1) SSE streaming via reqwest-eventsource → Tauri Channel → React, which requires adding reqwest-eventsource to Cargo.toml and implementing the full stream_task command with abort handle registration; (2) Monaco Editor lazy loading — already enforced by an existing bundle-safety test that FAILS if any non-test file imports Monaco at module level, requiring a dedicated lazy wrapper component; and (3) the JSON tree renderer that must match exact mockup colors in both light and dark modes.

The existing `settings.rs` commands are stubs returning hardcoded JSON — they need real SQLite integration. Missing entirely from the codebase: commands for tasks (send_task, stream_task, cancel_task), history (save_history, list_history, clear_history), saved tests (save_test, list_saved_tests, delete_saved_test), and workspaces (list_workspaces, create_workspace, set_active_workspace, delete_workspace). On the frontend, missing stores: testStore and workspaceStore. Missing hooks: useStreamingTask, useKeyboardShortcuts. Missing components: all of TestPanel internals, ResponseViewer, HistoryList.

**Primary recommendation:** Build Rust commands in dependency order first (settings → workspaces → history → saved_tests → tasks/send → tasks/stream), then wire frontend stores and hooks, then build UI components top-down from TestPanel shell to leaf components.

---

## Standard Stack

### Core (already installed — verified from package.json + Cargo.toml)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @monaco-editor/react | ^4.6.0 | JSON editor in "context data" tab | Installed; needs lazy wrapper |
| monaco-editor | ^0.55.0 | Monaco underlying library | Installed |
| zustand | ^5.0.12 | State management (testStore, workspaceStore) | Installed; need new stores |
| @tanstack/react-query | ^5.95.0 | Async data fetching | Installed; not yet used |
| reqwest | 0.12 | HTTP client | Installed with `json` feature only |
| tauri-plugin-sql | 2.x | SQLite | Installed |

### Needs to Be Added

| Library | Version | Purpose | Install |
|---------|---------|---------|---------|
| reqwest-eventsource | 0.6 | SSE stream consumption in Rust | Cargo.toml only |
| futures | 0.3 | Stream combinators for SSE iteration | Cargo.toml only |
| react-markdown | ^10.x | Render text parts as markdown | npm |
| remark-gfm | ^4.x | GFM tables/strikethrough in markdown | npm |
| rehype-highlight | latest | Code syntax highlighting | npm |

**Cargo.toml additions needed:**
```toml
reqwest-eventsource = "0.6"
futures = "0.3"
```

Also: `reqwest` needs `stream` feature added:
```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
```

**npm additions needed:**
```bash
npm install react-markdown remark-gfm rehype-highlight
```

Note: `@tauri-apps/plugin-keyring` is already installed in lib.rs but the JS-side package may not be — credential retrieval for auth headers is done from Rust only so no JS package is needed.

---

## Architecture Patterns

### Recommended New File Structure (additions to existing project)

```
src-tauri/src/
├── commands/
│   ├── mod.rs               # Add: tasks, history, saved_tests, workspaces
│   ├── tasks.rs             # NEW: send_task, stream_task, cancel_task
│   ├── history.rs           # NEW: save_history, list_history, clear_history
│   ├── saved_tests.rs       # NEW: save_test, list_saved_tests, delete_saved_test
│   ├── workspaces.rs        # NEW: list_workspaces, create_workspace, delete_workspace, set_active_workspace
│   └── settings.rs          # REPLACE stub with real SQLite impl
└── a2a/
    ├── mod.rs               # Add: pub mod client; pub mod sse;
    ├── types.rs             # EXISTS — add TaskRequest, TaskResponse, TaskEvent types
    ├── client.rs            # NEW: send_task_rpc(), send_subscribe_rpc()
    └── sse.rs               # NEW: open_sse_stream()

src/
├── stores/
│   ├── testStore.ts          # NEW: task state, chunks, result
│   └── workspaceStore.ts     # NEW: workspace list, active workspace
├── hooks/
│   ├── useStreamingTask.ts   # NEW: Channel wiring
│   └── useKeyboardShortcuts.ts # NEW: global keydown handler
├── lib/
│   ├── curl.ts               # NEW: generate curl string
│   └── a2a.ts                # NEW: shared TS types for A2A (TaskRequest, TaskEvent, etc.)
└── components/
    ├── test/
    │   ├── TestPanel.tsx      # REPLACE placeholder with full implementation
    │   ├── InputForm.tsx      # NEW: adaptive input with Monaco lazy
    │   ├── ResponseViewer.tsx # NEW: rendered + raw tabs
    │   ├── JsonTree.tsx       # NEW: recursive JSON renderer with mockup colors
    │   ├── TaskStatus.tsx     # NEW: status pill + latency
    │   ├── HistoryList.tsx    # NEW: scrollable history with search
    │   └── MonacoWrapper.tsx  # NEW: lazy-loaded Monaco (must not appear in non-test files directly)
    └── settings/
        └── SettingsModal.tsx  # NEW: global settings form
```

### Pattern 1: SSE Streaming — reqwest-eventsource → Channel

**What:** Rust opens SSE connection using reqwest-eventsource, reads each event, forwards to frontend via Tauri Channel. Frontend creates Channel before invoking, sets `onmessage` handler, passes channel to invoke call.

**Critical detail:** `reqwest` must have the `stream` feature enabled. reqwest-eventsource wraps a `reqwest::RequestBuilder`, not a URL string, enabling POST with headers.

```rust
// src-tauri/src/commands/tasks.rs
use futures::StreamExt;
use reqwest_eventsource::{Event, EventSource};
use tauri::ipc::Channel;
use crate::a2a::types::TaskEvent;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn stream_task(
    agent_url: String,
    payload: serde_json::Value,
    auth_header: Option<String>,
    on_event: Channel<TaskEvent>,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let client = state.http_client.clone();

    let mut req = client
        .post(format!("{}/a2a", agent_url.trim_end_matches('/')))
        .header("Content-Type", "application/json")
        .json(&payload);

    if let Some(auth) = auth_header {
        req = req.header("Authorization", auth);
    }

    let mut es = EventSource::new(req)
        .map_err(|e| AppError::Http(e.to_string()))?;

    let handle = tokio::spawn(async move {
        while let Some(event) = es.next().await {
            match event {
                Ok(Event::Open) => {},
                Ok(Event::Message(msg)) => {
                    if let Ok(event_data) = serde_json::from_str::<TaskEvent>(&msg.data) {
                        let _ = on_event.send(event_data);
                    }
                }
                Err(_) => {
                    es.close();
                    break;
                }
            }
        }
    });

    // Register abort handle for cancel support
    let abort = handle.abort_handle();
    state.active_tasks.lock().await.insert(task_id.clone(), abort);
    Ok(task_id)
}
```

```typescript
// src/hooks/useStreamingTask.ts
import { Channel } from "@tauri-apps/api/core";
import { commands } from "../bindings";
import { useTestStore } from "../stores/testStore";
import type { TaskEvent } from "../bindings";

export function useStreamingTask() {
  const { appendChunk, startTask, finishTask } = useTestStore();

  async function run(agentUrl: string, payload: unknown, authHeader?: string) {
    const channel = new Channel<TaskEvent>();
    channel.onmessage = (event) => appendChunk(event);

    const taskId = await commands.streamTask(
      agentUrl,
      payload,
      authHeader ?? null,
      channel
    );
    startTask(taskId);
    // stream_task resolves when stream ends
    finishTask();
  }

  return { run };
}
```

### Pattern 2: Non-Streaming Task (tasks/send)

```rust
// src-tauri/src/commands/tasks.rs
#[tauri::command]
#[specta::specta]
pub async fn send_task(
    agent_url: String,
    payload: serde_json::Value,
    auth_header: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, AppError> {
    let mut req = state.http_client
        .post(format!("{}/a2a", agent_url.trim_end_matches('/')))
        .header("Content-Type", "application/json")
        .json(&payload);

    if let Some(auth) = auth_header {
        req = req.header("Authorization", auth);
    }

    let resp = req.send().await?;
    let json: serde_json::Value = resp.json().await?;
    Ok(json)
}
```

### Pattern 3: Monaco Editor Lazy Loading

**Critical:** A bundle-safety test at `src/__tests__/bundle-safety.test.ts` already exists and FAILS the build if any non-test `.ts`/`.tsx` file imports Monaco at module level. Monaco MUST be wrapped in `React.lazy()`. The wrapper component must be the ONLY file that directly imports `@monaco-editor/react`.

```typescript
// src/components/test/MonacoWrapper.tsx  ← ONLY file that imports Monaco
import Editor from "@monaco-editor/react";
import loader from "@monaco-editor/loader";
import * as monaco from "monaco-editor";

// Bundle locally — no CDN (app may be offline)
loader.config({ monaco });

interface Props {
  value: string;
  onChange: (value: string) => void;
  theme?: "vs" | "vs-dark";
}

export default function MonacoWrapper({ value, onChange, theme = "vs" }: Props) {
  return (
    <Editor
      height="100%"
      language="json"
      value={value}
      theme={theme}
      onChange={(v) => onChange(v ?? "")}
      options={{ minimap: { enabled: false }, fontSize: 12 }}
    />
  );
}
```

```typescript
// src/components/test/InputForm.tsx — uses lazy import
import { lazy, Suspense } from "react";

// Dynamic import — Vite splits this into separate chunk
const MonacoWrapper = lazy(() => import("./MonacoWrapper"));

function DataInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: "var(--text-muted)" }}>Loading editor…</div>}>
      <MonacoWrapper value={value} onChange={onChange} />
    </Suspense>
  );
}
```

### Pattern 4: JSON-RPC Request Construction

The CONTEXT.md locks the exact request format. Build it in `lib/a2a.ts`:

```typescript
// src/lib/a2a.ts
export function buildTaskSendPayload(
  skillId: string,
  text: string,
  taskId: string
): object {
  return {
    jsonrpc: "2.0",
    method: "tasks/send",
    params: {
      id: taskId,
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      metadata: { skill_id: skillId },
    },
    id: 1,
  };
}

export function buildTaskSubscribePayload(
  skillId: string,
  text: string,
  taskId: string
): object {
  return {
    jsonrpc: "2.0",
    method: "tasks/sendSubscribe",
    params: {
      id: taskId,
      message: {
        role: "user",
        parts: [{ type: "text", text }],
      },
      metadata: { skill_id: skillId },
    },
    id: 1,
  };
}
```

### Pattern 5: Settings Command with Real SQLite

```rust
// src-tauri/src/commands/settings.rs — replace stub
use tauri::Manager;
use tauri_plugin_sql::{DbInstances, DbPool};
use sqlx::Row;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn get_settings(app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query("SELECT key, value FROM settings")
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    let mut map = serde_json::Map::new();
    for row in rows {
        let key: String = row.try_get("key").map_err(|e| AppError::Database(e.to_string()))?;
        let val: String = row.try_get("value").map_err(|e| AppError::Database(e.to_string()))?;
        let parsed: serde_json::Value = serde_json::from_str(&val)?;
        map.insert(key, parsed);
    }
    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
#[specta::specta]
pub async fn save_setting(
    key: String,
    value: String,  // JSON-encoded value
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)")
        .bind(&key)
        .bind(&value)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
```

Note: `get_pool` helper is copy-paste from `agents.rs` — consider extracting to `db.rs` or a `db_helpers.rs` module to avoid repetition.

### Pattern 6: testStore Zustand Store

```typescript
// src/stores/testStore.ts
import { create } from "zustand";

export type TaskStatus = "idle" | "running" | "completed" | "failed" | "canceled";

export interface TaskChunk {
  raw: unknown;
  status?: string;
  parts?: unknown[];
}

interface TestState {
  taskId: string | null;
  status: TaskStatus;
  chunks: TaskChunk[];
  result: unknown | null;
  latencyMs: number | null;
  startedAt: number | null;

  startTask: (taskId: string) => void;
  appendChunk: (chunk: TaskChunk) => void;
  finishTask: (result: unknown, status?: TaskStatus) => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  taskId: null,
  status: "idle",
  chunks: [],
  result: null,
  latencyMs: null,
  startedAt: null,

  startTask: (taskId) =>
    set({ taskId, status: "running", chunks: [], result: null, startedAt: Date.now() }),

  appendChunk: (chunk) =>
    set((s) => ({ chunks: [...s.chunks, chunk] })),

  finishTask: (result, status = "completed") =>
    set((s) => ({
      status,
      result,
      latencyMs: s.startedAt ? Date.now() - s.startedAt : null,
    })),

  reset: () =>
    set({ taskId: null, status: "idle", chunks: [], result: null, latencyMs: null, startedAt: null }),
}));
```

### Pattern 7: Keyboard Shortcuts Hook

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";

export function useKeyboardShortcuts(handlers: {
  onAddAgent?: () => void;
  onRunTest?: () => void;
  onCopyCurl?: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "n") {
        e.preventDefault();
        handlers.onAddAgent?.();
      }
      if (mod && e.key === "Enter") {
        e.preventDefault();
        handlers.onRunTest?.();
      }
      if (mod && e.shiftKey && e.key === "C") {
        e.preventDefault();
        handlers.onCopyCurl?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
```

### Anti-Patterns to Avoid

- **Direct Monaco import at module level:** The bundle-safety test will fail CI. Always use `React.lazy()` + dynamic import.
- **CDN Monaco loading:** App may run offline. Always configure `loader.config({ monaco })` to bundle locally.
- **Storing credentials in testStore or SQLite:** Auth tokens come from keychain via Rust credential retrieval. Never pass credentials through Zustand or log them.
- **Holding Mutex across await in stream_task:** Clone the http_client before locking active_tasks. Never lock Mutex and then `.await`.
- **`app.emit()` for SSE chunks:** Use `Channel<T>` for streaming data. `emit()` is JSON-serialized globally and lossy under load.
- **Multiple `invoke_handler` calls:** All new commands must go into the single `collect_commands![]` in `lib.rs`.
- **Inline Monaco import in TestPanel.tsx:** TestPanel.tsx must `lazy(() => import("./MonacoWrapper"))` — it must NOT import Monaco directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom markdown parser | react-markdown + remark-gfm | Handles GFM tables, code fences, escaping correctly |
| SSE stream parsing | Manual byte parsing | reqwest-eventsource 0.6 | Handles retry, reconnect, event ID tracking, partial events |
| JSON syntax highlighting | CSS span injection | JsonTree component with hardcoded CSS classes | The mockup defines exact colors — build a custom recursive component, not a library |
| Clipboard write | execCommand('copy') (deprecated) | navigator.clipboard.writeText() | Modern async API, works in Tauri webview |
| UUID generation | Custom ID | uuid crate (already installed) / crypto.randomUUID() | Both available; Rust side uses uuid::Uuid::new_v4() |
| Task abort | Custom flag | tokio::task::AbortHandle | Already in AppState.active_tasks HashMap |

**Key insight:** The JSON tree renderer must be custom (not a library) because it must use the exact colors from the mockup specification (light/dark mode pairs), and existing libraries won't match pixel-perfectly.

---

## Common Pitfalls

### Pitfall 1: reqwest missing `stream` feature
**What goes wrong:** reqwest-eventsource requires `reqwest` to be compiled with the `stream` feature. Without it, the `.bytes_stream()` method is unavailable and the code fails to compile.
**How to avoid:** In Cargo.toml, change `reqwest = { version = "0.12", features = ["json"] }` to `reqwest = { version = "0.12", features = ["json", "stream"] }`.
**Warning signs:** Compile error mentioning `bytes_stream` or `eventsource` method not found.

### Pitfall 2: Monaco bundle-safety test failure
**What goes wrong:** Any `.ts`/`.tsx` file that directly imports `@monaco-editor/react` or `monaco-editor` at module level will fail the existing bundle-safety Vitest test (`src/__tests__/bundle-safety.test.ts`). This test runs on every `npm test`.
**How to avoid:** Create exactly one wrapper file (`MonacoWrapper.tsx`) with the Monaco import. All other files that need Monaco use `React.lazy(() => import("./MonacoWrapper"))`.
**Warning signs:** `bundle-safety > should not import Monaco Editor in any source file at startup` test failure.

### Pitfall 3: tauri-specta collect_commands not updated
**What goes wrong:** New Rust commands in tasks.rs, history.rs etc. won't be callable from the frontend until added to `collect_commands![]` in `lib.rs`. Invocations will silently fail or throw "Command not found" at runtime.
**How to avoid:** After each new command file, immediately add all its pub commands to `lib.rs` collect_commands macro.
**Warning signs:** Frontend gets "invoke: unknown command" error in the Tauri dev console.

### Pitfall 4: get_pool helper duplication
**What goes wrong:** The `get_pool()` helper in `agents.rs` is private to that module. Each new command file (tasks.rs, history.rs, settings.rs, workspaces.rs, saved_tests.rs) needs DB access but can't reuse it — leading to copy-pasted boilerplate.
**How to avoid:** Extract `get_pool()` into `db.rs` or a new `db_helpers.rs` and make it `pub(crate)`. All command modules then import from there.
**Warning signs:** Copy-paste of the `get_pool` function appearing in multiple files.

### Pitfall 5: Channel type mismatch in specta bindings
**What goes wrong:** `Channel<T>` in tauri-specta generates as `string` (the channel ID) in TypeScript bindings. If the Rust command signature uses a complex `TaskEvent` type, specta may not export it correctly.
**How to avoid:** Define `TaskEvent` with `#[derive(Serialize, Deserialize, Type)]` and register it in specta. The frontend must pass `channel` directly (not `.toJSON()`); tauri-specta handles the serialization automatically.
**Warning signs:** TypeScript error saying channel parameter expects `string` but got `Channel<T>`.

### Pitfall 6: Auth schemes not in AgentCard Rust types
**What goes wrong:** The existing `AgentCard` Rust struct in `types.rs` does not have a `security_schemes` or `authentication` field. A2A cards advertise auth schemes, but the current deserialization would drop them. The UI needs to display auth options.
**How to avoid:** Add an `authentication` field (`#[serde(default)] pub authentication: Option<serde_json::Value>`) to `AgentCard` struct to capture whatever the card returns without breaking existing deserialization.
**Warning signs:** Auth dropdown in TestPanel is always empty even for agents that declare auth schemes.

### Pitfall 7: History saved after streaming completes, not before
**What goes wrong:** For streaming tasks, `save_history` must be called from the frontend AFTER the stream ends (when `stream_task` promise resolves), not during. Calling it mid-stream results in incomplete response_json.
**How to avoid:** In `useStreamingTask.ts`, call `commands.saveHistory(...)` inside the `.then()` callback after `commands.streamTask()` resolves. For non-streaming, call after `commands.sendTask()` returns.
**Warning signs:** History entries have null or partial response_json.

### Pitfall 8: Settings table stores JSON-encoded values
**What goes wrong:** The settings table stores values as JSON strings (e.g., `'"system"'` for theme, `'30'` for timeout_seconds, `'null'` for proxy_url). Writing raw strings breaks the existing convention and causes JSON parse errors on read.
**How to avoid:** Always `JSON.stringify(value)` before writing to settings, and `JSON.parse(value)` after reading. In Rust: `serde_json::to_string(&value)` when writing, `serde_json::from_str::<Value>(&raw_val)` when reading.
**Warning signs:** `get_settings` returns stringified-strings like `"\"system\""` instead of `"system"`.

---

## Code Examples

### JSON-RPC Curl Generation
```typescript
// src/lib/curl.ts
export function generateCurlCommand(
  agentUrl: string,
  payload: object,
  authHeader?: string,
  extraHeaders?: Record<string, string>
): string {
  const url = `${agentUrl.replace(/\/$/, "")}/a2a`;
  const parts = ["curl -X POST", `  '${url}'`];
  parts.push(`  -H 'Content-Type: application/json'`);
  if (authHeader) {
    parts.push(`  -H '${authHeader}'`);
  }
  for (const [k, v] of Object.entries(extraHeaders ?? {})) {
    parts.push(`  -H '${k}: ${v}'`);
  }
  parts.push(`  -d '${JSON.stringify(payload)}'`);
  return parts.join(" \\\n");
}
```

### JsonTree Component (exact mockup colors)
```typescript
// src/components/test/JsonTree.tsx
// Colors: light mode keys=#185fa5 str=#1d9e75 num=#854f0b bool=#993556
// Dark mode: keys=#85b7eb str=#5dcaa5 num=#ef9f27 bool=#ed93b1
interface JsonTreeProps {
  value: unknown;
  indent?: number;
}

export function JsonTree({ value, indent = 0 }: JsonTreeProps) {
  const pad = "  ".repeat(indent);
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === "boolean") return <span className="json-bool">{String(value)}</span>;
  if (typeof value === "number") return <span className="json-num">{value}</span>;
  if (typeof value === "string") return <span className="json-str">"{value}"</span>;
  if (Array.isArray(value)) {
    return (
      <span>
        {"["}
        {value.map((item, i) => (
          <div key={i} style={{ paddingLeft: 16 }}>
            {pad}<JsonTree value={item} indent={indent + 1} />
            {i < value.length - 1 ? "," : ""}
          </div>
        ))}
        {"]"}
      </span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <span>
        {"{"}
        {entries.map(([k, v], i) => (
          <div key={k} style={{ paddingLeft: 16 }}>
            <span className="json-key">"{k}"</span>: <JsonTree value={v} indent={indent + 1} />
            {i < entries.length - 1 ? "," : ""}
          </div>
        ))}
        {"}"}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}
```

CSS classes to add to `index.css`:
```css
/* Light mode JSON tree */
.json-key   { color: #185fa5; }
.json-str   { color: #1d9e75; }
.json-num   { color: #854f0b; }
.json-bool  { color: #993556; }
.json-null  { color: var(--text-muted); }

/* Dark mode JSON tree (via .dark class or prefers-color-scheme) */
@media (prefers-color-scheme: dark) {
  .json-key  { color: #85b7eb; }
  .json-str  { color: #5dcaa5; }
  .json-num  { color: #ef9f27; }
  .json-bool { color: #ed93b1; }
}
```

### Markdown Renderer Component
```typescript
// Inside ResponseViewer.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function TextPart({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {text}
    </ReactMarkdown>
  );
}
```

### History Save from Frontend (fire-and-forget)
```typescript
// After task completes in useStreamingTask.ts or send_task wrapper
commands.saveHistory({
  agentId,
  skillName,
  requestJson: JSON.stringify(payload),
  responseJson: JSON.stringify(result),
  status: "completed",
  durationMs: latencyMs,
}).catch((err) => console.error("Failed to save history:", err));
// Don't await — don't block UI
```

### Workspace Store
```typescript
// src/stores/workspaceStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  workspaces: Array<{ id: string; name: string; createdAt: number }>;
  activeWorkspaceId: string;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: "default",
      loadWorkspaces: async () => { /* invoke list_workspaces */ },
      createWorkspace: async (name) => { /* invoke create_workspace */ },
      deleteWorkspace: async (id) => { /* invoke delete_workspace */ },
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: "a2a-workspace-state", partialize: (s) => ({ activeWorkspaceId: s.activeWorkspaceId }) }
  )
);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `tasks/send` / `tasks/sendSubscribe` | A2A spec v0.3+ uses `message/send` / `message/stream` | **Locked by CONTEXT.md** — use old method names, compatible with the example AIGC agent |
| Monaco loaded from CDN | Bundle locally via `loader.config({ monaco })` | Required for offline; already in STACK.md recommendation |
| `app.emit()` for streaming | Tauri `Channel<T>` | Channels are ordered + high-throughput; `emit()` is lossy under load |
| Stub settings.rs | Real SQLite `INSERT OR REPLACE INTO settings` | Phase 3 implements the real version |

---

## Open Questions

1. **Auth schemes field in AgentCard**
   - What we know: `AgentCard` Rust struct has no `authentication` or `security_schemes` field. The real A2A spec puts auth in the card.
   - What's unclear: What exact field name does the AIGC example agent use? (`authentication`? `securitySchemes`?)
   - Recommendation: Add `#[serde(default)] pub authentication: Option<serde_json::Value>` as a catch-all. Parse it in the frontend. If the field name is wrong, the dropdown will be empty — not a crash.

2. **File part upload handling for tasks**
   - What we know: The UI shows a drag-and-drop zone for file input mode. The request format for file parts is not defined in CONTEXT.md.
   - What's unclear: Does the A2A request include base64 file data inline, or a file URI?
   - Recommendation: Use base64 inline encoding for file parts: `{"type": "file", "data": "<base64>", "mimeType": "<type>"}`. Read file bytes with `tauri-plugin-fs`, encode in Rust, inject into request payload.

3. **Per-card settings storage key format**
   - What we know: Per-card settings (SETT-02) should be stored in the SQLite settings table.
   - What's unclear: Key naming convention (e.g., `card:{agent_id}:base_url_override`?).
   - Recommendation: Use key prefix `card:{agent_id}:{setting_name}`. This works with the existing key-value settings table without schema changes.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | vite.config.ts (`test: { environment: "jsdom", globals: true }`) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-02 | Monaco not imported at module level | unit | `npx vitest run src/__tests__/bundle-safety.test.ts` | ✅ exists |
| TEST-05 | send_task builds correct JSON-RPC payload | unit | `npx vitest run src/__tests__/a2a.test.ts` | ❌ Wave 0 |
| TEST-12 | generateCurlCommand produces correct curl string | unit | `npx vitest run src/__tests__/curl.test.ts` | ❌ Wave 0 |
| HIST-01 | saveHistory stores correct shape | unit | `npx vitest run src/__tests__/testStore.test.ts` | ❌ Wave 0 |
| SETT-01 | settings key-value round-trip | unit | `npx vitest run src/__tests__/settings.test.ts` | ❌ Wave 0 |
| TEST-09 | testStore status transitions | unit | `npx vitest run src/__tests__/testStore.test.ts` | ❌ Wave 0 |
| UIUX-03 | keyboard shortcuts fire correct handlers | unit | `npx vitest run src/__tests__/useKeyboardShortcuts.test.ts` | ❌ Wave 0 |
| WORK-01 | workspaceStore initializes with default | unit | `npx vitest run src/__tests__/workspaceStore.test.ts` | ❌ Wave 0 |
| TEST-06 | SSE streaming (Rust) | manual | Run against AIGC Service URL | N/A |
| TEST-08 | Markdown rendering output | manual | Visual inspection | N/A |
| UIUX-04 | Empty states visible when no agents | manual | Visual inspection | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/bundle-safety.test.ts` — Monaco boundary test
- **Per wave merge:** `npx vitest run` — full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/a2a.test.ts` — covers JSON-RPC payload builder (TEST-05, TEST-06)
- [ ] `src/__tests__/curl.test.ts` — covers curl command generation (TEST-12)
- [ ] `src/__tests__/testStore.test.ts` — covers task state machine (TEST-05, TEST-09, HIST-01)
- [ ] `src/__tests__/workspaceStore.test.ts` — covers WORK-01
- [ ] `src/__tests__/settings.test.ts` — covers SETT-01 key format
- [ ] `src/__tests__/useKeyboardShortcuts.test.ts` — covers UIUX-03

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src-tauri/src/db.rs`, `commands/agents.rs`, `state.rs`, `lib.rs`, `bindings.ts` — schema, patterns, installed deps verified directly
- Existing codebase: `src/__tests__/bundle-safety.test.ts` — Monaco lazy-load constraint verified directly
- `package.json` + `Cargo.toml` — all installed packages verified directly
- [v2.tauri.app/develop/calling-frontend/](https://v2.tauri.app/develop/calling-frontend/) — Channels vs emit() confirmed
- [docs.rs/reqwest-eventsource](https://docs.rs/reqwest-eventsource/latest/reqwest_eventsource/) — API verified

### Secondary (MEDIUM confidence)
- [a2aprotocol.ai/docs/guide/a2a-sample-methods-and-json-responses](https://a2aprotocol.ai/docs/guide/a2a-sample-methods-and-json-responses) — `message/send` format confirmed; note CONTEXT.md locks `tasks/send` (older spec compatible with example agent)
- [npmjs.com/@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react) — lazy loading pattern + `loader.config({ monaco })` for offline
- [remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) — v10 API with remarkPlugins/rehypePlugins

### Tertiary (LOW confidence)
- A2A auth schemes field naming — not definitively confirmed; using `serde_json::Value` catch-all as mitigation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against installed versions
- Architecture: HIGH — patterns established in Phase 1/2 and verified in existing code
- A2A protocol (tasks/send format): MEDIUM — locked by CONTEXT.md; CONTEXT.md takes precedence over current spec evolution
- Pitfalls: HIGH — most discovered from direct codebase inspection (bundle-safety test, get_pool pattern, Cargo features)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable stack; reqwest-eventsource and react-markdown APIs are stable)
