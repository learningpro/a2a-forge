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

echo "==> Copying README.md..."
echo "==> Copying screenshots..."
mkdir -p "$DEST_DIR/docs/screenshots"
cp "$SRC_DIR/docs/screenshots/"*.png "$DEST_DIR/docs/screenshots/" 2>/dev/null || true
cp "$SRC_DIR/docs/README.md" "$DEST_DIR/README.md"
cp "$SRC_DIR/docs/README_CN.md" "$DEST_DIR/README_CN.md"

echo "==> Creating LICENSE..."

cat > "$DEST_DIR/LICENSE" << 'LICENSEEOF'
MIT License

Copyright (c) 2026 Orange Dong <learningpro.dong@gmail.com>

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
