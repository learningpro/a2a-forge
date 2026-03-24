# Phase 1: Foundation - Research

**Researched:** 2026-03-24
**Domain:** Tauri 2.x scaffold, SQLite/WAL, capabilities ACL, tauri-specta typed bridge, three-panel React shell with dark/light theming
**Confidence:** HIGH (all major claims sourced from official Tauri docs, Context7-equivalent prior research in STACK.md/ARCHITECTURE.md/PITFALLS.md, and verified web sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Panel Layout**
- Three-panel layout: fixed sidebar (220px, agents) | resizable skill list (240px default) | flexible test panel
- Panels resizable via drag handles between skill list and test panel
- Sidebar is fixed-width at 220px with a collapse toggle
- Minimum window size: 1024x640 to fit all three panels comfortably
- Exact layout matches the HTML mockup's proportions and spacing

**Theme System**
- CSS custom properties for all colors, matching the mockup's warm neutral palette exactly
- Variables: --bg-primary, --bg-secondary, --bg-tertiary, --border-subtle, --border-default, --border-strong, --text-primary, --text-secondary, --text-muted, plus semantic colors (success, warning, info)
- System auto-detect via prefers-color-scheme media query
- Manual override persisted in SQLite settings table
- Fonts: Inter for UI text, JetBrains Mono for code/monospace — bundled with the app for cross-platform consistency

**App Shell**
- Native OS title bar (not custom — simpler, cross-platform consistent)
- Tauri 2.x with capabilities file for permissions (zero-access default)
- CSP headers configured from day one: worker-src blob: for Monaco, script-src for React dev server
- Window state persistence via tauri-plugin-window-state

**SQLite Schema**
- WAL mode enabled in first migration
- Tables: agents, workspaces, test_runs, test_cases, settings
- Agent cards stored as JSON blob (card_json TEXT) — avoids migration churn as A2A spec evolves
- Request/response payloads stored as JSON blobs
- Default workspace created on first launch

**Credential Storage**
- Primary: tauri-plugin-keyring for OS keychain access
- Fallback: encrypted column in SQLite settings if keyring unavailable (Linux without Secret Service)
- Credentials never stored in plaintext SQLite

**Rust Backend Architecture**
- Single reqwest::Client in AppState (immutable, cheaply cloneable)
- All commands async with proper error types (thiserror)
- tauri-specta for auto-generated TypeScript bindings
- Tauri Channels (not emit) prepared for future SSE streaming

**Frontend Architecture**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UIUX-01 | Three-panel resizable layout (agents sidebar 220px fixed | skill list 240px default | test panel flexible) | Panel layout via CSS flex + pointer events drag handle; see Architecture Patterns section |
| UIUX-02 | System dark/light mode with settings override | prefers-color-scheme on :root CSS custom properties; override flag persisted to SQLite settings table; see Theme System section |
| UIUX-05 | App launches in < 2s on target hardware | Monaco NOT loaded at startup (Phase 3 only); lazy-load strategy; tauri-plugin-window-state avoids layout-recompute flicker; see Performance section |
| SECR-01 | All HTTP requests made from Rust backend, not webview | reqwest::Client in AppState; no fetch() from React; tauri-plugin-http used for all outbound; webview has no network permissions in capabilities file |
| SECR-02 | Credentials stored securely, never in SQLite plaintext | tauri-plugin-keyring primary; AES-encrypted SQLite fallback if Secret Service unavailable; see Credential Storage section |
</phase_requirements>

---

## Summary

Phase 1 establishes every infrastructure layer the subsequent phases build on: a Tauri 2.x project scaffold, a correctly permissioned capabilities ACL, a typed Rust-React bridge via tauri-specta, a SQLite database in WAL mode with the full schema, and the three-panel React shell with dark/light theming matching the HTML mockup exactly.

The research draws on STACK.md, ARCHITECTURE.md, and PITFALLS.md produced during the discuss-phase, all of which were researched against official Tauri 2.x docs and crates.io. This RESEARCH.md synthesises those sources into prescriptive, task-ready guidance focused on Phase 1 scope only.

The single highest-risk item is tauri-plugin-keyring (v0.1.0, community, unstable). It must be validated on all three platforms before Phase 3 introduces real credentials. The fallback (AES-encrypted SQLite) must be designed and wired in Phase 1 even if it is not exercised until Phase 3.

**Primary recommendation:** Scaffold with `create-tauri-app`, wire all infrastructure (capabilities, AppState, specta bindings, DB migrations, theme CSS) before writing any feature-domain Rust commands or React components.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.10.3 | Desktop shell, IPC bridge, OS integration | Latest stable (2026-03-04); native sandbox, capabilities ACL, Rust backend |
| React | 18.3.x | UI component framework | Required by TanStack Query v5 and Zustand 5 (useSyncExternalStore) |
| TypeScript | 5.x | Type safety | Non-negotiable for IPC payload correctness across Rust/JS boundary |
| Vite | 6.x | Bundler and dev server | Official Tauri recommendation; required by @tailwindcss/vite plugin |
| Rust | stable 1.77.2+ | Backend logic, HTTP, security | Hard minimum for all Tauri 2 official plugins |

### Tauri Official Plugins

| Plugin | Rust Version | JS Package | Purpose |
|--------|-------------|------------|---------|
| tauri-plugin-sql | 2.3.2 | @tauri-apps/plugin-sql | SQLite persistence via sqlx 0.8; built-in migration system |
| tauri-plugin-window-state | 2.4.1 | @tauri-apps/plugin-window-state | Persist/restore window size and position |
| tauri-plugin-store | 2.4.2 | @tauri-apps/plugin-store | Flat key-value persistence for global settings |

### Community Plugins

| Plugin | Version | Purpose | Risk |
|--------|---------|---------|------|
| tauri-plugin-keyring | 0.1.0 | OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) | UNSTABLE — validate all three platforms in Phase 1 |

### State Management

| Library | Version | Purpose |
|---------|---------|---------|
| Zustand | 5.0.12 | UI state: agentStore, uiStore (panel widths, theme, active selections) |
| @tanstack/react-query | 5.95.x | Async state for Tauri command results, loading/error/stale lifecycle |

### UI Layer

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 4.2.x | Utility CSS; CSS-based config via @import "tailwindcss"; no tailwind.config.js |
| @tailwindcss/vite | 4.2.x | Vite plugin for Tailwind 4; replaces PostCSS entirely |
| @vitejs/plugin-react-swc | 4.x | React fast refresh; SWC variant is faster than Babel |

### Typed Bridge

| Library | Version | Purpose |
|---------|---------|---------|
| tauri-specta | 2.0.0-rc.21+ | Generates bindings.ts from Rust command signatures at debug build time |
| specta | 2.x | Type introspection used by tauri-specta |

### Installed But Deferred

| Library | Purpose | When Used |
|---------|---------|-----------|
| @monaco-editor/react 4.6.x | JSON/text editor | Phase 3 only — do NOT load on startup |
| monaco-editor 0.55.x | Monaco core | Phase 3 only |

### Installation

```bash
# Scaffold
npm create tauri-app@latest
# Select: React, TypeScript, Vite

# Frontend core
npm install @tanstack/react-query zustand

# Frontend UI
npm install tailwindcss @tailwindcss/vite
npm install @vitejs/plugin-react-swc

# Tauri plugin JS bindings
npm install @tauri-apps/plugin-sql
npm install @tauri-apps/plugin-window-state
npm install @tauri-apps/plugin-store

# Monaco — install now, lazy-load in Phase 3
npm install @monaco-editor/react monaco-editor

# Dev
npm install -D typescript @tauri-apps/cli
```

```toml
# Cargo.toml [dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-window-state = "2"
tauri-plugin-store = "2"
tauri-plugin-keyring = "0.1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
thiserror = "1"
uuid = { version = "1", features = ["v4"] }
reqwest = { version = "0.12", features = ["json"] }

# tauri-specta (pinned RC — do not use "latest" which may pull breaking RC)
[build-dependencies]
tauri-build = { version = "2", features = [] }

# Cargo.toml [dev-dependencies]
specta = "2"
tauri-specta = { version = "2.0.0-rc.21", features = ["typescript"] }
```

---

## Architecture Patterns

### Recommended Project Structure

```
a2a-workbench/
├── src/                            # React frontend
│   ├── main.tsx                    # ReactDOM.createRoot
│   ├── App.tsx                     # Three-panel shell layout
│   ├── index.css                   # @import "tailwindcss"; + CSS custom properties + @theme
│   ├── bindings.ts                 # AUTO-GENERATED by tauri-specta (never edit)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Outer flex container with three panels
│   │   │   ├── Sidebar.tsx         # Fixed 220px agents panel
│   │   │   ├── SkillPanel.tsx      # Resizable 240px default skill list
│   │   │   ├── TestPanel.tsx       # Flexible remaining width test area
│   │   │   └── ResizeHandle.tsx    # Drag handle between SkillPanel and TestPanel
│   │   └── ui/                     # Shared primitives
│   │       ├── Button.tsx
│   │       └── EmptyState.tsx
│   ├── stores/
│   │   ├── agentStore.ts           # Agent card list, selectedAgentId, per-card settings
│   │   └── uiStore.ts              # theme override, skillPanelWidth, sidebarCollapsed
│   ├── hooks/
│   │   └── useTheme.ts             # Reads uiStore + system preference, applies to :root
│   └── lib/
│       └── a2a.ts                  # TypeScript type definitions for A2A protocol objects
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json             # minWidth: 1024, minHeight: 640, decorations: true
│   ├── capabilities/
│   │   └── default.json            # Explicit permission grants
│   └── src/
│       ├── main.rs                 # Calls lib::run()
│       ├── lib.rs                  # Builder: plugins, state, specta commands, capabilities
│       ├── error.rs                # AppError (thiserror + serde::Serialize) — build first
│       ├── state.rs                # AppState: http_client, active_tasks Mutex
│       ├── db.rs                   # Migration definitions; WAL PRAGMA in migration 0
│       └── commands/
│           ├── mod.rs              # Re-exports for collect_commands!
│           └── settings.rs         # get_settings, save_settings (Phase 1 stub)
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### Pattern 1: Tauri Capabilities ACL (Zero-Access Default)

**What:** Every plugin permission must be explicitly granted in `src-tauri/capabilities/default.json`. Nothing works without it. The old Tauri v1 `allowlist` key is a hard build error in v2.

**When to use:** Always — create this file on day one before writing any plugin-dependent code.

**Example:**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for A2A Workbench",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "window-state:allow-restore-state",
    "window-state:allow-save-window-state",
    "store:allow-get",
    "store:allow-set",
    "store:allow-save"
  ]
}
```

Note: `http:default` permission with explicit URL scope is added in Phase 2 when outbound HTTP is wired. Adding it in Phase 1 with no scope is insufficient — the plugin requires `allow: [{ "url": "https://**" }]` scope objects.

### Pattern 2: tauri-specta Typed Bridge

**What:** Auto-generate `src/bindings.ts` from Rust command signatures. Every command decorated with `#[tauri::command]` ALSO needs `#[specta::specta]`. Use `collect_commands!` (not `generate_handler!` directly). Bindings regenerate on every debug build.

**Critical:** Both attributes are required on every command. Missing `#[specta::specta]` causes the function to be excluded from bindings silently.

**Example:**

```rust
// src-tauri/src/commands/settings.rs
use crate::error::AppError;

#[tauri::command]
#[specta::specta]                   // BOTH attributes required
pub async fn get_settings(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<serde_json::Value, AppError> {
    // stub for Phase 1
    Ok(serde_json::json!({"theme": "system"}))
}
```

```rust
// src-tauri/src/lib.rs
use tauri_specta::{collect_commands, ts};

pub fn run() {
    let invoke_handler = {
        let builder = ts::builder()
            .commands(collect_commands![
                commands::settings::get_settings,
                commands::settings::save_settings,
            ]);

        #[cfg(debug_assertions)]
        let builder = builder.path("../src/bindings.ts");

        builder.build().unwrap()
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:workbench.db", db::migrations())
            .build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(state::AppState::new())
        .invoke_handler(invoke_handler)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// src/stores/agentStore.ts — consuming the generated bindings
import { commands } from "../bindings";

const settings = await commands.getSettings();  // fully typed
```

### Pattern 3: AppState Struct

**What:** Single shared Rust runtime state held via Tauri's managed state system. All commands receive it via `tauri::State<'_, AppState>`.

**Rules:**
- `reqwest::Client` is immutable — no Mutex needed, `Clone` is cheap
- Mutable fields use `tokio::sync::Mutex` (not `std::sync::Mutex`) — async commands require Send guards
- Never hold a lock across an `.await` point with std Mutex

```rust
// src-tauri/src/state.rs
use tokio::sync::Mutex;
use std::collections::HashMap;
use tokio::task::AbortHandle;

pub struct AppState {
    pub http_client: reqwest::Client,
    pub active_tasks: Mutex<HashMap<String, AbortHandle>>,
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

### Pattern 4: SQLite Migrations via tauri-plugin-sql

**What:** Migrations are Rust `Migration` structs with monotonically increasing version numbers. WAL mode is a PRAGMA that must be the very first operation — put it in a version-0 migration or in the first migration.

**Critical:** Never use Drizzle ORM `migrate()` in the webview — it calls Node.js `fs` module which does not exist in WebView. Use only `tauri-plugin-sql`'s built-in Rust-side migration system.

```rust
// src-tauri/src/db.rs
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "enable_wal_and_create_workspaces",
            sql: "
                PRAGMA journal_mode=WAL;
                PRAGMA busy_timeout=5000;
                CREATE TABLE IF NOT EXISTS workspaces (
                    id         TEXT PRIMARY KEY,
                    name       TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                INSERT OR IGNORE INTO workspaces(id, name, created_at)
                    VALUES('default', 'Default', unixepoch());
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_agents",
            sql: "
                CREATE TABLE IF NOT EXISTS agents (
                    id              TEXT PRIMARY KEY,
                    url             TEXT NOT NULL UNIQUE,
                    nickname        TEXT,
                    card_json       TEXT NOT NULL,
                    last_fetched_at INTEGER NOT NULL,
                    workspace_id    TEXT NOT NULL REFERENCES workspaces(id)
                );
                CREATE INDEX idx_agents_workspace ON agents(workspace_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_history",
            sql: "
                CREATE TABLE IF NOT EXISTS history (
                    id            TEXT PRIMARY KEY,
                    agent_id      TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                    skill_name    TEXT NOT NULL,
                    request_json  TEXT NOT NULL,
                    response_json TEXT,
                    status        TEXT NOT NULL,
                    duration_ms   INTEGER,
                    created_at    INTEGER NOT NULL
                );
                CREATE INDEX idx_history_agent ON history(agent_id);
                CREATE INDEX idx_history_created ON history(created_at DESC);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_saved_tests",
            sql: "
                CREATE TABLE IF NOT EXISTS saved_tests (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                    skill_name   TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    created_at   INTEGER NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_settings",
            sql: "
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                INSERT OR IGNORE INTO settings VALUES
                    ('theme', '\"system\"'),
                    ('timeout_seconds', '30'),
                    ('proxy_url', 'null');
            ",
            kind: MigrationKind::Up,
        },
    ]
}
```

### Pattern 5: Tailwind 4 + CSS Custom Properties Theme System

**What:** Tailwind 4 uses CSS-based config. CSS custom properties for the design system are defined on `:root` (light) and overridden in a `@media (prefers-color-scheme: dark)` block plus a `[data-theme="dark"]` attribute override for manual toggle.

**Tailwind 4 setup in vite.config.ts:**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
  },
  envPrefix: ["VITE_", "TAURI_PLATFORM", "TAURI_ARCH", "TAURI_FAMILY",
              "TAURI_PLATFORM_VERSION", "TAURI_PLATFORM_TYPE", "TAURI_DEBUG"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

**src/index.css — exact mockup values:**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --radius-md: 6px;
  --radius-lg: 10px;
}

/* Light mode (default) — exact values from mockup */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f4f0;
  --bg-tertiary: #eeede9;
  --border-subtle: rgba(0,0,0,0.08);
  --border-default: rgba(0,0,0,0.15);
  --border-strong: rgba(0,0,0,0.3);
  --text-primary: #1a1a18;
  --text-secondary: #5a5a56;
  --text-muted: #9a9992;
  --bg-success: #e1f5ee;
  --text-success: #0f6e56;
  --bg-warning: #faeeda;
  --text-warning: #854f0b;
  --bg-info: #e6f1fb;
  --text-info: #185fa5;
  --border-info: rgba(24,95,165,0.3);
  --border-success: rgba(15,110,86,0.3);
  /* Status dots */
  --dot-online: #1D9E75;
  --dot-warning: #EF9F27;
  --dot-error: #E24B4A;
}

/* Dark mode — system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-primary: #1e1e1c;
    --bg-secondary: #252523;
    --bg-tertiary: #2c2c2a;
    --border-subtle: rgba(255,255,255,0.07);
    --border-default: rgba(255,255,255,0.13);
    --border-strong: rgba(255,255,255,0.25);
    --text-primary: #e8e6de;
    --text-secondary: #9c9a92;
    --text-muted: #66645e;
    --bg-success: #04342c;
    --text-success: #5dcaa5;
    --bg-warning: #412402;
    --text-warning: #ef9f27;
    --bg-info: #042c53;
    --text-info: #85b7eb;
    --border-info: rgba(133,183,235,0.3);
    --border-success: rgba(93,202,165,0.3);
  }
}

/* Manual dark override (data-theme attribute on <html>) */
[data-theme="dark"] {
  --bg-primary: #1e1e1c;
  --bg-secondary: #252523;
  --bg-tertiary: #2c2c2a;
  --border-subtle: rgba(255,255,255,0.07);
  --border-default: rgba(255,255,255,0.13);
  --border-strong: rgba(255,255,255,0.25);
  --text-primary: #e8e6de;
  --text-secondary: #9c9a92;
  --text-muted: #66645e;
  --bg-success: #04342c;
  --text-success: #5dcaa5;
  --bg-warning: #412402;
  --text-warning: #ef9f27;
  --bg-info: #042c53;
  --text-info: #85b7eb;
  --border-info: rgba(133,183,235,0.3);
  --border-success: rgba(93,202,165,0.3);
}

/* Bundled fonts — required for cross-platform consistency */
@font-face {
  font-family: "Inter";
  src: url("/fonts/Inter-Variable.woff2") format("woff2-variations");
  font-weight: 100 900;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("/fonts/JetBrainsMono-Variable.woff2") format("woff2-variations");
  font-weight: 100 800;
}
```

**uiStore theme application hook:**

```typescript
// src/hooks/useTheme.ts
import { useEffect } from "react";
import { useUiStore } from "../stores/uiStore";

export function useTheme() {
  const themeOverride = useUiStore((s) => s.themeOverride);

  useEffect(() => {
    const html = document.documentElement;
    if (themeOverride === "dark") {
      html.setAttribute("data-theme", "dark");
    } else if (themeOverride === "light") {
      html.setAttribute("data-theme", "light");
    } else {
      html.removeAttribute("data-theme"); // falls back to system preference
    }
  }, [themeOverride]);
}
```

### Pattern 6: Three-Panel Resizable Layout

**What:** CSS flex layout. Sidebar is fixed at 220px. Skill panel has a `width` state variable (default 240px, min 160px). Test panel fills remaining space (`flex: 1`). A drag handle between skill and test panels updates skill panel width via pointer events.

```typescript
// src/components/layout/AppShell.tsx
import { useState, useCallback, useRef } from "react";

export function AppShell() {
  const [skillPanelWidth, setSkillPanelWidth] = useState(240);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = skillPanelWidth;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [skillPanelWidth]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(160, Math.min(480, startWidth.current + delta));
    setSkillPanelWidth(newWidth);
  }, []);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", minWidth: 1024 }}>
      {/* Sidebar — fixed 220px */}
      <aside style={{ width: 220, minWidth: 220, background: "var(--bg-secondary)" }}>
        {/* AgentList placeholder */}
      </aside>

      {/* Skill panel — resizable */}
      <div style={{ width: skillPanelWidth, minWidth: 160, background: "var(--bg-primary)", borderRight: "0.5px solid var(--border-subtle)" }}>
        {/* SkillBrowser placeholder */}
      </div>

      {/* Drag handle */}
      <div
        style={{ width: 4, cursor: "col-resize", background: "transparent" }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      />

      {/* Test panel — flexible */}
      <div style={{ flex: 1, minWidth: 0, background: "var(--bg-primary)" }}>
        {/* TestPanel placeholder */}
      </div>
    </div>
  );
}
```

### Pattern 7: Error Type (Foundation for All Commands)

**Build this first — all commands depend on it:**

```rust
// src-tauri/src/error.rs
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("HTTP error: {0}")]
    Http(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

// Convert common error types
impl From<tauri_plugin_sql::Error> for AppError {
    fn from(e: tauri_plugin_sql::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Http(e.to_string())
    }
}
```

### Anti-Patterns to Avoid

- **Using `allowlist` in tauri.conf.json:** This is Tauri v1 syntax — it causes a hard build error in v2. Use capabilities files only.
- **Multiple `.invoke_handler()` calls:** Only the last call wins. Use a single `collect_commands!` via tauri-specta.
- **Missing `#[specta::specta]` on commands:** Command will be excluded from bindings.ts silently. Both attributes are required.
- **`std::sync::Mutex` in async commands:** `MutexGuard` is not `Send`. Use `tokio::sync::Mutex` for all mutable AppState fields accessed from async commands.
- **Drizzle migrate() in webview:** Calls Node.js `fs` — does not exist in WebView. Use tauri-plugin-sql's Rust-side Migration structs.
- **Loading Monaco at startup:** Adds ~1.5MB JS parse time, breaks < 2s cold start. Install the npm package now; defer actual loading to Phase 3 with dynamic import.
- **Tailwind v3 patterns in v4 project:** Do not create `tailwind.config.js`. Do not use `@tailwind base/components/utilities`. Use `@import "tailwindcss"` only.
- **System fonts for JetBrains Mono:** Windows does not ship JetBrains Mono. Bundle both fonts as WOFF2 in `public/fonts/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window size/position persistence | Custom localStorage logic | tauri-plugin-window-state | Handles multi-monitor, OS-specific quirks, resize events |
| SQLite migrations | Custom migration runner | tauri-plugin-sql Migration structs | Built-in versioning, safe upgrade paths, no filesystem dependency |
| OS keychain access | Custom keyring abstraction | tauri-plugin-keyring | Wraps macOS Keychain, Windows Credential Manager, Linux Secret Service correctly |
| TypeScript bindings from Rust | Manual type definitions | tauri-specta | Auto-generated from Rust types; compile-time correctness |
| Resizable panels from scratch | Pointer events from zero | CSS flex + pointer capture (see Pattern 6) | The pattern is simple enough to own; no library needed at this scale |
| Font loading | Relying on system fonts | Bundle WOFF2 + @font-face | Cross-platform consistency; JetBrains Mono absent on Windows |

**Key insight:** The Tauri plugin ecosystem covers all infrastructure concerns correctly. The only hand-rolled item is the resize handle, which is simple enough that a library would add more complexity than it removes.

---

## Common Pitfalls

### Pitfall 1: Capabilities ACL — Silent Failures
**What goes wrong:** Plugin commands return opaque "not allowed" errors. No Rust compile error, no network error — just a rejected promise.
**Why it happens:** Tauri v2 starts at zero permissions. Every plugin capability must be explicitly listed.
**How to avoid:** Create `capabilities/default.json` as the first file. Add `sql:allow-load`, `sql:allow-execute`, `sql:allow-select`, `sql:allow-close`, `window-state:allow-restore-state`, `window-state:allow-save-window-state`, `store:allow-get`, `store:allow-set`, `store:allow-save` before running any plugin-dependent code.
**Warning signs:** Promise rejections with "not allowed" message; plugin commands that succeed in testing but fail fresh install.

### Pitfall 2: SQLite Locked Without WAL Mode
**What goes wrong:** Intermittent "database is locked" errors under concurrent async commands.
**Why it happens:** SQLite default journal mode allows only one writer. Async Rust commands can collide.
**How to avoid:** First migration must include `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;` — do this before any other schema work.
**Warning signs:** `SqliteError: database is locked` in Rust logs.

### Pitfall 3: tauri-specta — Missing `#[specta::specta]`
**What goes wrong:** Command exists in Rust and is callable via raw `invoke()` but is absent from `bindings.ts`. Frontend code using the generated bindings will get a TypeScript compile error.
**Why it happens:** `collect_commands!` requires both `#[tauri::command]` and `#[specta::specta]` on each function.
**How to avoid:** Add both attributes to every command. Create a lint/grep check in CI if desired.
**Warning signs:** Command missing from bindings.ts; TypeScript error on `commands.myCommand`.

### Pitfall 4: std::sync::Mutex in Async Commands
**What goes wrong:** Rust compile error: "future cannot be sent between threads safely."
**Why it happens:** `std::sync::MutexGuard` is not `Send`; Tokio's multi-threaded runtime requires `Send` futures.
**How to avoid:** Use `tokio::sync::Mutex` for all mutable AppState fields. Establish this in `state.rs` from day one.
**Warning signs:** Compile error mentioning `MutexGuard` not being `Send`.

### Pitfall 5: Cross-Platform Font Fallback
**What goes wrong:** App looks correct on macOS (Inter and JetBrains Mono installed by many devs) but on Windows shows system default monospace (Courier New), completely breaking the mockup visual language.
**Why it happens:** Neither Inter nor JetBrains Mono are system fonts on Windows or Linux.
**How to avoid:** Bundle WOFF2 variable font files in `public/fonts/`. Define `@font-face` in `index.css` before `@import "tailwindcss"`.
**Warning signs:** Monospace fallback visible on first Windows test run.

### Pitfall 6: Monaco at Startup Breaks < 2s Launch
**What goes wrong:** Cold start exceeds 2s UIUX-05 requirement because Monaco's JS bundle (~1.5MB) parses on app open.
**Why it happens:** If `@monaco-editor/react` is imported at the top of any component that renders on startup, the bundle is parsed synchronously.
**How to avoid:** Install the npm packages now (to lock versions). Do NOT import them anywhere until Phase 3. Use `React.lazy()` + dynamic `import()` when Phase 3 integrates Monaco.
**Warning signs:** `tauri dev` startup time measured > 2s; bundle analysis shows monaco in initial chunk.

### Pitfall 7: tauri-plugin-keyring Stability on Linux
**What goes wrong:** On Linux systems without GNOME Keyring or KWallet (e.g., minimal server desktops, CI), keyring write fails silently or throws.
**Why it happens:** `tauri-plugin-keyring` wraps the Rust `keyring` crate which requires a D-Bus Secret Service implementation.
**How to avoid:** Wrap all keyring calls in try/catch. Design the credential storage module with two backends: (1) keyring when available, (2) AES-encrypted SQLite column using a machine-derived key as fallback. Implement the abstraction layer in Phase 1 even if only the happy path is exercised.
**Warning signs:** Keyring errors on headless Linux; credential save succeeds but retrieve returns empty.

---

## Code Examples

### Tauri Window Configuration (tauri.conf.json)

```json
{
  "productName": "A2A Workbench",
  "identifier": "com.a2aworkbench.app",
  "app": {
    "windows": [
      {
        "title": "A2A Workbench",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 640,
        "decorations": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-eval'; worker-src blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: https://asset.localhost"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all"
  }
}
```

Note: `worker-src blob:` and `script-src 'unsafe-eval'` are required by Monaco Editor (Phase 3). Establishing them in Phase 1 avoids a CSP-related regression when Monaco is integrated.

### Zustand uiStore

```typescript
// src/stores/uiStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeOverride = "system" | "light" | "dark";

interface UiState {
  themeOverride: ThemeOverride;
  skillPanelWidth: number;
  sidebarCollapsed: boolean;

  setThemeOverride: (theme: ThemeOverride) => void;
  setSkillPanelWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeOverride: "system",
      skillPanelWidth: 240,
      sidebarCollapsed: false,

      setThemeOverride: (theme) => set({ themeOverride: theme }),
      setSkillPanelWidth: (width) => set({ skillPanelWidth: width }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "a2a-ui-state",  // localStorage key
      partialize: (state) => ({
        themeOverride: state.themeOverride,
        skillPanelWidth: state.skillPanelWidth,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

### AppEntry with QueryClient and Theme

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `allowlist` in tauri.conf.json | Capabilities ACL JSON files in `capabilities/` | Tauri 2.0 (2024) | All permission grants must be migrated; v1 docs are wrong |
| `tailwind.config.js` + PostCSS | `@import "tailwindcss"` in CSS + `@tailwindcss/vite` plugin | Tailwind 4.0 (Jan 2025) | No config file needed; v3 docs are wrong |
| `@tailwind base/components/utilities` directives | Single `@import "tailwindcss"` | Tailwind 4.0 | Old three-directive pattern causes errors in v4 |
| `tauri-plugin-stronghold` for credentials | `tauri-plugin-keyring` | 2024 — Stronghold officially deprecated | Stronghold will be removed in Tauri v3 |
| `generate_handler!` directly | `collect_commands!` via tauri-specta | tauri-specta v2 (2024) | Combines handler registration with type introspection |

**Deprecated/outdated:**
- `tauri-plugin-stronghold`: Officially deprecated by Tauri team, will be removed in v3. Do not use.
- Tailwind `tailwind.config.js`: Unnecessary in v4; creates confusion. Do not create.
- `allowlist` block in tauri.conf.json: Hard error in Tauri v2. Do not use.

---

## Performance Notes (UIUX-05: < 2s Launch)

The < 2s cold start on M2 Mac / Ryzen 5 is achievable with this stack IF:

1. Monaco Editor is NOT imported on startup (deferred to Phase 3 via dynamic import)
2. `tauri-plugin-window-state` handles size restoration — avoid JS-side layout recalculation
3. The initial React render is shallow: App shell + three empty panels with placeholders, no data fetching at mount
4. Tailwind 4's CSS-based config produces smaller CSS bundles (no unused utilities when using @import "tailwindcss")
5. `@vitejs/plugin-react-swc` is used (faster than Babel transform)

Measurement: Use `tauri dev` with browser DevTools Performance tab. Measure from process start to first contentful paint. If Monaco is accidentally included in the initial bundle, it will push past 2s on the first load.

---

## Open Questions

1. **tauri-plugin-keyring on Linux without Secret Service**
   - What we know: Plugin wraps `keyring` crate; requires D-Bus Secret Service
   - What's unclear: Exact failure mode and error type when service is absent; whether the crate returns an error or panics
   - Recommendation: In Phase 1, write a credential abstraction module with a `store_credential(key, value) -> Result<(), CredentialError>` interface that tries keyring first and falls back to an AES-encrypted SQLite approach. Implement happy-path only; leave fallback as a TODO stub with a clear error message.

2. **tauri-specta version pinning**
   - What we know: Latest RC is 2.0.0-rc.21 (2025-01-13 per docs.rs); still in RC phase
   - What's unclear: Breaking changes between RC versions; whether a stable 2.0.0 release is imminent
   - Recommendation: Pin the exact version in Cargo.toml (`tauri-specta = "=2.0.0-rc.21"`). Do not use `"2"` version constraint which might pull a breaking RC. Check the GitHub repo for stable release before Phase 2 starts.

3. **Font file format and licensing**
   - What we know: Inter and JetBrains Mono are both open-source (OFL license)
   - What's unclear: Whether variable font WOFF2 files should be self-hosted or if a CDN import works reliably in the Tauri webview (it does not for offline use)
   - Recommendation: Download variable WOFF2 files from official sources and commit them to `public/fonts/`. Inter variable font from rsms.me/inter; JetBrains Mono from JetBrains GitHub releases.

---

## Validation Architecture

> nyquist_validation is enabled (config.json has `"nyquist_validation": true`)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (matches Vite 6 stack; zero config with vite.config.ts) |
| Config file | None — Wave 0 creates `vite.config.ts` vitest block |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

Note: Rust-side testing uses `cargo test` in `src-tauri/`. Phase 1 Rust tests are integration-level (DB migration smoke tests). Frontend tests use Vitest with `@testing-library/react`.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UIUX-01 | Three-panel layout renders with correct widths (220px sidebar, 240px skill, flex test) | unit | `npx vitest run src/components/layout/AppShell.test.tsx` | Wave 0 |
| UIUX-01 | Drag handle changes skillPanelWidth state | unit | `npx vitest run src/components/layout/ResizeHandle.test.tsx` | Wave 0 |
| UIUX-02 | Dark theme CSS vars applied when data-theme="dark" | unit | `npx vitest run src/hooks/useTheme.test.ts` | Wave 0 |
| UIUX-02 | uiStore persists themeOverride to localStorage | unit | `npx vitest run src/stores/uiStore.test.ts` | Wave 0 |
| UIUX-05 | Monaco is NOT in the initial JS bundle (no import at startup) | unit | `npx vitest run src/__tests__/bundle-safety.test.ts` | Wave 0 |
| SECR-01 | No `fetch()` or `XMLHttpRequest` calls exist in React components | static analysis | `grep -r "fetch(" src/components src/stores src/hooks` | Grep check |
| SECR-02 | Credential storage abstraction routes to keyring, not SQLite plaintext | unit | `cargo test --manifest-path src-tauri/Cargo.toml` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && cargo test --manifest-path src-tauri/Cargo.toml`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/layout/AppShell.test.tsx` — covers UIUX-01 (panel widths)
- [ ] `src/components/layout/ResizeHandle.test.tsx` — covers UIUX-01 (drag behavior)
- [ ] `src/hooks/useTheme.test.ts` — covers UIUX-02 (theme application)
- [ ] `src/stores/uiStore.test.ts` — covers UIUX-02 (persistence)
- [ ] `src/__tests__/bundle-safety.test.ts` — covers UIUX-05 (no Monaco at startup)
- [ ] `src-tauri/src/tests/db_migration.rs` — covers SQLite WAL + schema smoke test
- [ ] Vitest install: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom` — if not present after scaffold
- [ ] `vite.config.ts` vitest config block — add `test: { environment: "jsdom" }` section

---

## Sources

### Primary (HIGH confidence)
- STACK.md (`.planning/research/STACK.md`) — verified library versions against official docs 2026-03-24
- ARCHITECTURE.md (`.planning/research/ARCHITECTURE.md`) — system architecture patterns from official Tauri 2 docs
- PITFALLS.md (`.planning/research/PITFALLS.md`) — pitfalls verified against Tauri GitHub issues and official docs
- [specta.dev/docs/tauri-specta/v2](https://specta.dev/docs/tauri-specta/v2) — tauri-specta v2 official docs
- [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) — Tailwind 4 CSS-based config confirmed
- [v2.tauri.app/security/capabilities/](https://v2.tauri.app/security/capabilities/) — capabilities ACL system
- [v2.tauri.app/plugin/sql/](https://v2.tauri.app/plugin/sql/) — Migration struct API

### Secondary (MEDIUM confidence)
- WebSearch: tauri-specta 2.0.0-rc.21 version confirmed via docs.rs changelog reference (2025-01-13)
- WebSearch: Tailwind 4 + Vite setup patterns confirmed against multiple guides aligning with official docs
- [github.com/specta-rs/tauri-specta](https://github.com/specta-rs/tauri-specta) — collect_commands! and #[specta::specta] requirement confirmed

### Tertiary (LOW confidence)
- None for Phase 1 scope — all critical claims have HIGH or MEDIUM verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions from STACK.md verified against official sources on 2026-03-24
- Architecture patterns: HIGH — from official Tauri 2 docs and ARCHITECTURE.md
- Pitfalls: HIGH — from PITFALLS.md sourced against Tauri GitHub issues and official docs
- tauri-specta #[specta::specta] requirement: HIGH — confirmed via official specta.dev docs and GitHub
- Tailwind 4 vite setup: HIGH — confirmed against tailwindcss.com official blog and install guide
- tauri-plugin-keyring stability: MEDIUM — v0.1.0, unstable, platform behavior not fully documented

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days — all libraries are stable except tauri-specta RC which may release stable)
