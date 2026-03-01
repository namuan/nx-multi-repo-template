#!/usr/bin/env bash
# Pane 0 — starts PostgreSQL, signals readiness, then tails DB logs.
# Other panes wait on .tmux-dev-ready before starting.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Install Node deps if missing (first run / fresh clone)
if [[ ! -x ./node_modules/.bin/nx ]]; then
  echo "📦 node_modules not found — running npm install..."
  npm install
fi

echo "⏳ Starting PostgreSQL (waiting until healthy)..."
npm run dev:db:up

# Signal all waiting panes to start their services
touch .tmux-dev-ready
echo "✅ PostgreSQL ready — services starting in other panes"
echo ""
echo "  Frontend  →  http://localhost:9100"
echo "  Go API    →  http://localhost:9101"
echo "  Java API  →  http://localhost:9102"
echo "  Simulator →  tmux window 2 (dev)"
echo "  Logs      →  tmux window 1 (logs)"
echo ""

# Keep the pane alive and useful by tailing DB logs
npm run dev:db:logs
