#!/usr/bin/env bash
# Entry point for the Fleet Management tmux dev session.
# Usage: npm run dev:tmux

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if ! command -v tmux &>/dev/null; then
  echo "Error: tmux is not installed." >&2
  echo "  macOS:  brew install tmux" >&2
  echo "  Ubuntu: apt install tmux" >&2
  exit 1
fi

tmux start-server \; source-file "$REPO_ROOT/tools/tmux/fleet-session.conf"

if [[ -n "${TMUX:-}" ]]; then
  # Already inside tmux — switch to the new session
  tmux switch-client -t fleet-dev
else
  # Outside tmux — attach directly
  tmux attach-session -t fleet-dev
fi
