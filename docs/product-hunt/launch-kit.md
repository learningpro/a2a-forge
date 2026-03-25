# A2A-Forge — Product Hunt Launch Kit

## Basic Info

**Product Name:** A2A-Forge
**Website:** https://github.com/learningpro/a2a-forge
**Tagline (60 chars max):**

> Postman for A2A — test any agent-to-agent protocol agent

**Topics:** Developer Tools, Open Source, Artificial Intelligence, API Tools

---

## Description (260 words)

A2A-Forge is a free, open-source desktop app for testing and debugging agents that speak Google's A2A (Agent-to-Agent) protocol.

**The problem:** As AI agents become interconnected via A2A, developers need a way to discover agent capabilities, test skills, and debug JSON-RPC interactions — without writing throwaway scripts or curl commands.

**The solution:** A2A-Forge gives you a native desktop workbench (think Postman, but purpose-built for A2A) where you can:

• **Discover** — Enter any agent URL, instantly see all skills, input/output modes, and auth schemes
• **Test** — Adaptive input form that reshapes based on each skill (text, JSON editor, file upload)
• **Stream** — Real-time SSE streaming for long-running async tasks with live status updates
• **Preview** — Smart media detection renders images, video, and audio inline in the response viewer
• **Iterate** — Full execution history, saved test cases, one-click re-run, curl export

Built with Tauri 2 (Rust backend) + React + TypeScript. Runs natively on macOS and Windows with a ~15MB binary — no Electron bloat.

**Key differentiators:**
- Per-agent auth headers persisted in OS keychain
- Concurrent skill execution (run multiple skills simultaneously)
- JSON syntax-highlighted response tree with collapsible nodes
- Keyboard-first workflow (Ctrl+N, Ctrl+Enter, Ctrl+Shift+C)

A2A-Forge is fully open source (MIT) and works with any A2A-compliant agent. Whether you're building agents with Google's ADK, LangChain, CrewAI, or your own framework — if it serves an agent card, A2A-Forge can test it.

---

## Maker's First Comment

Hey Product Hunt! 👋

I built A2A-Forge because I was tired of writing curl commands to test my A2A agents.

Google's Agent-to-Agent protocol is gaining traction fast — it's becoming the standard way AI agents talk to each other. But the developer tooling hasn't caught up yet. There's no equivalent of Postman or Insomnia for A2A.

So I built one.

A2A-Forge is a native desktop app (Tauri 2 + React) that lets you:
1. Add any A2A agent by URL
2. Browse all its skills
3. Test them interactively with real-time results

The response viewer auto-detects media in the response — if your agent generates images or videos, they render inline. No more base64 decoding in the terminal.

It's fully open source (MIT), works on macOS and Windows, and the binary is ~15MB.

I'd love your feedback — especially if you're building A2A agents. What features would make your workflow faster?

GitHub: https://github.com/learningpro/a2a-forge

---

## Screenshot Descriptions (for gallery)

### Screenshot 1: Light Mode — Main Interface
**Caption:** Three-panel layout: agent sidebar, skill browser with search & filters, and the test panel with adaptive input

### Screenshot 2: Dark Mode
**Caption:** System-aware dark theme with full feature parity

### Screenshot 3: Skill Testing (to capture)
**Caption:** Testing an image generation skill — adaptive JSON input, real-time status, inline image preview

### Screenshot 4: Add Agent Dialog (to capture)
**Caption:** Add any A2A agent by URL — instant card preview with skill discovery

### Screenshot 5: Response Viewer (to capture)
**Caption:** Smart response viewer with JSON syntax highlighting and inline media preview

---

## Additional Screenshots Needed

To make the PH launch compelling, capture these from a real Tauri session:

1. **With agent loaded** — Sidebar showing an agent with skills listed
2. **Skill test in progress** — Running status with amber dot
3. **Completed test with image** — Response showing inline image preview
4. **Add agent dialog with preview** — URL entered, card preview showing
5. **Dark mode with results** — Full workflow in dark theme

---

## Social Media Posts

### Twitter/X

🔨 Introducing A2A-Forge — Postman for the A2A protocol

Test any Agent-to-Agent agent from a native desktop app:
→ Discover skills from agent cards
→ Adaptive input (text, JSON, files)
→ Real-time streaming & async polling
→ Inline media preview (images, video, audio)

Open source · Tauri 2 · MIT

github.com/learningpro/a2a-forge

#A2A #AgentToAgent #Tauri #OpenSource #DevTools

### LinkedIn

I just open-sourced A2A-Forge — a desktop workbench for testing A2A (Agent-to-Agent) protocol agents.

Think of it as Postman, but purpose-built for the emerging A2A standard that lets AI agents communicate with each other.

Key features:
• Add any A2A agent by URL, instantly browse all skills
• Adaptive test input (text, JSON editor, file upload)
• Real-time SSE streaming for async tasks
• Smart response viewer with inline media preview
• Per-agent auth, test history, saved test cases

Built with Tauri 2 (Rust) + React + TypeScript. Native on macOS and Windows.

The A2A ecosystem is growing fast — Google, LangChain, CrewAI and others are adopting it. Developer tooling needs to keep up.

Try it: github.com/learningpro/a2a-forge

#A2A #AIAgents #DeveloperTools #OpenSource

### Reddit (r/programming)

**Title:** Show r/programming: A2A-Forge — I built a Postman-like desktop app for testing A2A protocol agents (Tauri 2 + React, open source)

**Body:**
I've been working with Google's A2A (Agent-to-Agent) protocol and got frustrated with testing agents via curl. So I built a proper desktop tool for it.

A2A-Forge lets you add any A2A agent by URL, browse its skills, and run interactive tests with real-time results. The response viewer auto-detects media (images, video, audio) and renders them inline.

Tech stack: Tauri 2.x (Rust backend), React 18, TypeScript, SQLite, Monaco Editor.

GitHub: https://github.com/learningpro/a2a-forge

Would love feedback from anyone working with A2A or similar agent protocols.

---

## Launch Checklist

### 1 Week Before
- [ ] Create Product Hunt maker account
- [ ] Schedule launch for Tuesday or Wednesday
- [ ] Prepare 5 high-quality screenshots from real usage
- [ ] Create a simple logo/icon (can use the Tauri app icon)
- [ ] Write and review all copy above
- [ ] Get 5-10 friends to sign up for PH and be ready to upvote

### Launch Day
- [ ] Publish on Product Hunt at 12:01 AM PT
- [ ] Post maker's first comment immediately
- [ ] Post on Hacker News (Show HN)
- [ ] Post on Twitter/X
- [ ] Post on Reddit (r/programming, r/rust, r/LocalLLaMA)
- [ ] Post on LinkedIn
- [ ] Post on Dev.to
- [ ] Share in relevant Discord servers (Tauri, AI agents)
- [ ] Respond to every comment on PH within 1 hour

### After Launch
- [ ] Thank everyone who commented/upvoted
- [ ] Collect feedback and create GitHub issues
- [ ] Write a follow-up post about the launch experience
