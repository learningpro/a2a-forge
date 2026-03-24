# Phase 3: Task Execution and Testing - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Full test workflow: compose and send test messages to any skill with adaptive input, see real-time results including SSE streaming, view response parts natively, manage test history, save/re-run test cases, copy curl commands, configure workspaces and settings, keyboard shortcuts, and empty states guiding new users. This is the final phase completing all v1 features.

</domain>

<decisions>
## Implementation Decisions

### Test Input Panel (Left Column)
- Tab row: message | context data | headers — matching mockup exactly
- "message" tab: multi-line textarea for text mode input
- "context data" tab: Monaco JSON editor with syntax highlighting for data mode
- "headers" tab: key-value editor for custom request headers (Bearer tokens, API keys)
- File input: drag-and-drop zone when skill has file inputMode — shows filename after selection
- Input area adapts based on selected skill's inputModes
- Examples section below input: clickable chips that populate the input textarea
- Auth row at bottom: dropdown populated from card's auth schemes + credential values from keychain

### Task Execution
- "Run" button sends tasks/send JSON-RPC to agent endpoint via Rust command
- Request format: `{"jsonrpc": "2.0", "method": "tasks/send", "params": {"id": "<uuid>", "message": {"role": "user", "parts": [{"type": "text", "text": "..."}]}, "metadata": {"skill_id": "..."}}, "id": 1}`
- Real-time status indicator: green dot + "Run" → amber dot + "Running…" → green dot + "Run" on completion
- Status badge updates: submitted → working → completed/failed/canceled
- Latency displayed in ms
- Task ID shown in response area

### SSE Streaming
- When agent advertises `streaming: true` in capabilities, use tasks/sendSubscribe instead of tasks/send
- Rust SSE consumer: reqwest-eventsource crate consuming SSE events
- Forward chunks to frontend via Tauri Channel (ordered, scoped to caller)
- Frontend incrementally appends response parts as they arrive
- Status badge updates in real-time as SSE events arrive

### Response Viewer (Right Column)
- Two tabs: "rendered" (default) | "raw json"
- Status bar at top: status pill (completed=green, failed=red, working=amber) + latency + tab toggle
- Rendered view:
  - Task ID row in monospace
  - Message bubbles with role label ("agent · part[0] · text/plain")
  - Text parts rendered as markdown
  - File parts rendered as download links
  - Data parts rendered as formatted JSON
- Raw JSON view: full JSON-RPC response in syntax-highlighted collapsible tree
- JSON tree colors: keys=blue (#185fa5), strings=green (#1d9e75), numbers=amber (#854f0b), booleans=pink (#993556)
- Dark mode JSON colors: keys=#85b7eb, strings=#5dcaa5, numbers=#ef9f27, booleans=#ed93b1

### Curl Export
- "curl" button in test header generates equivalent curl command
- Copies to clipboard with notification
- Format: `curl -X POST {url}/a2a -H "Content-Type: application/json" -H "{auth_header}" -d '{json_rpc_body}'`

### Test History
- All executions saved to SQLite test_runs table: timestamp, skill_id, agent_id, request_payload (JSON blob), response_payload (JSON blob), latency_ms, status
- History browsable in a panel/view — list with search
- Each history item shows: timestamp, skill name, status badge, latency
- Click history item to view full request/response
- Clear history: per agent or globally, with confirmation

### Saved Test Cases
- "save" button on any request/response pair → prompts for name
- Saved to SQLite test_cases table with: name, agent_id, skill_id, request_payload
- Saved tests shown as chips/list in the test panel for each skill
- One-click re-run: fills input from saved payload and sends immediately

### Workspaces
- Multiple named workspaces (e.g., "Production Agents", "Dev Sandbox")
- Workspace selector in sidebar footer (dropdown)
- Switching workspace filters agent list
- Default workspace created on first launch (already done in Phase 1)

### Settings
- Global settings panel/modal:
  - Default timeout (ms) — default 30000
  - Proxy URL — optional
  - Theme — system/light/dark (already working from Phase 1, just needs UI)
  - Telemetry opt-in — default off
- Per-card settings (accessible from card detail):
  - Default auth headers
  - Base URL override
- Settings persisted to SQLite settings table

### Keyboard Shortcuts
- Ctrl/Cmd+N: Add agent card
- Ctrl/Cmd+Enter: Run test
- Ctrl/Cmd+Shift+C: Copy curl command
- Show shortcut hints in button tooltips

### Empty States
- No agents: "Get started by adding your first A2A agent" + example URL (https://aigc-service.echonlab.com)
- No skills: "Select an agent to browse its skills"
- No test results: "Select a skill and run a test to see results here"
- Include the AIGC Service URL as the suggested example agent

### Claude's Discretion
- Monaco Editor integration details and lazy loading
- Markdown rendering library choice
- History panel layout (inline vs separate view)
- Settings panel layout (modal vs page)
- Exact keyboard shortcut implementation
- Workspace CRUD UI details
- Error boundary and retry patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `A2A_Workbench_PRD.md` — FR-020 through FR-042 (test panel, history, workspaces, settings)
- `a2a_workbench_ui_mockup.html` — Test panel layout, response viewer, status indicators, JSON tree colors

### Phase 1 & 2 Foundation
- `src-tauri/src/db.rs` — SQLite schema (test_runs, test_cases, settings tables)
- `src-tauri/src/a2a/types.rs` — AgentCard, AgentSkill types
- `src-tauri/src/commands/agents.rs` — Agent command patterns to follow
- `src-tauri/src/commands/settings.rs` — Settings command stubs to implement
- `src-tauri/src/state.rs` — AppState with reqwest::Client
- `src-tauri/src/credentials.rs` — Credential retrieval for auth headers
- `src/stores/agentStore.ts` — Agent store with selectedSkillId
- `src/stores/uiStore.ts` — UI state patterns
- `src/bindings.ts` — TypeScript command bindings pattern
- `src/components/layout/TestPanel.tsx` — Test panel placeholder to implement

### Research
- `.planning/research/ARCHITECTURE.md` — SSE streaming via Tauri Channels pattern
- `.planning/research/STACK.md` — reqwest-eventsource, Monaco Editor setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TestPanel.tsx`: Placeholder with input/output column structure — needs full implementation
- `agentStore.ts`: Has selectedAgentId, selectedSkillId, agent CRUD — add test-related state
- `uiStore.ts`: Theme, panel sizes pattern — extend for settings
- `bindings.ts`: Typed command wrappers — add new task/history/settings commands
- `credentials.rs`: retrieve_credential() for auth token retrieval
- `settings.rs`: get_settings/save_settings stubs — implement
- `db.rs`: test_runs and test_cases tables exist in schema

### Established Patterns
- Tauri commands: `#[tauri::command]` + `#[specta::specta]` + register in `collect_commands![]`
- Frontend: Zustand stores with actions calling `commands.*` from bindings.ts
- Styling: CSS custom properties, Tailwind utility classes, mockup color values
- AgentRow/AgentCard types flow: Rust → specta → bindings.ts → stores → components

### Integration Points
- TestPanel receives selected skill from agentStore.selectedSkillId
- Task commands need agent's base URL + auth from agentStore + credentials
- SSE streaming: Rust command receives Channel, writes events, frontend reads
- History: new testStore or extend agentStore for test_runs/test_cases
- Settings: implement get_settings/save_settings Rust commands

</code_context>

<specifics>
## Specific Ideas

- Test panel must match the mockup's two-column layout: input (left) and output (right) with tabs
- Status indicators use exact mockup colors: completed=#1D9E75, working=#EF9F27, failed=#E24B4A
- Use the AIGC Service (https://aigc-service.echonlab.com) with API key WFmYS00N2U0LThkYmItMTgzOGVkZjlmN as the default test target in empty states
- JSON tree in response viewer matches mockup's exact syntax highlighting colors
- The "Run" button animation matches the mockup: dot color change + text change + opacity

</specifics>

<deferred>
## Deferred Ideas

- A2A push notifications (agent-initiated messages) — v2
- input-required task state handling — v2
- Local mock agent mode for offline testing — v2

</deferred>

---

*Phase: 03-task-execution-and-testing*
*Context gathered: 2026-03-24*
