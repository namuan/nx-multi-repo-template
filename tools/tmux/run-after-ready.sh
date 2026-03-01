#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 '<command>' [service-name]"
  exit 1
fi

command_to_run="$1"
service_name="${2:-}"

while [[ ! -f .tmux-dev-ready ]]; do
  sleep 2
done

if [[ -n "$service_name" ]]; then
  exec ./tools/tmux/log-exec.sh "$service_name" "$command_to_run"
fi

exec bash -lc "$command_to_run"
