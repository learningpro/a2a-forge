# Hacker News Launch — A2A Forge

## Submission

**Title:** Show HN: A2A Forge – Open-source desktop workbench for testing A2A protocol agents

**URL:** https://github.com/learningpro/a2a-forge

## First Comment (post immediately after submission)

Hi HN, I built A2A Forge — a desktop app for testing agents that speak Google's A2A (Agent-to-Agent) protocol. Think Postman, but for A2A.

**Why I built this:** The A2A protocol (https://google.github.io/A2A/) is gaining traction as a standard for agent interoperability, but there's no good tooling for developers building or integrating A2A agents. You end up writing curl commands and parsing JSON-RPC responses by hand. I wanted something that lets you discover agent capabilities, send test requests, and inspect responses — all in one place.

**What it does:**
- Auto-fetches agent cards from `/.well-known/agent.json` and lists all skills
- Send tasks to any A2A agent with a visual form, see results with inline media previews (images, video, audio)
- SSE streaming support for long-running tasks
- Test suites with 7 assertion types for automated testing
- Local proxy (port 9339) to intercept, delay, or mock A2A traffic
- Environment variables with `{{VAR}}` substitution and request chaining
- Community agent directory for sharing and discovering agents
- Full dark mode, CN/EN bilingual UI

**Tech stack:** Tauri 2.x (Rust backend + React frontend), SQLite for persistence, GSAP for animations. The Rust side handles all HTTP and database work, frontend is pure React + Zustand. ~77 IPC commands across 10 modules.

**What's next:** v0.6 will add agent card validation, protocol compliance scoring, and a visual request flow builder.

The app is MIT licensed. macOS and Windows installers available on the releases page. Would love feedback from anyone working with A2A or multi-agent systems.

GitHub: https://github.com/learningpro/a2a-forge
