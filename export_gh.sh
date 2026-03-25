#!/usr/bin/env bash
set -euo pipefail

# Export A2A-Forge for GitHub open-source release
# Creates a clean copy at ../a2a-forge with fresh git repo

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR"
DEST_DIR="$(dirname "$SCRIPT_DIR")/a2a-forge"

echo "==> Preparing export directory: $DEST_DIR"

# Clean destination (preserve .git if it exists)
if [ -d "$DEST_DIR" ]; then
    # Keep .git to preserve history if re-exporting
    if [ -d "$DEST_DIR/.git" ]; then
        find "$DEST_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
    else
        rm -rf "$DEST_DIR"
        mkdir -p "$DEST_DIR"
    fi
else
    mkdir -p "$DEST_DIR"
fi

echo "==> Copying source files..."

rsync -a \
    --exclude='.git/' \
    --exclude='.memsearch/' \
    --exclude='.planning/' \
    --exclude='.claude/' \
    --exclude='.gstack/' \
    --exclude='node_modules/' \
    --exclude='src-tauri/target/' \
    --exclude='dist/' \
    --exclude='a2a_workbench_ui_mockup.html' \
    --exclude='A2A_Workbench_PRD.md' \
    --exclude='package-lock.json' \
    --exclude='Cargo.lock' \
    --exclude='export_gh.sh' \
    "$SRC_DIR/" "$DEST_DIR/"

echo "==> Creating README.md..."

cat > "$DEST_DIR/README.md" << 'READMEEOF'
# A2A-Forge

A desktop application for testing and debugging [A2A (Agent-to-Agent)](https://google.github.io/A2A/) protocol agents. Discover agent capabilities, invoke skills, inspect JSON-RPC payloads, and iterate on your A2A integration — all from a native UI.

## Features

- **Agent Discovery** — Fetch and inspect `.well-known/agent.json` agent cards
- **Skill Testing** — Invoke any agent skill with custom parameters and headers
- **Live Streaming** — SSE-based streaming for long-running async tasks with real-time status updates
- **Request Inspector** — View raw JSON-RPC payloads and generate equivalent curl commands
- **Response Viewer** — Smart rendering of JSON results with inline media previews (images, video, audio)
- **History & Saved Tests** — Persist test configurations and review past executions
- **Workspaces** — Organize agents and tests into separate workspaces
- **Credential Management** — Secure OS keychain storage for API keys
- **Dark/Light Theme** — System-aware theme with manual override

## Screenshots

<!-- TODO: Add screenshots -->

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) (v18+)
- Platform dependencies for Tauri: see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## Installation

```bash
# Clone the repository
git clone https://github.com/user/a2a-forge.git
cd a2a-forge

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

### Adding an Agent

1. Click the **+** button in the sidebar (or press `Ctrl/Cmd+N`)
2. Enter the agent's base URL (e.g., `https://my-agent.example.com`)
3. A2A-Forge fetches the agent card from `/.well-known/agent.json`
4. The agent's skills appear in the skill panel

### Testing a Skill

1. Select an agent from the sidebar
2. Click a skill to open the test panel
3. Fill in the input parameters
4. Add any required headers (e.g., API keys)
5. Click **Run** (or press `Ctrl/Cmd+Enter`)
6. View the response, including inline media previews

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+N` | Add new agent |
| `Ctrl/Cmd+Enter` | Run current test |
| `Ctrl/Cmd+Shift+C` | Copy as curl |

## Tech Stack

- **Backend:** Rust + [Tauri 2.x](https://v2.tauri.app/)
- **Frontend:** React 18 + TypeScript + [Tailwind CSS 4](https://tailwindcss.com/)
- **State:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Database:** SQLite (via tauri-plugin-sql)
- **Type Bridge:** [tauri-specta](https://github.com/oscartbeaumont/tauri-specta) (auto-generated TypeScript bindings)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (JSON editing)

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components (layout, test, agent)
│   ├── stores/             # Zustand state stores
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities (A2A helpers, curl generation)
│   └── bindings.ts         # Auto-generated Tauri command bindings
├── src-tauri/              # Rust backend
│   └── src/
│       ├── a2a/            # A2A protocol types and HTTP client
│       ├── commands/       # Tauri IPC command handlers
│       ├── db.rs           # SQLite schema and migrations
│       ├── credentials.rs  # OS keychain credential storage
│       └── lib.rs          # Tauri app builder
├── index.html              # Entry point
├── vite.config.ts          # Vite configuration
└── package.json            # Frontend dependencies
```

## License

[MIT](LICENSE) — Copyright 2026 Orange Dong
READMEEOF

echo "==> Creating LICENSE..."

cat > "$DEST_DIR/LICENSE" << 'LICENSEEOF'
MIT License

Copyright (c) 2026 Orange Dong (learningpro.dong@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
LICENSEEOF

echo "==> Creating .gitignore..."

cat > "$DEST_DIR/.gitignore" << 'GIEOF'
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
src-tauri/target/

# Rust
Cargo.lock

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Tauri
src-tauri/gen/
GIEOF

echo "==> Initializing git repository..."

cd "$DEST_DIR"
if [ ! -d ".git" ]; then
    git init
fi

git add -A
git commit -m "Initial commit: A2A-Forge — A2A protocol testing tool

Desktop application for testing and debugging A2A (Agent-to-Agent) protocol agents.
Built with Tauri 2.x (Rust) + React + TypeScript."

echo ""
echo "========================================="
echo "  Export complete: $DEST_DIR"
echo "========================================="
echo ""
echo "To push to GitHub:"
echo ""
echo "  cd $DEST_DIR"
echo "  gh repo create a2a-forge --public --source=. --push"
echo ""
echo "Or manually:"
echo ""
echo "  cd $DEST_DIR"
echo "  git remote add origin git@github.com:<user>/a2a-forge.git"
echo "  git push -u origin main"
echo ""
