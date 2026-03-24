# Phase 1: Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the Tauri 2.x application shell: project scaffold with Rust backend and React frontend, SQLite database with WAL mode and full schema, Tauri permissions ACL correctly configured, typed Rust-to-React bridge via tauri-specta, and three-panel resizable layout with dark/light theme support. No agent card fetching or testing — just the infrastructure that everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Panel Layout
- Three-panel layout: fixed sidebar (220px, agents) | resizable skill list (240px default) | flexible test panel
- Panels resizable via drag handles between skill list and test panel
- Sidebar is fixed-width at 220px with a collapse toggle
- Minimum window size: 1024x640 to fit all three panels comfortably
- Exact layout matches the HTML mockup's proportions and spacing

### Theme System
- CSS custom properties for all colors, matching the mockup's warm neutral palette exactly
- Variables: --bg-primary, --bg-secondary, --bg-tertiary, --border-subtle, --border-default, --border-strong, --text-primary, --text-secondary, --text-muted, plus semantic colors (success, warning, info)
- System auto-detect via prefers-color-scheme media query
- Manual override persisted in SQLite settings table
- Fonts: Inter for UI text, JetBrains Mono for code/monospace — bundled with the app for cross-platform consistency

### App Shell
- Native OS title bar (not custom — simpler, cross-platform consistent)
- Tauri 2.x with capabilities file for permissions (zero-access default)
- CSP headers configured from day one: worker-src blob: for Monaco, script-src for React dev server
- Window state persistence via tauri-plugin-window-state

### SQLite Schema
- WAL mode enabled in first migration
- Tables: agents, workspaces, test_runs, test_cases, settings
- Agent cards stored as JSON blob (card_json TEXT) — avoids migration churn as A2A spec evolves
- Request/response payloads stored as JSON blobs
- Default workspace created on first launch

### Credential Storage
- Primary: tauri-plugin-keyring for OS keychain access
- Fallback: encrypted column in SQLite settings if keyring unavailable (Linux without Secret Service)
- Credentials never stored in plaintext SQLite

### Rust Backend Architecture
- Single reqwest::Client in AppState (immutable, cheaply cloneable)
- All commands async with proper error types (thiserror)
- tauri-specta for auto-generated TypeScript bindings
- Tauri Channels (not emit) prepared for future SSE streaming

### Frontend Architecture
- React 18 + Vite + TypeScript
- Tailwind CSS 4.x with Vite plugin (no PostCSS config needed)
- Zustand 5 stores: agentStore, uiStore (theme, panel sizes, active selections)
- @tanstack/react-query 5 for async Tauri command results
- Monaco Editor dependency installed but not yet integrated (Phase 3)

### Claude's Discretion
- Exact Tailwind configuration details
- Error boundary design
- Loading skeleton patterns
- File/folder structure within src/ (follow Tauri conventions)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `A2A_Workbench_PRD.md` — Full PRD with architecture diagram, data models, UI/UX requirements
- `a2a_workbench_ui_mockup.html` — Exact HTML/CSS mockup with color system, layout, typography, component designs

### Research
- `.planning/research/STACK.md` — Verified library versions, installation commands, what NOT to use
- `.planning/research/ARCHITECTURE.md` — System architecture, file structure, patterns, data flows, schema design
- `.planning/research/PITFALLS.md` — Critical pitfalls: permissions ACL, WAL mode, CSP headers, cross-platform fonts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- This phase creates all integration points for Phase 2 and 3

</code_context>

<specifics>
## Specific Ideas

- UI must match the HTML mockup's exact visual language: warm neutrals, subtle borders (0.5px), rounded corners (6px/10px), mode tags with distinct colors (green for text, blue for file, amber for data)
- The mockup uses specific hover/active states — preserve those interaction patterns
- Status dots use specific colors: green (#1D9E75), amber (#EF9F27), red (#E24B4A)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-24*
