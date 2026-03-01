#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

tmux start-server \; source-file "$REPO_ROOT/tools/tmux/dev-session.conf"

if [[ -n "${TMUX:-}" ]]; then
	tmux switch-client -t neom-dev
else
	tmux attach-session -t neom-dev
fi
