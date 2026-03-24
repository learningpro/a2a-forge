# Requirements: A2A Workbench

**Defined:** 2026-03-24
**Core Value:** Users can add any A2A agent by URL, see all its skills, and test them interactively with real-time results

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Agent Card Management

- [ ] **CARD-01**: User can add an agent card by entering a base URL (app fetches `{url}/.well-known/agent.json`)
- [ ] **CARD-02**: App displays loading state during fetch and descriptive error on failure
- [ ] **CARD-03**: User can give a card a local nickname overriding the name field
- [ ] **CARD-04**: Cards are persisted across sessions in SQLite
- [ ] **CARD-05**: User can delete a card with confirmation (removes associated test history)
- [ ] **CARD-06**: User can manually refresh a card to re-fetch latest version
- [ ] **CARD-07**: User can import/export cards as a JSON bundle

### Skill Browser

- [ ] **SKIL-01**: All skills in a card are listed showing name, description, input modes, output modes
- [ ] **SKIL-02**: Skills are searchable by name or description
- [ ] **SKIL-03**: Skills can be filtered by input mode (text, file, data) and output mode
- [ ] **SKIL-04**: Skills show a "No examples" badge when card provides no examples
- [ ] **SKIL-05**: Clicking a skill opens the Skill Test Panel

### Skill Test Panel

- [ ] **TEST-01**: Panel shows full skill metadata (id, name, description, input/output modes, examples)
- [ ] **TEST-02**: User can compose test message with adaptive input area (text → multi-line editor, file → drag-and-drop picker, data → JSON editor with syntax highlighting)
- [ ] **TEST-03**: User can select authentication method if card declares multiple schemes
- [ ] **TEST-04**: User can override request headers via key-value editor
- [ ] **TEST-05**: App sends tasks/send JSON-RPC and shows real-time status indicator
- [ ] **TEST-06**: App supports streaming via tasks/sendSubscribe (SSE) when agent advertises streaming
- [ ] **TEST-07**: Response viewer shows full JSON-RPC response in collapsible tree
- [ ] **TEST-08**: Response viewer renders message.parts natively (text as markdown, file as download, data as JSON)
- [ ] **TEST-09**: Response viewer shows task status badge and latency in ms
- [ ] **TEST-10**: User can save request/response pair as named Test Case
- [ ] **TEST-11**: User can re-run saved Test Case with one click
- [ ] **TEST-12**: User can copy equivalent curl command for any request

### Test History

- [ ] **HIST-01**: All executions saved to SQLite with timestamp, skill id, agent id, request/response payload, latency, status
- [ ] **HIST-02**: History is browsable and searchable
- [ ] **HIST-03**: User can clear history per agent or globally

### Workspace & Settings

- [ ] **WORK-01**: App supports multiple named workspaces
- [ ] **SETT-01**: Global settings: default timeout, proxy URL, theme (system/light/dark), telemetry opt-in
- [ ] **SETT-02**: Per-card settings: default auth headers, base URL override

### UI/UX

- [ ] **UIUX-01**: Three-panel resizable layout (agents sidebar | skill list | test panel)
- [ ] **UIUX-02**: System dark/light mode with settings override
- [ ] **UIUX-03**: Keyboard shortcuts for common actions (add card, run test, copy curl)
- [ ] **UIUX-04**: Empty states guide new users with example public A2A agents
- [x] **UIUX-05**: App launches in < 2s on target hardware

### Security

- [x] **SECR-01**: All HTTP requests made from Rust backend, not webview
- [x] **SECR-02**: Credentials stored securely (OS keychain or encrypted storage), never in SQLite plaintext

## v2 Requirements

Deferred to future release.

### Protocol Extensions

- **PROT-01**: Support A2A push notifications (agent-initiated messages)
- **PROT-02**: Support input-required task state (mid-execution user input)
- **PROT-03**: Local mock agent mode for offline testing

### Collaboration

- **COLB-01**: Team sync via Git repo for shared workspaces
- **COLB-02**: Export test results as shareable reports

## Out of Scope

| Feature | Reason |
|---------|--------|
| Agent builder / code editor | Not a development tool — focused on testing |
| Hosted/cloud service | Fully local, no telemetry by default |
| General HTTP client | Not a Postman replacement — A2A protocol specific |
| CI/CD integration | Testing is interactive, not automated pipelines |
| Multi-agent orchestration | Single-agent testing only in v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UIUX-01 | Phase 1 | Pending |
| UIUX-02 | Phase 1 | Pending |
| UIUX-05 | Phase 1 | Complete |
| SECR-01 | Phase 1 | Complete |
| SECR-02 | Phase 1 | Complete |
| CARD-01 | Phase 2 | Pending |
| CARD-02 | Phase 2 | Pending |
| CARD-03 | Phase 2 | Pending |
| CARD-04 | Phase 2 | Pending |
| CARD-05 | Phase 2 | Pending |
| CARD-06 | Phase 2 | Pending |
| CARD-07 | Phase 2 | Pending |
| SKIL-01 | Phase 2 | Pending |
| SKIL-02 | Phase 2 | Pending |
| SKIL-03 | Phase 2 | Pending |
| SKIL-04 | Phase 2 | Pending |
| SKIL-05 | Phase 2 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 3 | Pending |
| TEST-06 | Phase 3 | Pending |
| TEST-07 | Phase 3 | Pending |
| TEST-08 | Phase 3 | Pending |
| TEST-09 | Phase 3 | Pending |
| TEST-10 | Phase 3 | Pending |
| TEST-11 | Phase 3 | Pending |
| TEST-12 | Phase 3 | Pending |
| HIST-01 | Phase 3 | Pending |
| HIST-02 | Phase 3 | Pending |
| HIST-03 | Phase 3 | Pending |
| WORK-01 | Phase 3 | Pending |
| SETT-01 | Phase 3 | Pending |
| SETT-02 | Phase 3 | Pending |
| UIUX-03 | Phase 3 | Pending |
| UIUX-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 37 total (note: original count of 30 was incorrect)
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation — traceability populated*
