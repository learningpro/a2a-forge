---
phase: 02-agent-and-skill-discovery
plan: 04
subsystem: ui
tags: [react, tauri, dialog, fs, context-menu, inline-editing]

requires:
  - phase: 02-02
    provides: "AgentListItem component and agentStore with CRUD actions"
  - phase: 02-03
    provides: "SkillPanel and selectedSkillId in store"
provides:
  - "AgentContextMenu with hover-revealed rename/refresh/delete actions"
  - "Inline delete confirmation with test history warning"
  - "Inline rename editing via agentStore.renameAgent"
  - "Import/export buttons in sidebar footer using native file dialogs"
affects: [03-test-execution]

tech-stack:
  added: ["@tauri-apps/plugin-dialog", "@tauri-apps/plugin-fs", "tauri-plugin-fs"]
  patterns: ["hover-revealed action menu", "inline confirmation", "inline rename editing", "dynamic import for Tauri plugins"]

key-files:
  created:
    - src/components/agent/AgentContextMenu.tsx
  modified:
    - src/components/agent/AgentListItem.tsx
    - src/components/layout/Sidebar.tsx
    - src/stores/agentStore.ts
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json

key-decisions:
  - "Used @tauri-apps/plugin-sql direct SQL for rename (no Rust command needed)"
  - "Used @tauri-apps/plugin-fs for file I/O in import/export (avoids modifying Rust backend)"
  - "Dynamic imports for dialog and fs plugins to keep bundle lean"

patterns-established:
  - "Hover action menu: render absolutely positioned action row on parent hover"
  - "Inline confirmation: replace action row with confirm/cancel in same space"
  - "Inline editing: swap display element for input on rename action"

requirements-completed: [CARD-05, CARD-06, CARD-07]

duration: 4min
completed: 2026-03-24
---

# Phase 2 Plan 4: Card Management Summary

**Hover action menu with rename/refresh/delete (inline confirmation), plus import/export via native file dialogs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T09:51:37Z
- **Completed:** 2026-03-24T09:55:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Hover-revealed action menu on agent cards with rename, refresh, and delete
- Inline delete confirmation showing "Delete {name}? This removes all test history."
- Inline rename editing with keyboard support (Enter to save, Escape to cancel)
- Import/Export buttons in sidebar footer using native OS file dialogs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AgentContextMenu and add hover actions to AgentListItem** - `9ae7385` (feat)
2. **Task 2: Add import/export buttons to Sidebar footer** - `505e055` (feat)

## Files Created/Modified
- `src/components/agent/AgentContextMenu.tsx` - Hover-revealed action row with rename/refresh/delete and inline delete confirmation
- `src/components/agent/AgentListItem.tsx` - Updated with hover state, rename mode, and AgentContextMenu integration
- `src/components/layout/Sidebar.tsx` - Added Import/Export buttons with native file dialog handlers
- `src/stores/agentStore.ts` - Added renameAgent action using plugin-sql direct query
- `src-tauri/Cargo.toml` - Added tauri-plugin-fs dependency
- `src-tauri/src/lib.rs` - Registered tauri_plugin_fs
- `src-tauri/capabilities/default.json` - Added fs read/write permissions
- `package.json` - Added @tauri-apps/plugin-dialog and @tauri-apps/plugin-fs

## Decisions Made
- Used `@tauri-apps/plugin-sql` JS API directly for rename (simple UPDATE query avoids adding a new Rust command)
- Used `@tauri-apps/plugin-fs` for import/export file I/O rather than modifying Rust backend commands
- Dynamic imports for dialog and fs plugins to avoid bundling them in initial load

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed tauri-plugin-fs Rust dependency and registered plugin**
- **Found during:** Task 2 (Import/Export)
- **Issue:** @tauri-apps/plugin-fs requires tauri-plugin-fs Rust crate and plugin registration
- **Fix:** Added tauri-plugin-fs to Cargo.toml, registered in lib.rs, added fs permissions to capabilities
- **Files modified:** src-tauri/Cargo.toml, src-tauri/src/lib.rs, src-tauri/capabilities/default.json
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 9ae7385 (bundled with Task 1 since infrastructure was needed early)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required infrastructure for fs plugin. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 card management features complete (CARD-05, CARD-06, CARD-07)
- Agent discovery UI fully functional: add, list, select, rename, refresh, delete, import, export
- Ready for Phase 3: Test Execution

---
*Phase: 02-agent-and-skill-discovery*
*Completed: 2026-03-24*
