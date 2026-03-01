#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <service-name> '<command>'"
  exit 1
fi

service_name="$1"
command_to_run="$2"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$REPO_ROOT/tmp/logs"
ALL_LOG="$LOG_DIR/all.log"
SERVICE_LOG="$LOG_DIR/${service_name}.log"

mkdir -p "$LOG_DIR"
touch "$ALL_LOG" "$SERVICE_LOG"

printf '[%s] [%s] starting: %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$service_name" "$command_to_run" \
  | tee -a "$SERVICE_LOG" \
  | tee -a "$ALL_LOG"

set +e
bash -lc "$command_to_run" 2>&1 \
  | awk -v service="$service_name" '{
      cmd = "date +%Y-%m-%dT%H:%M:%S%z"
      cmd | getline ts
      close(cmd)
      printf("[%s] [%s] %s\n", ts, service, $0)
      fflush()
    }' \
  | tee -a "$SERVICE_LOG" \
  | tee -a "$ALL_LOG"
exit_code=${PIPESTATUS[0]}
set -e

printf '[%s] [%s] exited with code %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$service_name" "$exit_code" \
  | tee -a "$SERVICE_LOG" \
  | tee -a "$ALL_LOG"

exit "$exit_code"
