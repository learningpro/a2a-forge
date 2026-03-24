# Feature Research

**Domain:** Protocol-Specific API Testing Desktop Workbench (A2A / AI Agent Testing)
**Researched:** 2026-03-24
**Confidence:** HIGH (A2A spec verified via official a2a-protocol.org; API tool patterns verified via Postman/Insomnia official sources)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any developer reaching for this tool will assume exist. Missing these makes the product feel broken, not incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add agent by URL | Core premise — you need an agent before anything else | LOW | Fetch `/.well-known/agent.json`, parse, store locally |
| Agent card display | Engineers want to see identity, endpoint, auth schemes, capabilities before sending anything | LOW | Render JSON fields as structured UI: name, description, version, endpoint, skills list |
| Skill browser | Every testing tool shows available operations — skills are A2A's equivalent | LOW | List skills from agent card; show ID, name, description, input/output modes |
| Send a message (tasks/send) | The primary interaction — must work on day one | MEDIUM | JSON-RPC POST with message payload, display task result |
| Task lifecycle display | A2A tasks are async state machines; engineers need visibility into submitted → working → completed/failed | MEDIUM | Poll tasks/get or display SSE events; show current state prominently |
| SSE streaming support (tasks/sendSubscribe) | Many A2A agents return results via SSE; no streaming = can't test a large class of agents | HIGH | Rust-side SSE consumer (not webview); render TaskStatusUpdateEvent and TaskArtifactUpdateEvent as they arrive |
| Response viewer | Must see what came back — raw JSON is the floor | LOW-MEDIUM | At minimum: raw JSON with pretty-printing. Ideally: JSON tree, rendered markdown, file downloads |
| Request history | Postman/Insomnia both provide this; users assume it exists | MEDIUM | SQLite persistence of requests + responses, searchable |
| Saved test cases / collections | Without save, every session starts from zero — unusable for iteration | MEDIUM | Named saved requests with one-click replay |
| Authentication header support | A2A auth is header-based (API keys, Bearer tokens); without this you cannot test auth-gated agents | LOW | Per-card default headers stored in keychain; per-request overrides |
| Curl export | Universal developer escape hatch — "let me reproduce this in my terminal" | LOW | Generate curl command from any outgoing request |
| Dark/light theme | Standard desktop app expectation in 2026 | LOW | System mode detection + manual toggle |
| Keyboard shortcuts | Power users switch between panes and trigger actions via keyboard | LOW | Standard shortcuts: Cmd+Enter to send, Cmd+K for search, etc. |

### Differentiators (Competitive Advantage)

Features that no general-purpose API tool (Postman, Insomnia) provides well for the A2A use case. These are where the workbench earns its keep.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Adaptive skill input panel | Each A2A skill declares input modes (text, file, data); the input form should reshape to match the skill's declared modalities rather than showing a generic JSON editor | MEDIUM | Read skill `inputModes` from agent card; render text area, file picker, or Monaco editor accordingly |
| Task state machine visualization | Unlike simple HTTP status codes, A2A tasks have named states (submitted, working, input-required, completed, failed, canceled, rejected, auth-required). Showing this as a visual timeline or badge progression is clearer than raw JSON | MEDIUM | State badge with history of transitions; timestamp on each state change |
| SSE event timeline | During streaming, events arrive incrementally. A timeline view showing each TaskStatusUpdateEvent and TaskArtifactUpdateEvent in order with timestamps gives insight that "wait for final response" misses entirely | HIGH | Append-only event log UI component; auto-scroll; collapse/expand individual events |
| Artifact viewer | A2A tasks produce Artifacts (text, files, data objects) that accumulate over a task's lifetime. Dedicated artifact display — separate from the raw JSON — makes long-running task output readable | MEDIUM | Parse `TaskArtifactUpdateEvent`; render artifact by MIME type (markdown → rendered, file → download link, JSON → tree) |
| input-required handling | A2A tasks can pause in `input-required` state, waiting for the user to provide follow-up input on the same task. No general API tool handles this natively | HIGH | Detect input-required state; show "provide input" prompt; send follow-up message on same taskId |
| Per-agent card settings | Different agents need different base URLs, auth schemes, and timeouts. Storing these per-card rather than globally prevents constant reconfiguration | LOW-MEDIUM | Per-card config panel: base URL override, default headers, default timeout |
| Named workspaces | Engineers who test multiple agent ecosystems (dev/staging/prod or different clients) need isolation without re-entering all their agents | MEDIUM | Workspace selector; agents, history, and saved cases scoped per workspace |
| Agent card refresh / versioning | Agent cards evolve. Showing when a card was last fetched and offering one-click refresh — with a diff of what changed — is uniquely useful for A2A | MEDIUM | Store fetch timestamp; re-fetch on demand; surface skill additions/removals |
| Skill-level search and filtering | When an agent exposes 10+ skills, finding the right one by input mode or keyword is slow without search | LOW | Filter by keyword, input mode, output mode; highlight matching text |
| tasks/cancel support | A2A exposes `tasks/cancel`. No general tool offers a "cancel running task" button tied to the protocol | LOW | Cancel button active while task is in non-terminal state; sends cancel RPC |
| Extended agent card (authenticated) | A2A v0.3 adds `getExtendedAgentCard` — agents can expose additional capabilities to authenticated clients. Surfacing this gives engineers visibility that basic card fetch hides | MEDIUM | Call getExtendedAgentCard with auth; diff vs basic card; show extended skills/capabilities |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural additions but should be deliberately excluded from scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| General HTTP request builder | Postman parity, "just add raw HTTP" requests | Turns the tool into Postman-lite; dilutes the A2A-specific UX and doubles maintenance burden; users who need generic HTTP have Postman/Insomnia | Keep scope to A2A JSON-RPC; document that raw HTTP is out of scope from day one |
| Agent code editor / scaffolding | "Can I build my agent here?" | Becomes an IDE; completely different product category with different user needs | Link to ADK or LangChain docs; A2A Workbench tests agents, it doesn't author them |
| Cloud sync / team workspaces | Postman's killer feature; users ask for it | Requires auth infrastructure, SaaS backend, subscription model — fundamentally changes the product from local tool to service | Offer JSON export/import of workspaces for manual sharing; revisit team features post-PMF |
| Mock agent server | Useful for development, but complex | Building a mock A2A server requires implementing the full protocol server-side; doubles scope | Scope for v2 once core testing is solid |
| Test assertions / scripting | Postman-style `pm.test()` | Adds a scripting runtime, assertion language, and test report UI — a multi-month scope expansion | Provide curl export so engineers can run assertions in their existing test harness |
| Push notification (webhook) receiver | A2A supports push notifications; engineers may want to test them | Requires exposing a local webhook endpoint, dealing with NAT/firewall, keeping a background listener — complex for a desktop tool with no server | Document push notification config fields in the request panel; use ngrok as the suggested workaround |
| A2A agent marketplace / registry | "Show me all available A2A agents" | No authoritative public registry exists; curation is a different product; creates content moderation obligations | Allow import from a JSON list file; user manages their own agent registry |
| CI/CD / CLI runner | "Can I run test cases headlessly?" | Different UX model (CLI vs desktop), packaging complexity, CI environment setup — separate product | Export saved test cases as JSON; let engineers write their own runner against the export format |

---

## Feature Dependencies

```
[Agent Card Management]
    └──requires──> [HTTP fetch + JSON parse of /.well-known/agent.json]
                       └──enables──> [Skill Browser]
                                         └──enables──> [Adaptive Skill Input Panel]
                                                            └──enables──> [Send Message (tasks/send)]
                                                                              └──enables──> [Task Lifecycle Display]
                                                                                                └──enables──> [SSE Streaming (tasks/sendSubscribe)]
                                                                                                └──enables──> [tasks/cancel]
                                                                                                └──enables──> [input-required Handling]

[Send Message (tasks/send)]
    └──enables──> [Request History (SQLite)]
    └──enables──> [Curl Export]
    └──enables──> [Saved Test Cases]

[SSE Streaming]
    └──enables──> [SSE Event Timeline]
    └──enables──> [Artifact Viewer]

[Authentication Header Support]
    └──enables──> [Extended Agent Card (getExtendedAgentCard)]
    └──enables──> [Per-card Settings]

[Request History]
    └──enhances──> [Saved Test Cases] (save from history)

[Named Workspaces]
    └──scopes──> [Agent Card Management]
    └──scopes──> [Request History]
    └──scopes──> [Saved Test Cases]
```

### Dependency Notes

- **Skill Browser requires Agent Card Management:** Skills are parsed from the agent card; without a stored card there is nothing to browse.
- **SSE Streaming requires Send Message infrastructure:** SSE is an alternate transport for the same message-sending flow; the JSON-RPC request construction must exist first.
- **input-required Handling requires Task Lifecycle Display:** You cannot prompt for follow-up input unless you are tracking and displaying the task's current state.
- **Extended Agent Card requires Authentication:** The `getExtendedAgentCard` RPC is only accessible with valid credentials; auth header management must precede it.
- **Named Workspaces is additive:** Workspaces do not block any feature but should be introduced before history grows large enough to become confusing across contexts.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept with AI/LLM engineers.

- [ ] Agent card management (add by URL, store, display, delete, refresh) — without this the tool has no starting point
- [ ] Skill browser with basic filtering — engineers need to find and select a skill before sending anything
- [ ] Adaptive skill input panel (text / file / JSON modes) — generic JSON editor would work but adaptive input is the primary UX differentiator
- [ ] Send message via tasks/send (synchronous path) — must be able to test synchronous agents at launch
- [ ] Task lifecycle display (submitted → working → completed/failed/canceled) — engineers need to see task state progression, not just the final response
- [ ] SSE streaming via tasks/sendSubscribe — a large class of A2A agents (including the test service) use SSE; without this the tool can't test them
- [ ] Response viewer: rendered markdown + JSON tree + raw JSON — the three most common response types
- [ ] Authentication header support (per-card, keychain-backed) — the test service requires X-API-Key; without auth many agents are unreachable
- [ ] Request history (SQLite, searchable) — engineers iterate; they need to see what they sent and re-examine responses
- [ ] Saved test cases with one-click re-run — the core workflow loop: configure once, test repeatedly
- [ ] Curl export — escape hatch for scripting and sharing reproduction steps
- [ ] Dark/light theme with system detection — expected baseline for desktop apps in 2026

### Add After Validation (v1.x)

Features to add once the core testing workflow is validated.

- [ ] Named workspaces — add when engineers report needing to separate agent environments (dev vs. prod, different clients)
- [ ] SSE event timeline view — add when engineers working with long-running tasks report difficulty following event sequences
- [ ] Artifact viewer — add when artifact-producing agents (image/video generators) are the dominant use case in usage data
- [ ] tasks/cancel support — add when engineers report needing to stop runaway tasks; low complexity, high satisfaction
- [ ] input-required handling — add when engineers working with conversational A2A agents request it; HIGH complexity, warrants its own milestone
- [ ] Agent card diff on refresh — add when engineers report being surprised by skill changes after card refresh
- [ ] Per-card settings (base URL override, timeout) — add when engineers testing multiple environments of the same agent request it

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Extended agent card (getExtendedAgentCard) — requires A2A v0.3 adoption to be widespread; defer until most tested agents support it
- [ ] Mock agent server — complex protocol server implementation; defer until core testing is mature
- [ ] Push notification (webhook) testing — requires local server exposure; evaluate if user demand justifies the complexity
- [ ] Team workspace export/import — evaluate post-PMF; JSON export of workspace is the low-complexity bridge

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Agent card management | HIGH | LOW | P1 |
| Skill browser | HIGH | LOW | P1 |
| Send message (tasks/send) | HIGH | MEDIUM | P1 |
| SSE streaming (tasks/sendSubscribe) | HIGH | HIGH | P1 |
| Task lifecycle display | HIGH | MEDIUM | P1 |
| Auth header support (keychain) | HIGH | MEDIUM | P1 |
| Response viewer (markdown/JSON/raw) | HIGH | MEDIUM | P1 |
| Request history | HIGH | MEDIUM | P1 |
| Adaptive skill input panel | HIGH | MEDIUM | P1 |
| Saved test cases | MEDIUM | MEDIUM | P1 |
| Curl export | MEDIUM | LOW | P1 |
| Dark/light theme | LOW | LOW | P1 |
| tasks/cancel | MEDIUM | LOW | P2 |
| Named workspaces | MEDIUM | MEDIUM | P2 |
| SSE event timeline | MEDIUM | HIGH | P2 |
| Artifact viewer | MEDIUM | MEDIUM | P2 |
| input-required handling | HIGH | HIGH | P2 |
| Agent card diff on refresh | MEDIUM | MEDIUM | P2 |
| Per-card settings | MEDIUM | LOW | P2 |
| Extended agent card | LOW | MEDIUM | P3 |
| Mock agent server | MEDIUM | HIGH | P3 |
| Push notification testing | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

General-purpose API tools provide the baseline; A2A Workbench must match the baseline on general ergonomics and exceed competitors on A2A-specific features.

| Feature | Postman | Insomnia | A2A Workbench Approach |
|---------|---------|---------|----------------------|
| SSE streaming | Yes (v10.10+) — shows raw event stream | Yes — shows raw event stream | Yes + structured event timeline with state machine awareness |
| WebSocket / streaming | Yes | Yes | SSE only (A2A-specific) — not generic WebSocket |
| Request history | Yes — per-collection | Yes — per-workspace | Yes — per-workspace, SQLite-backed, full request+response stored |
| Saved collections | Yes — full collection model | Yes | Yes — per-agent named test cases, simpler model |
| Code/curl export | Yes — multiple languages | Yes — curl + multiple languages | Yes — curl only (sufficient for A2A JSON-RPC) |
| Protocol-specific input | No — generic JSON body | No — generic body | Yes — adaptive input based on skill's declared inputModes |
| Task state visualization | No — shows HTTP status only | No — shows HTTP status only | Yes — task state badge with transition history |
| Schema-aware tooling | Via OpenAPI import | Via OpenAPI import | Agent card IS the schema; skills drive the UI automatically |
| Auth management | Yes — multiple auth types, env variables | Yes — multiple auth types | Yes — API key / Bearer focused (A2A scope), keychain storage |
| Workspaces | Yes — team-oriented | Yes — Git-backed | Yes — local named workspaces, no cloud required |
| Mock server | Yes | Yes | No — deliberately out of scope for v1 |
| Test assertions/scripting | Yes — JavaScript runtime | Yes — basic | No — deliberately out of scope |
| Local/offline first | No — requires account | Scratch Pad only | Yes — fully local, no account required |

---

## Sources

- [A2A Protocol Specification (latest)](https://a2a-protocol.org/latest/specification/) — HIGH confidence (official spec site)
- [A2A Streaming & Async Operations](https://a2a-protocol.org/latest/topics/streaming-and-async/) — HIGH confidence
- [A2A Core Concepts](https://a2a-protocol.org/latest/topics/key-concepts/) — HIGH confidence
- [GitHub: a2aproject/A2A](https://github.com/a2aproject/A2A) — HIGH confidence (official repository)
- [Postman SSE Support Announcement](https://blog.postman.com/support-for-server-sent-events/) — HIGH confidence (official blog)
- [Insomnia Feature Set (GitHub)](https://github.com/Kong/insomnia) — HIGH confidence (official repo)
- [Insomnia vs Postman Comparison 2026](https://abstracta.us/blog/testing-tools/insomnia-vs-postman/) — MEDIUM confidence
- [Apidog SSE Streaming Features](https://apidog.com/blog/stream-llm-responses-using-sse/) — MEDIUM confidence
- [A2A v0.3 Release (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade) — HIGH confidence

---

*Feature research for: A2A Workbench — Protocol-Specific AI Agent Testing Desktop App*
*Researched: 2026-03-24*
