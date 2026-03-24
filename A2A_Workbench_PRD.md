# A2A Workbench — Product Requirements Document

**Version:** 1.0  
**Date:** March 2026  
**Platform:** Cross-platform desktop (macOS, Windows, Linux) via Tauri  

---

## 1. Overview

A2A Workbench is a native desktop application for developers and AI engineers to discover, inspect, and interactively test agents that expose Google's [Agent-to-Agent (A2A) protocol](https://google.github.io/A2A/). Users register agents by entering their well-known card URL, browse all advertised skills, and run live test interactions without writing any code.

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Frictionless agent registration | User adds first agent card in < 30 seconds |
| Skill discoverability | All skills in a card are surfaced & filterable |
| Fast iterative testing | Round-trip test execution < 2s for typical text skills |
| Cross-platform parity | Feature-identical on macOS 13+, Windows 11, Ubuntu 22+ |

---

## 3. Non-Goals

- Not an agent builder / code editor
- Not a hosted/cloud service — fully local, no telemetry by default
- Not a general HTTP client (Postman replacement)

---

## 4. Users

**Primary:** AI/LLM engineers building A2A-compliant agents  
**Secondary:** QA engineers validating agent integrations  
**Tertiary:** Product managers doing exploratory demos

---

## 5. Core Concepts

### 5.1 Agent Card
A JSON document served at `/.well-known/agent.json` on an agent's base URL. Describes the agent's identity, capabilities, authentication schemes, and the list of skills it exposes. Conforms to the A2A `AgentCard` schema.

### 5.2 Skill
A discrete capability advertised inside an agent card. Each skill has an `id`, `name`, `description`, optional `inputModes` (text, file, data), optional `outputModes`, and optional `examples`.

### 5.3 Task
An A2A execution unit. Created by sending a `tasks/send` JSON-RPC request to the agent's endpoint. Has a lifecycle: `submitted → working → completed | failed | canceled`.

### 5.4 Workspace
A user-named collection of agent cards. Persisted locally in a SQLite database via Tauri's `tauri-plugin-sql`.

---

## 6. Feature Requirements

### 6.1 Agent Card Management

**FR-001** User can add an agent card by entering a base URL. App fetches `{url}/.well-known/agent.json` and validates the schema.

**FR-002** App displays a loading state during fetch, and a descriptive error on failure (network error, invalid JSON, schema mismatch).

**FR-003** User can give a card a local nickname overriding the `name` field.

**FR-004** Cards are persisted across sessions.

**FR-005** User can delete a card (with confirmation). Deletion removes associated test history.

**FR-006** User can manually refresh a card to re-fetch the latest version from the agent.

**FR-007** User can import/export cards as a JSON bundle for sharing with teammates.

---

### 6.2 Skill Browser

**FR-010** All skills in a card are listed, showing: name, short description, input modes, output modes.

**FR-011** Skills are searchable/filterable by name or description.

**FR-012** Skills can be filtered by input mode (text, file, data) and output mode.

**FR-013** Skills show a "No examples" badge when the card provides no example inputs.

**FR-014** Clicking a skill opens the Skill Test Panel (see 6.3).

---

### 6.3 Skill Test Panel

**FR-020** Panel shows full skill metadata: id, name, description, input/output modes, examples (if any).

**FR-021** User can compose a test message. Input area adapts based on `inputModes`:
- `text` → multi-line text editor
- `file` → drag-and-drop file picker + text
- `data` → JSON editor with syntax highlighting

**FR-022** User can select authentication method if the card declares multiple schemes.

**FR-023** User can override request headers (for Bearer tokens, API keys, etc.) via a key-value editor.

**FR-024** App sends `tasks/send` JSON-RPC and shows a real-time status indicator (submitted → working → completed/failed).

**FR-025** App supports streaming responses via `tasks/sendSubscribe` (SSE) when the agent advertises `streaming: true`.

**FR-026** Response viewer shows:
- Full JSON-RPC response in a collapsible tree
- Extracted `message.parts` rendered natively: text as markdown, file as download link, data as formatted JSON
- Task status badge (completed / failed / canceled)
- Latency in ms

**FR-027** User can save a request/response pair as a named "Test Case" attached to that skill.

**FR-028** User can re-run any saved Test Case with one click.

**FR-029** User can copy the equivalent `curl` command for any request.

---

### 6.4 Test History

**FR-030** All executions are saved to local SQLite with: timestamp, skill id, agent id, request payload, response payload, latency, status.

**FR-031** History is browsable and searchable.

**FR-032** User can clear history (per agent or globally).

---

### 6.5 Workspace & Settings

**FR-040** App supports multiple named workspaces (e.g. "Production Agents", "Dev Sandbox").

**FR-041** Global settings: default timeout (ms), proxy URL, theme (system/light/dark), telemetry opt-in.

**FR-042** Per-card settings: default auth headers, base URL override.

---

## 7. Architecture

```
┌──────────────────────────────────────────┐
│               Tauri Shell                │
│  ┌────────────────────────────────────┐  │
│  │   React + TypeScript Frontend       │  │
│  │   (Vite · Tailwind · Zustand)       │  │
│  └────────────┬───────────────────────┘  │
│               │ invoke / event           │
│  ┌────────────▼───────────────────────┐  │
│  │     Rust Backend (Tauri Commands)   │  │
│  │  · fetch_agent_card                 │  │
│  │  · send_task / subscribe_task       │  │
│  │  · db read/write (tauri-plugin-sql) │  │
│  └────────────────────────────────────┘  │
│               │                          │
│  ┌────────────▼───────────────────────┐  │
│  │  SQLite (local, ~/.a2a-workbench/)  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
          │ HTTP / SSE
    External A2A Agents
```

**Key technical choices:**

- **Tauri 2.x** — smaller binary than Electron, native OS security sandbox, Rust backend for HTTP and SSE
- **React 18 + TypeScript** — component library for UI
- **Zustand** — lightweight state management (agents, skills, active test)
- **tauri-plugin-sql** — SQLite persistence via Diesel
- **Monaco Editor** (JSON editor) — embedded in Skill Test Panel for data mode
- **@tanstack/react-query** — async data fetching and caching for card refresh

---

## 8. Data Models

### AgentCard (local representation)
```typescript
interface LocalAgentCard {
  id: string;            // UUID, local
  nickname?: string;
  baseUrl: string;
  card: AgentCard;       // raw A2A schema object
  fetchedAt: string;     // ISO 8601
  workspaceId: string;
}
```

### TestRun
```typescript
interface TestRun {
  id: string;
  agentId: string;
  skillId: string;
  name?: string;         // user-named saved test case
  requestPayload: object;
  responsePayload: object;
  statusCode: string;    // completed | failed | canceled
  latencyMs: number;
  createdAt: string;
}
```

---

## 9. UI/UX Requirements

- **UX-001** App launches in < 2s on target hardware (M2 Mac, Ryzen 5).
- **UX-002** Three-panel layout: sidebar (agents) | skill list | test panel.
- **UX-003** All panels are resizable via drag handles.
- **UX-004** Supports system dark/light mode; can be overridden in settings.
- **UX-005** Keyboard shortcuts for common actions (add card, run test, copy curl).
- **UX-006** Empty states guide new users with example public A2A agents.

---

## 10. Security

- All HTTP requests are made from the Rust backend, not the webview, preventing mixed-content and CORS issues.
- Credentials (Bearer tokens, API keys) are stored in the OS keychain via `tauri-plugin-keychain`, never in SQLite plaintext.
- App has no network access except to user-registered agent endpoints plus the well-known fetch URL.

---

## 11. Milestones

| Milestone | Scope | Target |
|---|---|---|
| M1 — Core | Card add/delete, skill browser, basic text test | Week 4 |
| M2 — Rich Testing | JSON/file input, streaming, response tree view | Week 7 |
| M3 — History & Saved Tests | Persistence, re-run, curl export | Week 9 |
| M4 — Polish | Workspaces, settings, keyboard shortcuts, OS packages | Week 12 |

---

## 12. Open Questions

1. Should the app support A2A push notifications (agent-initiated messages)? Scope for v2.
2. Local mock agent mode (stub server for offline testing)? Likely v2.
3. Team sync via Git repo for shared workspaces? Evaluate post-M4.

---

*End of document*
