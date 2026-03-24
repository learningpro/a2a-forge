# Pitfalls Research

**Domain:** Tauri 2.x desktop app — protocol testing tool (A2A Workbench)
**Researched:** 2026-03-24
**Confidence:** HIGH (official Tauri docs, GitHub issues, verified community patterns)

---

## Critical Pitfalls

### Pitfall 1: Tauri v2 Permissions System — Zero Access by Default

**What goes wrong:**
The app silently fails to invoke any plugin (SQL, HTTP, keychain) with cryptic "not allowed" errors. Developers waste hours debugging Rust code when the problem is a missing capability declaration. The old Tauri v1 `allowlist` key in `tauri.conf.json` throws a hard config error in v2 — it is completely invalid.

**Why it happens:**
Tauri v2 replaced the `allowlist` block with a capabilities ACL system. Every plugin command starts disabled. Permissions must be declared in JSON files under `src-tauri/capabilities/`. Developers migrating from v1 examples, or copying v1 documentation, ship broken configs without understanding why.

**How to avoid:**
- Never place `allowlist` in `tauri.conf.json` — it will error on build.
- Create `src-tauri/capabilities/default.json` at project start, granting only needed permissions.
- For filesystem plugins, pair every `fs:allow-*` string with an explicit `allow: [{ "path": "$HOME/**/*" }]` scope object — bare permission strings do not apply scope and will still throw "forbidden path."
- After `tauri migrate`, manually verify every generated permission name against official docs — the migrator generates incorrect names (e.g., `clipboard-manager:allow-read` instead of `clipboard-manager:allow-read-text`).
- Required permissions for this project: `sql:allow-load`, `sql:allow-execute`, `sql:allow-select`, `sql:allow-close`, `http:default` with explicit URL scope.

**Warning signs:**
- Any "not allowed" or "forbidden path" error at runtime from a plugin call.
- Build error mentioning "Additional properties are not allowed ('allowlist' was unexpected)."
- Plugin commands returning promise rejections without network errors.

**Phase to address:** Phase 1 (Foundation/Scaffold) — establish the capabilities file before writing any plugin-dependent code.

---

### Pitfall 2: SSE Streaming Requires Rust-Side Implementation — No Native JS EventSource

**What goes wrong:**
The browser's native `EventSource` API does not work in Tauri's webview for cross-origin A2A agent URLs because the webview origin (`tauri://localhost`) triggers CORS rejections at the agent server. Attempting to use `fetch()` with `ReadableStream` from JS hits the same CORS wall. The task streaming feature (`tasks/sendSubscribe`) silently fails or returns empty responses.

**Why it happens:**
Tauri webview requests have a null or `tauri://localhost` origin. External A2A agent servers enforce CORS. HTTP/SSE from the webview layer cannot circumvent this without a proxy.

**How to avoid:**
The project decision to do "HTTP requests from Rust backend only" is correct and must be maintained. Implement SSE in Rust using `reqwest` + `futures_util::StreamExt` and emit each SSE chunk as a Tauri event to the frontend. The pattern:

```rust
// Rust: stream SSE, emit per-chunk Tauri events
use futures_util::StreamExt;
#[tauri::command]
pub async fn subscribe_task(app: AppHandle, url: String, ...) -> Result<(), String> {
    let mut stream = client.get(&url).send().await?.bytes_stream();
    while let Some(chunk) = stream.next().await {
        app.emit("sse-chunk", payload)?;
    }
    Ok(())
}
```

Frontend listens via `listen("sse-chunk", handler)`. Do not attempt `tauri-plugin-cors-fetch` for A2A — it adds unnecessary complexity and is an unofficial plugin.

**Warning signs:**
- CORS errors in the webview console when calling agent URLs.
- `EventSource` connected but never receiving messages.
- `fetch()` returning empty body for SSE endpoints.

**Phase to address:** Phase 2 (Agent card fetching and first HTTP calls) — establish the Rust HTTP pattern before any SSE work.

---

### Pitfall 3: Monaco Editor Web Workers Silently Fail in Tauri Webview

**What goes wrong:**
Monaco Editor silently falls back to single-threaded mode when Web Workers fail to initialize. Symptoms: JSON validation works but is sluggish, IntelliSense may be absent, no console error in production builds. The editor appears to function but is degraded.

**Why it happens:**
Monaco uses Web Workers for language services (syntax validation, IntelliSense). In Tauri's webview, `blob:` URLs for workers are blocked by default CSP. The CSP directive `worker-src blob:` is not in Tauri's default policy.

**How to avoid:**
- Use `vite-plugin-monaco-editor` (or `@monaco-editor/react` which handles workers automatically) — these bundler plugins configure worker URLs correctly for non-browser environments.
- Add to `tauri.conf.json` CSP: `"worker-src": "blob:"` and `"script-src": "'self' 'unsafe-eval'"` (Monaco requires `unsafe-eval` for its parser).
- Do NOT attempt `--disable-web-security` via `additionalBrowserArgs` — this causes a fatal WebView2 crash on Windows (`0x8007139F`).
- Verify workers are running: Monaco exposes `monaco.editor.getModels()` — check that language service is active by triggering a syntax error and confirming it's caught.

**Warning signs:**
- Browser console: `"Could not create web worker(s). Falling back to loading web workers..."`.
- JSON syntax errors not highlighted in the editor.
- No autocomplete suggestions in JSON editor mode.

**Phase to address:** Phase 3 (Test panel / JSON input) — configure Monaco correctly when first integrating the editor.

---

### Pitfall 4: SQLite Concurrent Writes Without WAL Mode

**What goes wrong:**
The app intermittently throws "database is locked" errors when the UI writes test history while a background polling task also writes task state. In the worst case, writes fail silently and history is lost.

**Why it happens:**
SQLite's default journal mode (DELETE/rollback) only allows one writer at a time. In a Tauri app with async Rust commands and a React frontend firing concurrent IPC calls, multiple commands can attempt writes simultaneously. `tauri-plugin-sql` uses `sqlx` under the hood, which does not default to WAL mode.

**How to avoid:**
- Enable WAL mode immediately after establishing the connection: `PRAGMA journal_mode=WAL;` as the first migration or connection setup step.
- Use `SqliteConnectOptions::new().journal_mode(SqliteJournalMode::Wal)` if accessing `sqlx` directly.
- Keep write operations in a single Rust command handler (not split across multiple concurrent IPC calls) when possible.
- Set `PRAGMA busy_timeout = 5000;` to prevent immediate lock errors during brief contention.

**Warning signs:**
- `SqliteError: database is locked` in Rust logs.
- Test history records occasionally missing after sessions.
- App works fine in single-use but fails under rapid repeated testing.

**Phase to address:** Phase 1 (Database initialization) — set WAL mode in the first migration before any feature work.

---

### Pitfall 5: SQLite Migrations Cannot Use Node.js Filesystem APIs

**What goes wrong:**
If Drizzle ORM (or any Node-filesystem-dependent migrator) is used for migrations, it will fail at runtime in the Tauri webview because `fs` module does not exist in WebView. The app builds fine but crashes on migration on first launch.

**Why it happens:**
Tauri's webview is not Node.js. Drizzle's built-in `migrate()` calls `readMigrationFiles()` which uses `require('fs')` — unavailable in WebView context.

**How to avoid:**
- Use `tauri-plugin-sql`'s built-in migration system (Rust-side `Migration` structs with unique version numbers). This is the correct approach for this project.
- If Drizzle schema tooling is wanted for DX, use `import.meta.glob` to inline SQL files at Vite build time, then pass the SQL strings to `tauri-plugin-sql` migrations.
- Never import Drizzle's `migrate()` function in the webview context.

**Warning signs:**
- `Cannot find module 'fs'` error at app startup.
- First launch crash with migration-related stack trace.
- Works in `tauri dev` but fails in `tauri build`.

**Phase to address:** Phase 1 (Database schema) — decide migration strategy before writing any schema.

---

### Pitfall 6: Cross-Platform WebView Rendering Differences

**What goes wrong:**
UI looks correct on macOS (WKWebView/WebKit) but breaks on Windows (WebView2/Chromium) or Linux (WebKitGTK). Common failure modes: font metrics differ causing truncated labels, CSS `gap` or `grid` properties render differently, JetBrains Mono may not be installed on Windows causing fallback to a completely different monospace font, scrollbar styling ignored on WebKit.

**Why it happens:**
Tauri uses three different rendering engines: WKWebView on macOS/iOS, WebView2 (Chromium) on Windows, WebKitGTK on Linux. These are different engine versions with different CSS and JS support levels. Unlike Electron which bundles a single Chromium everywhere, Tauri inherits whatever version the OS ships.

**How to avoid:**
- Bundle all fonts (JetBrains Mono, Inter) as web fonts in the app bundle — never rely on system fonts being present.
- Test on all three platforms from Phase 1. Do not defer Windows/Linux testing to end of project.
- Use Tailwind CSS with explicit sizing (avoid relying on browser default margins/padding that differ by engine).
- Avoid scrollbar CSS pseudo-elements — they are WebKit-only and silently ignored on other engines.
- Linux: verify `webkit2gtk 4.1` is installed (Ubuntu 22.04+). Tauri v2 requires `4.1`; `4.0` causes build failure.

**Warning signs:**
- Visual regression found only on one OS during first cross-platform test.
- Missing fonts in Windows build — monospace fallback is Courier New, visually jarring.
- Build failure on Linux with WebKitGTK version error.

**Phase to address:** Phase 1 (Layout/theming) — use bundled fonts and test cross-platform from the first UI build.

---

### Pitfall 7: macOS Code Signing and Notarization Required for Distribution

**What goes wrong:**
macOS displays "this app is damaged and can't be opened" for unsigned/un-notarized builds sent to testers. The app is completely unusable without either notarization or explicit user whitelist bypass in System Settings > Privacy & Security.

**Why it happens:**
macOS Gatekeeper requires apps distributed outside the App Store to be signed with a Developer ID Application certificate AND notarized via Apple's notary service. A free Apple Developer account cannot notarize. Ad-hoc signing (for development) requires users to manually approve.

**How to avoid:**
- Get a paid Apple Developer account ($99/year) before any external distribution.
- Use `notarytool` (not deprecated `altool`) for notarization — `altool` was sunset in late 2023.
- Set `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and `APPLE_TEAM_ID` env vars for CI.
- Create `src-tauri/Entitlements.plist` with `com.apple.security.cs.allow-jit` — WebView requires JIT.
- macOS GUI apps do NOT inherit shell `$PATH` — use Tauri's `fix-path-env` crate if shelling out to external tools.
- Windows SmartScreen blocks unsigned `.exe` files — plan for Windows signing from the start.

**Warning signs:**
- Testers report "app is damaged" on macOS.
- First-time users on Windows see SmartScreen warning blocking launch.
- CI build hangs at notarization step (can take 30+ minutes on first submission).

**Phase to address:** Distribution phase — establish signing before any external beta distribution.

---

### Pitfall 8: Rust Async Command Borrowing Limitations

**What goes wrong:**
Async Tauri commands that accept `&str` parameters or hold `MutexGuard` across `.await` points fail to compile with confusing lifetime errors. Commands that work synchronously break when converted to `async`.

**Why it happens:**
Tauri's async runtime is multi-threaded Tokio. Async commands must be `Send`. `std::sync::MutexGuard` is intentionally not `Send`. `&str` and other borrowed types cannot be used directly in `async` command signatures.

**How to avoid:**
- Replace `&str` parameters with `String` in all async command signatures.
- Always return `Result<T, String>` from async commands (required by Tauri).
- Use `std::sync::Mutex` for state, but release the lock before any `.await`: `{ let val = state.lock().unwrap().clone(); } /* await here */`.
- If you must hold a lock across `.await`, switch to `tokio::sync::Mutex` — its guard is `Send`.
- Do not wrap state in `Arc` manually — Tauri's `State<T>` already handles this.

**Warning signs:**
- `future cannot be sent between threads safely` compile error.
- `std::sync::MutexGuard<...>` is not `Send` compile error.
- `cannot return reference to local data` lifetime errors in command functions.

**Phase to address:** Phase 1 (Rust command scaffold) — establish the correct async command patterns in the first Rust commands written.

---

### Pitfall 9: IPC Large Data Serialization Overhead

**What goes wrong:**
Returning large JSON blobs (full task history, large SSE response bodies) through the standard Tauri IPC `invoke()` path is slow. Every return value is serialized to JSON, transferred through the IPC bridge, then deserialized in JS. For A2A responses that include base64-encoded images or large text, this creates perceptible UI lag.

**Why it happens:**
Tauri's IPC is designed for structured commands, not bulk data transfer. JSON serialization of large payloads is the bottleneck, not the network request itself.

**How to avoid:**
- For binary data (file downloads from A2A responses), use `tauri::ipc::Response` with `Content-Type` header instead of returning base64 in JSON.
- For large JSON response bodies, paginate history queries — never return unbounded lists.
- Store raw response bodies in SQLite; return only display-relevant fields to the frontend via IPC.
- Use Tauri events (not command return values) for streaming SSE chunks — events bypass the IPC serialization roundtrip for fire-and-forget payloads.

**Warning signs:**
- UI freezes briefly after receiving large A2A responses.
- `invoke()` calls taking >100ms in profiling that don't involve network.
- Memory spike when loading test history.

**Phase to address:** Phase 2 (First end-to-end A2A request) — establish the data flow pattern before history/streaming features.

---

### Pitfall 10: A2A Protocol Immaturity — Spec Changes Break Assumptions

**What goes wrong:**
The A2A protocol (announced April 2025, now Linux Foundation) is still evolving. Field names, error codes, task lifecycle state machine transitions, and SSE event types may change between spec versions. Hardcoded assumptions about agent card structure or task payload shape break against newer agents.

**Why it happens:**
A2A is under active development. The spec has already evolved since initial Google announcement. Agent implementations from different vendors may implement different spec versions.

**How to avoid:**
- Parse agent cards defensively — use optional fields for anything not in the core spec, handle unknown fields gracefully.
- Version-stamp agent card data in SQLite so schema can be migrated if spec changes.
- Do not assume task lifecycle states are exhaustive — handle unknown state strings without crashing.
- Subscribe to the `a2aproject/A2A` GitHub repository for spec changes.
- Display raw JSON alongside parsed views so users can debug agents that deviate from spec.

**Warning signs:**
- A known agent card fails to parse despite valid JSON.
- Unknown task state causes UI to get stuck in "working" state.
- Field that was present in test agent is missing in production agent.

**Phase to address:** Phase 2 (Agent card parsing) — design all parsers with optional fields from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `dangerouslySetInnerHTML` for A2A markdown responses | Fast render | XSS if agent returns malicious content | Never — use a sanitized markdown renderer |
| Skip WAL mode, fix "later" | Simpler init | Database lock errors appear under real usage | Never — set WAL in first migration |
| Do HTTP from webview JS with CORS workaround | Faster initial build | CORS failures against real agents, security bypass | Never for production |
| Single SQLite connection without connection pool | Simpler setup | Lock contention under concurrent reads/writes | Only for first prototype, fix before any beta |
| Hardcode agent card field names without optional handling | Faster parsing code | App breaks against any non-reference agent | Never — A2A spec is still evolving |
| Bundle Monaco with all languages enabled | Zero config | ~4MB bundle size increase, slow webview load | Acceptable only in early dev; restrict to JSON/plaintext for release |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `tauri-plugin-sql` | Calling `load()` from JS before Tauri is initialized | Wait for `onMounted` / after `invoke` readiness; wrap in try/catch |
| `tauri-plugin-sql` | Forgetting `sql:allow-execute` in capabilities | Add all four SQL permissions: load, execute, select, close |
| `plugin-http` (Rust) | Trying to read `reqwest::Response` body twice | Buffer with `.bytes().await` or `.text().await` — body is consumed on first read |
| A2A SSE (`tasks/sendSubscribe`) | Using JS `EventSource` directly against agent URL | Implement in Rust with `reqwest` + `StreamExt`, emit Tauri events per chunk |
| Monaco Editor | Importing `monaco-editor` directly without worker config | Use `@monaco-editor/react` or `vite-plugin-monaco-editor` to handle worker URLs |
| OS Keychain | Storing API keys as JS strings in Zustand state | Store in OS keychain via `tauri-plugin-keychain`; only load into memory when needed for a request |
| SQLite migrations | Adding `ALTER TABLE` without a new migration version | Always increment version number; never modify existing migration SQL |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded test history queries | History tab slow to load; app memory grows over sessions | Always paginate: `LIMIT 100 OFFSET ?` | After ~500 test records |
| Monaco loaded on app startup | Cold start > 2s (violates < 2s requirement) | Lazy-load Monaco only when test panel is first opened | Immediately — ~1.5MB JS to parse |
| Polling `tasks/get` with no backoff | CPU spin + agent rate limiting | Exponential backoff: start at 1s, max at 10s, stop after timeout | With async tasks that run >30s |
| Full agent card re-fetch on every app open | Network call blocks UI on startup | Cache card in SQLite with TTL; re-fetch in background | With agents on slow networks |
| Emitting every raw SSE byte as separate Tauri event | IPC bus flooding, janky UI updates | Buffer SSE lines; emit on `\n\n` (full SSE event boundary) | With high-frequency SSE agents |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in SQLite plaintext | Keys readable if device is stolen; SQLite has no encryption | Use `tauri-plugin-keychain` for all credentials; store only key identifiers in SQLite |
| Rendering A2A markdown responses without sanitization | XSS from malicious agent response | Use `DOMPurify` before passing content to `dangerouslySetInnerHTML`; prefer `react-markdown` with `rehype-sanitize` |
| Logging full HTTP requests including auth headers | Credentials in log files | Redact `X-API-Key`, `Authorization` headers in any logging; never log request bodies |
| Accepting user-provided URLs without validation | SSRF — app could be weaponized to probe internal networks | Validate URL scheme is `http://` or `https://`; warn (but allow) non-standard ports |
| Disabling CSP entirely for Monaco | Full XSS exposure | Use targeted CSP relaxation: `script-src 'unsafe-eval'`, `worker-src blob:` only |
| Including telemetry on by default | Privacy violation for a developer tool | Default `telemetry: false`; explicit opt-in only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No distinction between "agent unreachable" and "agent returned error" | User doesn't know if their URL is wrong or the agent is broken | Separate network errors (DNS/timeout) from A2A protocol errors (task failed) with distinct UI states |
| Showing raw JSON task state without lifecycle visualization | Users don't know if a task is still running or silently stuck | Show explicit lifecycle badge: submitted / working / completed / failed / canceled |
| No timeout indicator for long-running async tasks | User waits indefinitely, assumes app is frozen | Show elapsed time counter; auto-cancel after configured timeout with user notification |
| History cleared without confirmation | Test data lost accidentally | Require explicit confirmation with item count; offer per-card clear vs global clear |
| Curl export copies command without auth headers | Exported command fails; user confused | Always include configured auth headers in curl export; warn if credentials would be exposed |
| SSE stream displayed only as final result | User sees nothing during long generation tasks | Stream partial results into the response viewer incrementally |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSE streaming:** Verify chunks arrive incrementally in UI — not all at once on stream close. Test with a slow agent (>5s response).
- [ ] **Auth headers:** Verify `X-API-Key` header actually reaches the agent — Tauri's `plugin-http` scope must explicitly allow the target URL glob.
- [ ] **SQLite history:** Verify history persists across full app restart (not just hot reload of dev server).
- [ ] **Monaco JSON validation:** Trigger a syntax error in the JSON input — confirm red squiggly appears (confirms workers are running).
- [ ] **Agent card refresh:** Delete an agent and re-add — confirm stale SQLite data is not returned from cache.
- [ ] **Cross-platform fonts:** Launch the app on Windows — confirm JetBrains Mono renders (not Courier New fallback).
- [ ] **Task timeout:** Set a 5-second timeout in settings, run a task expected to take 30s — confirm timeout fires and UI updates.
- [ ] **Proxy support:** Configure a test proxy, make a request — confirm Tauri's `reqwest` client uses the proxy (not the system proxy automatically).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong permissions in capabilities file | LOW | Add correct permission strings to `capabilities/default.json`; hot-reload in dev |
| SSE implemented in wrong layer (JS instead of Rust) | HIGH | Rewrite network layer; move all HTTP to Rust commands; update all call sites |
| SQLite schema locked in without migrations | HIGH | Add migration version 2 with `ALTER TABLE`; test upgrade path from v1 schema |
| Monaco workers broken in production build | MEDIUM | Add CSP directives; reconfigure Vite plugin; rebuild and verify |
| Cross-platform visual regressions | MEDIUM | Audit CSS; add cross-platform visual tests; may require platform-specific CSS overrides |
| Code signing not set up before beta | MEDIUM | Purchase Apple Developer account; generate certs; rebuild signed installer (no code changes needed) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Permissions system misuse | Phase 1: Foundation | All plugin calls succeed; no "not allowed" errors on fresh install |
| SSE in wrong layer | Phase 1/2: HTTP architecture | SSE implemented exclusively via Rust commands + Tauri events |
| Monaco Web Worker failure | Phase 3: Test panel | JSON syntax error triggers red squiggly in editor |
| SQLite WAL mode | Phase 1: Database init | Run concurrent write test; no lock errors |
| SQLite migration strategy | Phase 1: Database schema | Migrations run on first launch; upgrade from v1 schema works |
| Cross-platform rendering | Phase 1+: Ongoing | Build and launch on all 3 platforms after each major UI change |
| macOS notarization | Distribution phase | Test install from `.dmg` on a machine not in developer keychain |
| Rust async patterns | Phase 1: Rust scaffold | All async commands compile; state locked correctly |
| IPC data overhead | Phase 2: First A2A request | `invoke()` latency <50ms for paginated results |
| A2A spec defensiveness | Phase 2: Agent card parser | Unknown fields ignored; unknown task states handled gracefully |

---

## Sources

- [Tauri v2 Permissions System](https://v2.tauri.app/security/permissions/)
- [Tauri v2 Capabilities](https://v2.tauri.app/security/capabilities/)
- [Using Plugin Permissions](https://v2.tauri.app/learn/security/using-plugin-permissions/)
- [Tauri v2 HTTP Client](https://v2.tauri.app/plugin/http-client/)
- [Tauri v2 SQL Plugin](https://v2.tauri.app/plugin/sql/)
- [Tauri v2 CSP](https://v2.tauri.app/security/csp/)
- [Tauri v2 State Management](https://v2.tauri.app/develop/state-management/)
- [Tauri v2 macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Webview Versions](https://v2.tauri.app/reference/webview-versions/)
- [GitHub: fs unscoped permissions bug](https://github.com/tauri-apps/tauri-docs/issues/3536)
- [GitHub: tauri migrate incorrect permissions](https://github.com/tauri-apps/tauri/issues/10185)
- [GitHub: SSE feature request](https://github.com/tauri-apps/plugins-workspace/issues/1002)
- [GitHub: Monaco webworker in Tauri](https://github.com/orgs/tauri-apps/discussions/9595)
- [GitHub: disable-web-security WebView2 crash](https://github.com/tauri-apps/tauri/issues/9827)
- [Cross-platform layout differences discussion](https://github.com/orgs/tauri-apps/discussions/12311)
- [SSE hidden risks](https://medium.com/@2957607810/the-hidden-risks-of-sse-server-sent-events-what-developers-often-overlook-14221a4b3bfe)
- [SSE production readiness](https://dev.to/miketalbot/server-sent-events-are-still-not-production-ready-after-a-decade-a-lesson-for-me-a-warning-for-you-2gie)
- [A2A Protocol GitHub](https://github.com/a2aproject/A2A)
- [A2A Inspector announcement](https://discuss.google.dev/t/announcing-the-a2a-inspector-a-ui-tool-for-a2a-protocol-development/242240)
- [Drizzle SQLite migrations in Tauri 2](https://keypears.com/blog/2025-10-04-drizzle-sqlite-tauri)
- [SQLite in Tauri (sqlx approach)](https://dezoito.github.io/2025/01/01/embedding-sqlite-in-a-tauri-application.html)

---
*Pitfalls research for: Tauri 2.x desktop app — A2A protocol testing tool*
*Researched: 2026-03-24*
