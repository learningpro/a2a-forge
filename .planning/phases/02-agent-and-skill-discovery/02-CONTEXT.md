# Phase 2: Agent and Skill Discovery - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Register A2A agents by URL, browse all skills with search and filtering, and manage the card library across sessions. This phase adds the agent CRUD operations and skill browser — no task execution or testing yet.

</domain>

<decisions>
## Implementation Decisions

### Card Add Flow
- User clicks "+ Add agent card" button in sidebar → modal/panel opens
- User enters base URL — debounced auto-fetch after 900ms of idle (matching mockup behavior)
- Preview box shows: loading spinner during fetch → agent name, version, protocol version, skill count, first few skill names on success → red error text on failure
- Error messages are descriptive: "Network error — check the URL", "Invalid JSON — not a valid agent card", "Schema mismatch — missing required fields"
- Optional nickname field below URL
- "Cancel" and "Add agent" buttons — Add enabled only after successful preview
- On add: save to SQLite agents table with card_json blob, assign to current workspace

### Skill Browser
- Left panel (240px default, resizable) shows skills for selected agent
- Header: agent name with "online" badge, base URL in monospace, search input
- Filter chips row: All | text | file | data — single-select, active chip uses info color (blue)
- Each skill item: name in JetBrains Mono, 2-line description (clamped), mode tags (colored badges: green=text, blue=file, amber=data)
- Skills with no examples show "No examples" badge
- Clicking a skill highlights it and opens test panel (test panel is Phase 3 — for now just show skill metadata)
- Search filters by name and description, case-insensitive

### Card Management
- Sidebar shows all cards in current workspace with: status dot (green=online, amber=warning, red=error), agent name, base URL, skill count
- Clicking a card selects it and populates skill panel
- Right-click or hover menu: Rename, Refresh, Delete
- Delete shows inline confirmation: "Delete [name]? This will remove all test history for this agent."
- Manual refresh re-fetches card from URL and updates card_json in SQLite
- Card detail view (optional side panel or modal): shows full card metadata — name, version, description, capabilities (streaming, pushNotifications, etc.), auth schemes, metadata grid

### Import/Export
- Export: saves all cards in current workspace as JSON array of {baseUrl, nickname, workspaceId}
- Import: reads JSON file, re-fetches each card from URL for freshness, adds to workspace
- Uses Tauri file dialog for save/open

### Rust Commands (A2A HTTP Client)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `A2A_Workbench_PRD.md` — FR-001 through FR-014 (card management + skill browser sections)
- `a2a_workbench_ui_mockup.html` — Sidebar, skill panel, add card modal, card detail panel — exact CSS and layout

### Phase 1 Foundation
- `src-tauri/src/db.rs` — SQLite schema (agents table structure, migrations)
- `src-tauri/src/state.rs` — AppState with reqwest::Client
- `src-tauri/src/error.rs` — AppError enum to extend
- `src-tauri/src/commands/` — Command module structure to follow
- `src/stores/agentStore.ts` — Existing agent store skeleton
- `src/components/layout/Sidebar.tsx` — Sidebar component to populate with real agent list
- `src/components/layout/SkillPanel.tsx` — Skill panel component to populate

### Research
- `.planning/research/ARCHITECTURE.md` — System architecture, data flow patterns
- `.planning/research/STACK.md` — Library versions and configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sidebar.tsx`: Placeholder sidebar with "Add agent card" button structure — needs real agent list
- `SkillPanel.tsx`: Placeholder skill panel with search box and filter chips — needs real skill data
- `agentStore.ts`: Zustand store skeleton with agents array and selectedAgentId — needs CRUD actions
- `uiStore.ts`: UI state store with theme, panel sizes — pattern to follow for new stores
- `AppState` (Rust): Has reqwest::Client ready for HTTP requests
- `db.rs`: Has agents table with columns: id, nickname, base_url, card_json, fetched_at, workspace_id

### Established Patterns
- Tauri commands in `src-tauri/src/commands/` with `mod.rs` re-exports
- Both `#[tauri::command]` and `#[specta::specta]` attributes on every command
- AppError with thiserror for typed errors returned from commands
- CSS custom properties for all styling — no hardcoded colors
- Zustand stores with TypeScript interfaces

### Integration Points
- Sidebar.tsx agent list → agentStore.agents → Rust list_agents command
- SkillPanel.tsx skill list → parsed from selected agent's card_json
- Add button → modal/panel → Rust fetch_agent_card + add_agent commands
- @tanstack/react-query for async data fetching from Tauri commands

</code_context>

<specifics>
## Specific Ideas

- The sidebar agent list must match the mockup exactly: status dot + agent name + base URL (monospace) + skill count
- Skill mode tags use the exact mockup colors: text=#e1f5ee/#0f6e56, file=#e6f1fb/#185fa5, data=#faeeda/#854f0b
- The "Add agent card" flow should match the mockup's preview box behavior — loading spinner, then card info, then error state
- Use the AIGC Service (https://aigc-service.echonlab.com) as the default example agent shown in empty states

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-agent-and-skill-discovery*
*Context gathered: 2026-03-24*
