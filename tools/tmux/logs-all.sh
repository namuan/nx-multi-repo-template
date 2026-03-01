#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

LOG_FILE="$REPO_ROOT/tmp/logs/all.log"
TAIL_LINES="${TAIL_LINES:-200}"

if [[ -f "$LOG_FILE" ]]; then
  echo "📜 Streaming unified tmux logs from $LOG_FILE"
  echo "   Tip: set TAIL_LINES=500 for more history"
  exec tail -n "$TAIL_LINES" -F "$LOG_FILE"
fi

if command -v docker >/dev/null 2>&1 && docker compose ps >/dev/null 2>&1; then
  echo "ℹ️  tmux aggregate log not found; falling back to docker compose logs"
  exec docker compose logs -f --tail "$TAIL_LINES" db api-go api-java frontend
fi

echo "No aggregate logs found."
echo "Start with: npm run dev:tmux"
echo "Then stream with: npm run dev:logs:all"
exit 1
