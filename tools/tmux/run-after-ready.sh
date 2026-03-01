#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 '<command>'"
  exit 1
fi

command_to_run="$1"

while [[ ! -f .tmux-dev-ready ]]; do
  sleep 2
done

exec bash -lc "$command_to_run"
