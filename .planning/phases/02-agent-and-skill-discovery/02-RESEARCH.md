# Phase 2: Agent and Skill Discovery - Research

**Researched:** 2026-03-24
**Domain:** A2A agent card HTTP fetch, SQLite CRUD via tauri-plugin-sql, Tauri command authoring, Zustand store expansion, React UI (debounce, filter, search)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card Add Flow**
- User clicks "+ Add agent card" button in sidebar → modal/panel opens
- User enters base URL — debounced auto-fetch after 900ms of idle (matching mockup behavior)
- Preview box shows: loading spinner during fetch → agent name, version, protocol version, skill count, first few skill names on success → red error text on failure
- Error messages are descriptive: "Network error — check the URL", "Invalid JSON — not a valid agent card", "Schema mismatch — missing required fields"
- Optional nickname field below URL
- "Cancel" and "Add agent" buttons — Add enabled only after successful preview
- On add: save to SQLite agents table with card_json blob, assign to current workspace

**Skill Browser**
- Left panel (240px default, resizable) shows skills for selected agent
- Header: agent name with "online" badge, base URL in monospace, search input
- Filter chips row: All | text | file | data — single-select, active chip uses info color (blue)
- Each skill item: name in JetBrains Mono, 2-line description (clamped), mode tags (colored badges: green=text, blue=file, amber=data)
- Skills with no examples show "No examples" badge
- Clicking a skill highlights it and opens test panel (test panel is Phase 3 — for now just show skill metadata)
- Search filters by name and description, case-insensitive

**Card Management**
- Sidebar shows all cards in current workspace with: status dot (green=online, amber=warning, red=error), agent name, base URL, skill count
- Clicking a card selects it and populates skill panel
- Right-click or hover menu: Rename, Refresh, Delete
- Delete shows inline confirmation: "Delete [name]? This will remove all test history for this agent."
- Manual refresh re-fetches card from URL and updates card_json in SQLite
- Card detail view (optional side panel or modal): shows full card metadata — name, version, description, capabilities (streaming, pushNotifications, etc.), auth schemes, metadata grid

**Import/Export**
- Export: saves all cards in current workspace as JSON array of {baseUrl, nickname, workspaceId}
- Import: reads JSON file, re-fetches each card from URL for freshness, adds to workspace
- Uses Tauri file dialog for save/open

**Rust Commands (A2A HTTP Client)**
- `fetch_agent_card(base_url: String)` → fetches `{base_url}/.well-known/agent.json`, validates JSON, returns parsed AgentCard
- `add_agent(base_url, nickname, workspace_id)` → fetch + save to SQLite
- `delete_agent(agent_id)` → remove agent + cascade delete test_runs
- `refresh_agent(agent_id)` → re-fetch card, update card_json and fetched_at
- `list_agents(workspace_id)` → return all agents in workspace
- `import_agents(json_data)` / `export_agents(workspace_id)` → bulk operations
- All HTTP through reqwest in AppState — never from webview

### Claude's Discretion
- Exact modal vs inline panel design for "Add agent card"
- Animation/transition details
- Card detail view layout specifics
- Scroll behavior in skill list

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CARD-01 | User can add an agent card by entering a base URL (app fetches `{url}/.well-known/agent.json`) | fetch_agent_card Rust command using reqwest::Client from AppState; URL construction pattern documented below |
| CARD-02 | App displays loading state during fetch and descriptive error on failure | Preview box state machine (idle/fetching/success/error); AppError variants + frontend error mapping |
| CARD-03 | User can give a card a local nickname overriding the name field | nickname column in agents table (already exists in schema); optional field in add/rename flows |
| CARD-04 | Cards are persisted across sessions in SQLite | agents table + tauri-plugin-sql; list_agents called on load; agentStore hydration pattern |
| CARD-05 | User can delete a card with confirmation (removes associated test history) | delete_agent command; ON DELETE CASCADE on history table (already in schema); inline confirmation UI |
| CARD-06 | User can manually refresh a card to re-fetch latest version | refresh_agent command; context menu trigger; optimistic update in agentStore |
| CARD-07 | User can import/export cards as a JSON bundle | tauri-plugin-dialog (not yet installed); import_agents / export_agents commands; JSON array format |
| SKIL-01 | All skills in a card are listed showing name, description, input modes, output modes | Parse card_json in frontend; skill list rendering from AgentCard.skills array |
| SKIL-02 | Skills are searchable by name or description | Client-side filter in React; case-insensitive substring match on skill.name + skill.description |
| SKIL-03 | Skills can be filtered by input mode (text, file, data) and output mode | Single-select filter chip; filter against skill.inputModes array |
| SKIL-04 | Skills show a "No examples" badge when card provides no examples | Check skill.examples === undefined or length 0 |
| SKIL-05 | Clicking a skill opens the Skill Test Panel (Phase 3 stub: show metadata only) | selectedSkillId in agentStore; SkillPanel passes selection up to test panel area |
</phase_requirements>

---

## Summary

Phase 2 builds the agent registration and skill browsing core. The Rust side introduces a new `commands/agents.rs` module with six commands (fetch, add, delete, refresh, list, import/export) that use the existing `reqwest::Client` in `AppState` plus `tauri-plugin-sql` for persistence. The frontend expands `agentStore` from a skeleton to a full CRUD store, populates `Sidebar.tsx` with a real agent list, and makes `SkillPanel.tsx` data-driven.

The A2A `AgentCard` spec (latest 1.0 line) defines a stable, camelCase JSON structure. Key required fields are `name`, `url`, `version`, `capabilities`, `skills`, `defaultInputModes`, `defaultOutputModes`. Each skill has `id`, `name`, `description`, optional `tags`, `inputModes`, `outputModes`, `examples`. Validation can be done with simple field-presence checks in Rust — no external schema crate needed at this stage.

One net-new dependency is `tauri-plugin-dialog` for the import/export file picker. Everything else (reqwest, tauri-plugin-sql, uuid, serde_json, Zustand, vitest) is already installed. The debounce for the URL preview field is implemented with `useEffect` + `setTimeout`/`clearTimeout` — no external library required.

**Primary recommendation:** Build agents.rs commands first (Rust compilation is the long pole), then expand agentStore with typed bindings, then wire the UI components.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| reqwest | 0.12 | HTTP GET for `/.well-known/agent.json` | Already in AppState; `json` feature enabled |
| tauri-plugin-sql | 2.x | SQLite INSERT/SELECT/DELETE for agents table | Already wired with migrations; agents table in Migration 2 |
| serde / serde_json | 1 | Deserialize AgentCard JSON into Rust structs | Already in Cargo.toml; needed for typed returns |
| uuid | 1 (v4 feature) | Generate agent row IDs | Already in Cargo.toml |
| tauri-specta + specta | rc.21 / rc.22 | Type-safe command bindings to TypeScript | Already wired in lib.rs; MUST add new commands to collect_commands! |
| zustand | 5.0.12 | agentStore CRUD actions | Already installed; expand existing skeleton |
| vitest | 2.x | Unit tests for stores and filter logic | Already configured in vite.config.ts (jsdom environment) |

### Net-New Dependency

| Library | Install | Purpose | Notes |
|---------|---------|---------|-------|
| tauri-plugin-dialog | `cargo add tauri-plugin-dialog@2` + `npm install @tauri-apps/plugin-dialog` | Native file save/open dialogs for import/export | Official Tauri plugin; NOT yet in Cargo.toml or package.json |

**Installation:**
```bash
# Rust
cargo add tauri-plugin-dialog@2

# JavaScript
npm install @tauri-apps/plugin-dialog

# Register in lib.rs (add to Builder chain):
.plugin(tauri_plugin_dialog::init())

# Add to capabilities/default.json:
"dialog:allow-open",
"dialog:allow-save"
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tauri-plugin-dialog | Custom Rust file I/O via tokio::fs | Plugin gives native OS picker UI; custom I/O would need a path from somewhere |
| Client-side debounce with setTimeout | lodash debounce / use-debounce | No dependency needed for 1 use case; raw setTimeout is sufficient |
| JSON field-presence validation in Rust | jsonschema crate | Adds compile weight; simple field checks are adequate for required AgentCard fields |

---

## Architecture Patterns

### Recommended File Structure for Phase 2

```
src-tauri/src/
├── commands/
│   ├── mod.rs          # ADD: pub mod agents;
│   ├── settings.rs     # Existing (stub)
│   └── agents.rs       # NEW: 6 commands
├── a2a/
│   ├── mod.rs          # NEW
│   └── types.rs        # NEW: AgentCard, Skill Rust structs

src/
├── stores/
│   └── agentStore.ts   # EXPAND: full CRUD actions + agents array
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # EXPAND: real agent list
│   │   └── SkillPanel.tsx      # EXPAND: real skill list
│   └── agent/
│       ├── AddAgentDialog.tsx  # NEW: URL input + preview box
│       ├── AgentListItem.tsx   # NEW: single sidebar row
│       └── AgentContextMenu.tsx # NEW: rename/refresh/delete menu
```

### Pattern 1: A2A AgentCard Rust Types (serde)

**What:** Define Rust structs mirroring the A2A JSON schema. Use `serde(rename_all = "camelCase")` since the A2A spec mandates camelCase field names.

**When to use:** Every Rust command that touches agent data.

```rust
// src-tauri/src/a2a/types.rs
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentCard {
    pub name: String,
    pub description: Option<String>,
    pub url: String,
    pub version: String,
    pub protocol_version: Option<String>,   // field may be absent in older agents
    pub capabilities: AgentCapabilities,
    pub skills: Vec<AgentSkill>,
    pub default_input_modes: Vec<String>,
    pub default_output_modes: Vec<String>,
    pub provider: Option<AgentProvider>,
    pub documentation_url: Option<String>,
    // Store raw JSON for fields we don't model (auth schemes, extensions)
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentCapabilities {
    pub streaming: Option<bool>,
    pub push_notifications: Option<bool>,
    pub state_transition_history: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentSkill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub input_modes: Option<Vec<String>>,
    pub output_modes: Option<Vec<String>>,
    pub examples: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AgentProvider {
    pub organization: Option<String>,
    pub url: Option<String>,
}

/// Row returned to the frontend — combines DB metadata with parsed card
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentRow {
    pub id: String,
    pub url: String,
    pub nickname: Option<String>,
    pub card: AgentCard,
    pub last_fetched_at: i64,
    pub workspace_id: String,
}
```

**Pitfall:** `#[serde(flatten)]` on an `extra` field captures all unknown fields but requires the parent struct to NOT use `deny_unknown_fields`. Never add `#[serde(deny_unknown_fields)]` to `AgentCard` — the A2A spec is extensible and real agents add custom fields.

### Pattern 2: Rust Commands in agents.rs

**What:** Six commands following the exact pattern from `settings.rs` — dual `#[tauri::command]` + `#[specta::specta]` attributes, `async`, return `Result<T, AppError>`.

```rust
// src-tauri/src/commands/agents.rs
use crate::{a2a::types::{AgentCard, AgentRow}, error::AppError, state::AppState};
use tauri_plugin_sql::DbPool;   // acquired via tauri::State<tauri_plugin_sql::DbPool>

#[tauri::command]
#[specta::specta]
pub async fn fetch_agent_card(
    base_url: String,
    state: tauri::State<'_, AppState>,
) -> Result<AgentCard, AppError> {
    let url = format!("{}/.well-known/agent.json", base_url.trim_end_matches('/'));
    let resp = state.http_client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::Http(format!("Network error — check the URL: {e}")))?;

    if !resp.status().is_success() {
        return Err(AppError::Http(format!(
            "HTTP {} from agent endpoint", resp.status()
        )));
    }

    let card: AgentCard = resp.json().await
        .map_err(|e| {
            if e.is_decode() {
                AppError::Serialization("Invalid JSON — not a valid agent card".to_string())
            } else {
                AppError::Serialization(format!("Schema mismatch — missing required fields: {e}"))
            }
        })?;

    Ok(card)
}

#[tauri::command]
#[specta::specta]
pub async fn add_agent(
    base_url: String,
    nickname: Option<String>,
    workspace_id: String,
    // tauri-plugin-sql provides pool via managed state
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
    state: tauri::State<'_, AppState>,
) -> Result<AgentRow, AppError> { ... }

#[tauri::command]
#[specta::specta]
pub async fn list_agents(
    workspace_id: String,
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
) -> Result<Vec<AgentRow>, AppError> { ... }

#[tauri::command]
#[specta::specta]
pub async fn delete_agent(
    agent_id: String,
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
) -> Result<(), AppError> { ... }

#[tauri::command]
#[specta::specta]
pub async fn refresh_agent(
    agent_id: String,
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
    state: tauri::State<'_, AppState>,
) -> Result<AgentRow, AppError> { ... }

#[tauri::command]
#[specta::specta]
pub async fn import_agents(
    json_data: String,
    workspace_id: String,
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AgentRow>, AppError> { ... }

#[tauri::command]
#[specta::specta]
pub async fn export_agents(
    workspace_id: String,
    db: tauri::State<'_, tauri_plugin_sql::DbPool>,
) -> Result<String, AppError> { ... }
```

**Critical:** After adding these to `agents.rs`, update both:
1. `commands/mod.rs` → `pub mod agents;`
2. `lib.rs` → add all 6 to `collect_commands![...]`

Missing step 2 causes silent failures (commands unreachable from frontend with no build error).

### Pattern 3: tauri-plugin-sql Usage in Rust Commands

**What:** `tauri-plugin-sql` exposes a `DbPool` managed state. Commands receive it via `tauri::State<'_, tauri_plugin_sql::DbPool>` and execute queries using the `sqlx` API underneath.

```rust
use tauri_plugin_sql::DbPool;

// SELECT: list agents
pub async fn list_agents_impl(
    workspace_id: &str,
    db: &DbPool,
) -> Result<Vec<AgentRow>, AppError> {
    let rows = sqlx::query!(
        "SELECT id, url, nickname, card_json, last_fetched_at, workspace_id
         FROM agents WHERE workspace_id = ? ORDER BY rowid ASC",
        workspace_id
    )
    .fetch_all(db.get::<sqlx::Sqlite>())
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    rows.into_iter()
        .map(|r| {
            let card: AgentCard = serde_json::from_str(&r.card_json)
                .map_err(|e| AppError::Serialization(e.to_string()))?;
            Ok(AgentRow {
                id: r.id,
                url: r.url,
                nickname: r.nickname,
                card,
                last_fetched_at: r.last_fetched_at,
                workspace_id: r.workspace_id,
            })
        })
        .collect()
}

// INSERT: add agent
sqlx::query!(
    "INSERT INTO agents (id, url, nickname, card_json, last_fetched_at, workspace_id)
     VALUES (?, ?, ?, ?, ?, ?)",
    id, base_url, nickname, card_json_str, now_unix, workspace_id
)
.execute(db.get::<sqlx::Sqlite>())
.await
.map_err(|e| AppError::Database(e.to_string()))?;

// DELETE (cascade handled by schema ON DELETE CASCADE)
sqlx::query!("DELETE FROM agents WHERE id = ?", agent_id)
    .execute(db.get::<sqlx::Sqlite>())
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
```

**Note on DbPool access:** `tauri-plugin-sql` version 2 exposes the pool as managed state with key `"sqlite:workbench.db"`. Use `db.get::<sqlx::Sqlite>()` for the pool reference. Check crate docs if the API differs — the exact method name may vary by minor version.

### Pattern 4: Expanded agentStore (Zustand)

**What:** Replace the skeleton agentStore with a full CRUD store. Skills are derived in-memory from the selected agent's `card.skills` — no separate store.

```typescript
// src/stores/agentStore.ts
import { create } from "zustand";
import { commands } from "../bindings";
import type { AgentRow } from "../bindings";

interface AgentState {
  agents: AgentRow[];
  selectedAgentId: string | null;
  selectedSkillId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAgents: (workspaceId: string) => Promise<void>;
  addAgent: (baseUrl: string, nickname: string | null, workspaceId: string) => Promise<AgentRow>;
  deleteAgent: (agentId: string) => Promise<void>;
  refreshAgent: (agentId: string) => Promise<void>;
  renameAgent: (agentId: string, nickname: string) => Promise<void>;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedSkillId: (id: string | null) => void;

  // Derived selectors (compute in component or store)
  selectedAgent: () => AgentRow | null;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: [],
  selectedAgentId: null,
  selectedSkillId: null,
  isLoading: false,
  error: null,

  loadAgents: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const agents = await commands.listAgents(workspaceId);
      set({ agents, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addAgent: async (baseUrl, nickname, workspaceId) => {
    const agent = await commands.addAgent(baseUrl, nickname, workspaceId);
    set((s) => ({ agents: [...s.agents, agent] }));
    return agent;
  },

  deleteAgent: async (agentId) => {
    await commands.deleteAgent(agentId);
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== agentId),
      selectedAgentId: s.selectedAgentId === agentId ? null : s.selectedAgentId,
    }));
  },

  refreshAgent: async (agentId) => {
    const updated = await commands.refreshAgent(agentId);
    set((s) => ({
      agents: s.agents.map((a) => (a.id === agentId ? updated : a)),
    }));
  },

  setSelectedAgentId: (id) => set({ selectedAgentId: id, selectedSkillId: null }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),

  selectedAgent: () => {
    const { agents, selectedAgentId } = get();
    return agents.find((a) => a.id === selectedAgentId) ?? null;
  },
}));
```

### Pattern 5: Debounced URL Preview (No External Library)

**What:** 900ms debounce on URL input to trigger `fetch_agent_card`. Implemented with `useEffect` + `clearTimeout` — no lodash or use-debounce needed.

```typescript
// Inside AddAgentDialog.tsx
const [url, setUrl] = useState("");
const [preview, setPreview] = useState<
  { state: "idle" } |
  { state: "fetching" } |
  { state: "success"; card: AgentCard } |
  { state: "error"; message: string }
>({ state: "idle" });

useEffect(() => {
  if (!url.trim()) {
    setPreview({ state: "idle" });
    return;
  }
  setPreview({ state: "fetching" });
  const timer = setTimeout(async () => {
    try {
      const card = await commands.fetchAgentCard(url.trim());
      setPreview({ state: "success", card });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPreview({ state: "error", message: err.message ?? "Unknown error" });
    }
  }, 900);
  return () => clearTimeout(timer);
}, [url]);
```

### Pattern 6: Skill Filter and Search (Client-Side)

**What:** Skills are parsed from `selectedAgent.card.skills` in the component. Filter and search run client-side — no backend query needed.

```typescript
// Inside SkillPanel.tsx or a useMemo hook
const skills = selectedAgent?.card.skills ?? [];
const activeFilter = useAgentStore((s) => s.skillFilter); // "all"|"text"|"file"|"data"
const searchQuery = useAgentStore((s) => s.skillSearch);

const filteredSkills = useMemo(() => {
  let result = skills;

  if (activeFilter !== "all") {
    result = result.filter((skill) =>
      (skill.inputModes ?? []).some((m) => m.includes(activeFilter)) ||
      (skill.outputModes ?? []).some((m) => m.includes(activeFilter))
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (skill) =>
        skill.name.toLowerCase().includes(q) ||
        (skill.description ?? "").toLowerCase().includes(q)
    );
  }

  return result;
}, [skills, activeFilter, searchQuery]);
```

**Note:** `skillFilter` and `skillSearch` can live in `uiStore` (they're UI state, not domain state) or inline component state — both are valid. Using component state is simpler and avoids store coupling.

### Pattern 7: Import/Export with tauri-plugin-dialog

**What:** Export calls `commands.exportAgents(workspaceId)` to get a JSON string, then uses `save()` from `@tauri-apps/plugin-dialog` to get a file path, then writes via a Rust command. Import uses `open()` to get a file path, reads via Rust command, then calls `commands.importAgents(jsonData, workspaceId)`.

```typescript
import { save, open } from "@tauri-apps/plugin-dialog";
import { commands } from "../bindings";

async function handleExport(workspaceId: string) {
  const filePath = await save({
    defaultPath: "agents-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!filePath) return; // user cancelled
  const jsonData = await commands.exportAgents(workspaceId);
  await commands.writeFile(filePath, jsonData); // helper command or use tauri-plugin-fs
}

async function handleImport(workspaceId: string) {
  const filePath = await open({
    filters: [{ name: "JSON", extensions: ["json"] }],
    multiple: false,
  });
  if (!filePath || Array.isArray(filePath)) return;
  const jsonData = await commands.readFile(filePath); // read via Rust
  const imported = await commands.importAgents(jsonData, workspaceId);
  useAgentStore.getState().loadAgents(workspaceId); // reload
}
```

**Alternative:** Use `tauri-plugin-fs` for file read/write, or handle entirely in Rust by passing the path to `import_agents(file_path)` and reading the file there. The all-Rust approach is cleaner — avoids adding `tauri-plugin-fs` dependency.

**Recommended approach:** Pass the file path to Rust. `import_agents(file_path, workspace_id)` reads the file with `tokio::fs::read_to_string`, parses JSON, fetches each card, saves. `export_agents(workspace_id, file_path)` fetches DB rows, serializes, writes with `tokio::fs::write`.

### Anti-Patterns to Avoid

- **Normalizing skills into their own SQLite table:** Skills are display-only derived data parsed from `card_json`. Adding a `skills` table would require schema migrations every time the A2A spec adds fields. Keep them in the JSON blob.
- **Calling `fetch_agent_card` on every keystroke:** The 900ms debounce is mandatory. Without it, users typing slowly will saturate the agent endpoint.
- **Using `serde(deny_unknown_fields)` on AgentCard:** A2A agents add custom fields. This would break deserialization for real agents.
- **Doing the file read in the webview then passing bytes to Rust:** Webview can't read arbitrary file paths. Pass the path string to Rust and let Rust read the file.
- **Forgetting to register new commands in `collect_commands![]`:** The most common Phase 2 bug. Build succeeds but commands silently fail on invoke.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File save/open picker | Custom file path input | `tauri-plugin-dialog` | OS-native dialog, correct permissions, sandboxed |
| UUID generation | Custom ID scheme | `uuid` crate v4 (already installed) | Collision-free, already present |
| HTTP client | `reqwest::Client::new()` per command | `AppState.http_client.clone()` | Connection pool reuse; avoid TLS handshake per request |
| Agent status check | Background polling loop | On-demand: compute from `last_fetched_at` age, set `dot-amber` if > 1 hour | Polling wastes resources; status dot is cosmetic, not live health |
| Skill search | Fuzzy matching library | `.to_lowercase().contains()` | Skills list is small (< 50 items); substring is sufficient and spec-correct |
| JSON schema validation | `jsonschema` crate | Serde deserialization errors | Serde already validates structure; add custom checks only for required fields |

**Key insight:** The agents table schema is already designed for blob storage of card JSON. Lean into that — parse in Rust when needed for DB queries, parse in TypeScript for display. Don't normalize.

---

## Common Pitfalls

### Pitfall 1: Missing `collect_commands![]` Registration
**What goes wrong:** New Rust commands compile fine but return "command not found" on invoke from the frontend. No build error.
**Why it happens:** `lib.rs` builds the invoke handler once at startup from `collect_commands![]`. Commands added to `agents.rs` but not to the macro are invisible.
**How to avoid:** Always update `lib.rs` `collect_commands![]` immediately after adding a new command function. Add all 6 agents commands in a single step.
**Warning signs:** `tauri::Error::CommandNotFound` in console; TypeScript types in `bindings.ts` don't include the new command.

### Pitfall 2: Missing capabilities/default.json Permission for Dialog Plugin
**What goes wrong:** `open()` or `save()` dialog silently returns `null` without OS dialog appearing. No error thrown.
**Why it happens:** Tauri 2 ACL starts at zero. The dialog plugin requires explicit `dialog:allow-open` and `dialog:allow-save` permissions.
**How to avoid:** Add permissions to `capabilities/default.json` when adding the dialog plugin. Verify by checking if `null` is returned vs a real path.
**Warning signs:** Dialog function returns immediately with `null`; no OS file picker appears.

### Pitfall 3: A2A URL Base URL Normalization
**What goes wrong:** User enters `http://localhost:8080/` (trailing slash) → fetch URL becomes `http://localhost:8080//.well-known/agent.json` (double slash). Some servers reject this.
**Why it happens:** String concatenation without normalization.
**How to avoid:** `let url = format!("{}/.well-known/agent.json", base_url.trim_end_matches('/'));`
**Warning signs:** Fetch succeeds in browser but returns 404 from Rust.

### Pitfall 4: `serde_json::Value::flatten` with `extra` Field
**What goes wrong:** Compile error or unexpected behavior when using `#[serde(flatten)]` on a `Map<String, Value>` field alongside `rename_all`.
**Why it happens:** `flatten` and `rename_all` interact — the flattened map keys don't get renamed, which is the desired behavior for the `extra` field.
**How to avoid:** Test deserialization of a real A2A card JSON in a unit test before relying on the struct in production. If `flatten` causes issues, store `card_json: serde_json::Value` instead of a typed struct and access fields via `.get("name")`.
**Warning signs:** Fields present in JSON are missing from deserialized struct.

### Pitfall 5: DbPool Access Pattern in tauri-plugin-sql v2
**What goes wrong:** `tauri::State<'_, tauri_plugin_sql::DbPool>` compiles but panics at runtime because the pool isn't registered under that type.
**Why it happens:** `tauri-plugin-sql` v2 registers pools keyed by database URL string, not as a direct `DbPool` managed state in some versions.
**How to avoid:** Follow the official plugin docs for v2 pool access. One safe pattern: use `tauri_plugin_sql::DbPool` type obtained from `app.state::<tauri_plugin_sql::DbPool>()` in the setup closure, or use the JS-side plugin API for simpler queries if the Rust API proves tricky.
**Alternative safe approach:** Since `tauri-plugin-sql` is designed for JS-side queries, consider running all DB operations from a Rust command that uses `sqlx::SqlitePool` obtained via the plugin's `get_pool` helper. Verify the exact API against the crate docs before writing DB code.
**Warning signs:** Runtime panic on first DB command invocation.

### Pitfall 6: Specta Type Derivation on AgentCard with `serde(flatten)`
**What goes wrong:** `#[derive(Type)]` from specta fails to compile or generates incorrect TypeScript for a struct with `#[serde(flatten)]`.
**Why it happens:** Specta's type generation and serde's flatten don't always align — specta may not support flattened `serde_json::Map` fields.
**How to avoid:** If `extra: serde_json::Map<String, serde_json::Value>` causes specta issues, remove the `extra` field and use `#[serde(deny_unknown_fields)]` only if you have control over all agents. Better: keep `AgentCard` as `serde_json::Value` in the DB (stored as string), deserialize to a strict struct only for the fields you need, and return a separate DTO struct to the frontend.
**Warning signs:** Compile error in specta type derivation; TypeScript bindings don't generate.

---

## Code Examples

Verified patterns from project codebase and official sources:

### Existing Command Pattern (copy exactly from settings.rs)
```rust
// Source: src-tauri/src/commands/settings.rs
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn get_settings() -> Result<serde_json::Value, AppError> {
    Ok(serde_json::json!({"theme": "system"}))
}
```

### Registering New Commands in lib.rs
```rust
// Source: src-tauri/src/lib.rs (existing pattern, extend it)
let builder = Builder::<tauri::Wry>::new()
    .commands(collect_commands![
        commands::settings::get_settings,
        commands::settings::save_settings,
        // ADD ALL 6:
        commands::agents::fetch_agent_card,
        commands::agents::add_agent,
        commands::agents::list_agents,
        commands::agents::delete_agent,
        commands::agents::refresh_agent,
        commands::agents::import_agents,
        commands::agents::export_agents,
    ]);
```

### CSS Custom Properties for Mode Tags (exact mockup values)
```css
/* light mode — from a2a_workbench_ui_mockup.html */
.mode-text { background: #e1f5ee; color: #0f6e56; }
.mode-file { background: #e6f1fb; color: #185fa5; }
.mode-data { background: #faeeda; color: #854f0b; }

/* dark mode overrides */
.mode-text { background: #04342c; color: #5dcaa5; }
.mode-file { background: #042c53; color: #85b7eb; }
.mode-data { background: #412402; color: #ef9f27; }
```

In React using inline styles with CSS custom properties:
```typescript
const MODE_STYLES: Record<string, React.CSSProperties> = {
  text: { background: "var(--bg-success)", color: "var(--text-success)" },
  file: { background: "var(--bg-info)", color: "var(--text-info)" },
  data: { background: "var(--bg-warning)", color: "var(--text-warning)" },
};
```

### Agent Sidebar Item (exact mockup structure)
```typescript
// Matches mockup: dot + name + url (monospace) + skill count
<div className="agent-item" style={{
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "0.5px solid transparent",
  background: isActive ? "var(--bg-primary)" : "transparent",
  borderColor: isActive ? "var(--border-default)" : "transparent",
}}>
  <div style={{
    width: 8, height: 8, borderRadius: "50%",
    background: status === "online" ? "#1D9E75" : status === "warning" ? "#EF9F27" : "#E24B4A",
    flexShrink: 0,
  }} />
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {agent.nickname ?? agent.card.name}
    </div>
    <div style={{ fontSize: 10, color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {new URL(agent.url).host}
    </div>
  </div>
  <div style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
    {agent.card.skills.length}
  </div>
</div>
```

### Skill Item (exact mockup structure)
```typescript
<div style={{
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  border: `0.5px solid ${isActive ? "var(--border-default)" : "transparent"}`,
  background: isActive ? "var(--bg-secondary)" : "transparent",
}}>
  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)",
                fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
    {skill.name}
  </div>
  <div style={{
    fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  }}>
    {skill.description ?? "No description"}
  </div>
  <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
    {(skill.inputModes ?? []).map((mode) => (
      <span key={mode} style={{
        fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 500,
        fontFamily: "'JetBrains Mono', monospace",
        ...getModeStyle(mode),
      }}>{mode}</span>
    ))}
    {(!skill.examples || skill.examples.length === 0) && (
      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4,
                     background: "var(--bg-secondary)", color: "var(--text-muted)",
                     border: "0.5px solid var(--border-subtle)" }}>
        No examples
      </span>
    )}
  </div>
</div>
```

### Preview Box State Machine
```typescript
type PreviewState =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "success"; card: AgentCard }
  | { status: "error"; message: string };

// Preview box rendering
{preview.status === "fetching" && (
  <div style={{ display: "flex", alignItems: "center", gap: 8,
                fontSize: 11, color: "var(--text-muted)" }}>
    <div className="spinner" /> {/* CSS animation: border spin */}
    Fetching agent card…
  </div>
)}
{preview.status === "success" && (
  <div>
    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
      {preview.card.name}
    </div>
    <div style={{ fontSize: 10, color: "var(--text-muted)",
                  fontFamily: "monospace" }}>
      v{preview.card.version} · {preview.card.skills.length} skills
    </div>
  </div>
)}
{preview.status === "error" && (
  <div style={{ fontSize: 11, color: "#e24b4a" }}>
    {preview.message}
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tauri::generate_handler![]` directly | `tauri-specta` `collect_commands![]` + `builder.invoke_handler()` | Phase 1 established | Type-safe bindings auto-generated in bindings.ts |
| Single invoke_handler call | Builder pattern in lib.rs | Phase 1 established | Do not call invoke_handler multiple times |
| Manual debounce with external library | Raw `useEffect` + `setTimeout` | Always preferred in Tauri apps | No extra dependency; sufficient for 1 use |

**Deprecated/outdated:**
- `tauri::generate_handler![]` — still works but bypasses specta type generation. Never use directly in this project.
- `ts::builder()` pattern — was rc.20 API; project uses `Builder::<Wry>::new()` (confirmed in lib.rs).

---

## Open Questions

1. **tauri-plugin-sql DbPool Rust API**
   - What we know: Plugin is installed; JS side works for settings stub.
   - What's unclear: The exact Rust-side API for obtaining a pool reference in command functions. The v2 plugin may require `app.state::<DbPool>()` in setup or a different pattern than `tauri::State<'_, DbPool>`.
   - Recommendation: Read `tauri-plugin-sql` v2 crate source or docs before writing DB commands. If the Rust API is awkward, all DB queries can be done from JS side using `@tauri-apps/plugin-sql` — the architecture supports either approach.

2. **Agent "online" Status Dot**
   - What we know: Mockup shows green/amber/red dots. No polling mechanism is planned.
   - What's unclear: What determines dot color in Phase 2? Options: always green after add, amber if `last_fetched_at` > 1 hour ago, red if last refresh failed.
   - Recommendation: Store a `last_error: Option<String>` field (or derive from `last_fetched_at` age). Use amber for > 1 hour stale, green otherwise, red only after a failed refresh. Do not implement background polling in Phase 2.

3. **Context Menu Implementation**
   - What we know: Right-click or hover menu for Rename/Refresh/Delete.
   - What's unclear: No context menu library is installed. Options: CSS hover-reveal button row, HTML5 `contextmenu` event with absolute-positioned div, or browser's native context menu.
   - Recommendation: Use a hover-revealed action row (three icon buttons that appear on `.agent-item:hover`) — simplest, no new library needed, matches the mockup's spirit.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vite.config.ts` → `test: { environment: "jsdom", globals: true }` |
| Quick run command | `npm test -- --reporter=verbose src/stores/agentStore.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | fetch_agent_card constructs correct URL and parses response | unit (Rust) | `cargo test -p a2a-workbench agents::tests` | ❌ Wave 0 |
| CARD-02 | Preview state machine transitions idle→fetching→success/error | unit (TS) | `npm test -- src/components/agent/AddAgentDialog.test.tsx` | ❌ Wave 0 |
| CARD-03 | Nickname overrides card name in agent list display | unit (TS) | `npm test -- src/stores/agentStore.test.ts` | ❌ Wave 0 |
| CARD-04 | list_agents returns persisted agents after add | integration | `cargo test -p a2a-workbench agents::tests::test_list_agents` | ❌ Wave 0 |
| CARD-05 | delete_agent removes from store; selectedAgentId resets | unit (TS) | `npm test -- src/stores/agentStore.test.ts` | ❌ Wave 0 |
| CARD-06 | refresh_agent updates the agent in store | unit (TS) | `npm test -- src/stores/agentStore.test.ts` | ❌ Wave 0 |
| CARD-07 | export produces valid JSON; import re-fetches and adds | unit (Rust) | `cargo test -p a2a-workbench agents::tests::test_export_import` | ❌ Wave 0 |
| SKIL-01 | Skills render from card_json for selected agent | unit (TS) | `npm test -- src/components/layout/SkillPanel.test.tsx` | ❌ Wave 0 |
| SKIL-02 | Search filters by name and description case-insensitively | unit (TS) | `npm test -- src/components/layout/SkillPanel.test.tsx` | ❌ Wave 0 |
| SKIL-03 | Filter chip narrows skills to matching input mode | unit (TS) | `npm test -- src/components/layout/SkillPanel.test.tsx` | ❌ Wave 0 |
| SKIL-04 | No-examples badge appears when skill.examples is empty | unit (TS) | `npm test -- src/components/layout/SkillPanel.test.tsx` | ❌ Wave 0 |
| SKIL-05 | Clicking skill sets selectedSkillId in agentStore | unit (TS) | `npm test -- src/stores/agentStore.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/stores/agentStore.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/stores/agentStore.test.ts` — covers CARD-03, CARD-05, CARD-06, SKIL-05
- [ ] `src/components/agent/AddAgentDialog.test.tsx` — covers CARD-02
- [ ] `src/components/layout/SkillPanel.test.tsx` — covers SKIL-01, SKIL-02, SKIL-03, SKIL-04
- [ ] `src-tauri/src/commands/agents.rs` (with `#[cfg(test)]` module) — covers CARD-01, CARD-04, CARD-07
- [ ] Rust test fixtures: sample `agent.json` response for mock server or direct serde tests

---

## Sources

### Primary (HIGH confidence)
- Project codebase — `src-tauri/src/`, `src/stores/`, `src/components/layout/` — direct inspection
- `a2a_workbench_ui_mockup.html` — exact CSS custom properties and layout measurements
- `src-tauri/src/db.rs` — confirmed agents table schema (Migration 2)
- `src-tauri/Cargo.toml` — confirmed installed crates; `reqwest` has `json` feature, uuid has `v4`
- `package.json` — confirmed vitest, @testing-library/react, jsdom already installed
- `vite.config.ts` — confirmed vitest jsdom environment

### Secondary (MEDIUM confidence)
- [a2a-protocol.org/latest/specification/](https://a2a-protocol.org/latest/specification/) — AgentCard field names and camelCase requirement
- [agent2agent.info/docs/concepts/agentcard/](https://agent2agent.info/docs/concepts/agentcard/) — AgentSkill fields confirmed
- [v2.tauri.app/plugin/dialog/](https://v2.tauri.app/plugin/dialog/) — tauri-plugin-dialog API, open/save functions, permission names

### Tertiary (LOW confidence)
- tauri-plugin-sql v2 Rust-side DbPool API — not directly verified; exact method name for pool access in Rust commands needs validation against crate source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed in Cargo.toml / package.json except tauri-plugin-dialog (not yet installed)
- Architecture: HIGH — follows Phase 1 patterns directly observed in source code
- A2A AgentCard types: MEDIUM — fields confirmed via spec docs; `serde(flatten)` + specta interaction is LOW confidence and flagged
- Pitfalls: HIGH — derived from direct code inspection and known Tauri 2 patterns

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable libraries; A2A spec is evolving but AgentCard schema is stable in 1.0 line)
