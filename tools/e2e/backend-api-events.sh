#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/tmp/e2e"
mkdir -p "$LOG_DIR"

GO_URL="${GO_URL:-http://127.0.0.1:9101}"
JAVA_URL="${JAVA_URL:-http://127.0.0.1:9102}"
EMAIL="${E2E_EMAIL:-alice@acme.com}"
PASSWORD="${E2E_PASSWORD:-Demo123!}"
FAST_FORWARD_EVENTS="${FAST_FORWARD_EVENTS:-20}"
FAST_FORWARD_STEP_MS="${FAST_FORWARD_STEP_MS:-15000}"
POLL_SECONDS="${E2E_POLL_SECONDS:-60}"

STARTED_PIDS=()

cleanup() {
  for pid in "${STARTED_PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT INT TERM

wait_for_http_ok() {
  local url="$1"
  local label="$2"
  local timeout_seconds="$3"
  local deadline=$((SECONDS + timeout_seconds))

  while (( SECONDS < deadline )); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for $label at $url" >&2
  return 1
}

start_background_service() {
  local name="$1"
  local health_url="$2"
  local start_cmd="$3"

  if curl -fsS --max-time 2 "$health_url" >/dev/null 2>&1; then
    echo "[$name] already healthy at $health_url"
    return 0
  fi

  echo "[$name] starting"
  (
    cd "$ROOT_DIR"
    bash -lc "$start_cmd"
  ) >"$LOG_DIR/$name.log" 2>&1 &

  local pid=$!
  STARTED_PIDS+=("$pid")

  wait_for_http_ok "$health_url" "$name" 120
  echo "[$name] healthy"
}

json_len() {
  python3 -c 'import json,sys; print(len(json.load(sys.stdin)))'
}

json_online_count() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(sum(1 for x in d if x.get("status")=="online"))'
}

json_latest_recorded_epoch() {
  python3 -c 'import json,sys,datetime; d=json.load(sys.stdin); r=(d[0].get("recordedAt") if d else None); print(int(datetime.datetime.fromisoformat(r.replace("Z","+00:00")).timestamp()) if r else 0)'
}

extract_token() {
  python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])'
}

echo "[db] starting"
docker compose up db -d --wait >/dev/null

echo "[db] healthy"
start_background_service "api-go" "$GO_URL/health" "npm run dev:go"
start_background_service "api-java" "$JAVA_URL/actuator/health" "npm run dev:java"

echo "[auth] login as $EMAIL"
TOKEN="$(
  curl -fsS -X POST "$JAVA_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | extract_token
)"

if [[ -z "$TOKEN" ]]; then
  echo "Failed to acquire auth token" >&2
  exit 1
fi

echo "[api] fetch /api/devices"
DEVICES_JSON="$(mktemp)"
curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices" > "$DEVICES_JSON"

DEVICE_COUNT="$(cat "$DEVICES_JSON" | json_len)"
DEVICE_ID="$(python3 - "$DEVICES_JSON" <<'PY'
import json
import sys

preferred = {
  "Truck Alpha-1",
  "Van Beta-2",
  "Truck Gamma-3",
  "Unit SW-101",
  "Unit SW-102",
  "Unit SW-103",
  "Moto NYC-1",
  "Van NYC-2",
}

with open(sys.argv[1], "r", encoding="utf-8") as f:
  devices = json.load(f)

selected = ""
for device in devices:
  if device.get("name") in preferred:
    selected = device.get("id", "")
    break

if not selected and devices:
  selected = devices[0].get("id", "")

print(selected)
PY
)"

rm -f "$DEVICES_JSON"

if [[ "$DEVICE_COUNT" -le 0 || -z "$DEVICE_ID" ]]; then
  echo "No devices returned by /api/devices" >&2
  exit 1
fi

echo "[api] fetch /api/alerts/unacknowledged"
ALERT_COUNT="$(
  curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/alerts/unacknowledged" | json_len
)"

echo "[api] fetch /api/devices/stats"
curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices/stats" >/dev/null

echo "[api] baseline /api/devices/$DEVICE_ID/telemetry"
BASELINE_COUNT="$(
  curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices/$DEVICE_ID/telemetry" | json_len
)"
BASELINE_LATEST_EPOCH="$(
  curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices/$DEVICE_ID/telemetry" | json_latest_recorded_epoch
)"

if ! pgrep -f "tools/simulator/main.go" >/dev/null 2>&1; then
  echo "[simulator] starting"
  (
    cd "$ROOT_DIR"
    FAST_FORWARD_EVENTS="$FAST_FORWARD_EVENTS" FAST_FORWARD_STEP_MS="$FAST_FORWARD_STEP_MS" npm run dev:simulate
  ) >"$LOG_DIR/simulator.log" 2>&1 &
  STARTED_PIDS+=("$!")
else
  echo "[simulator] already running"
fi

echo "[assert] waiting for fresh telemetry (baseline_latest_epoch=$BASELINE_LATEST_EPOCH, timeout=${POLL_SECONDS}s)"
END_TIME=$((SECONDS + POLL_SECONDS))
LATEST_COUNT="$BASELINE_COUNT"
LATEST_EPOCH="$BASELINE_LATEST_EPOCH"

while (( SECONDS < END_TIME )); do
  LATEST_COUNT="$(
    curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices/$DEVICE_ID/telemetry" | json_len
  )"
  LATEST_EPOCH="$(
    curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices/$DEVICE_ID/telemetry" | json_latest_recorded_epoch
  )"
  if [[ "$LATEST_EPOCH" -gt "$BASELINE_LATEST_EPOCH" ]]; then
    break
  fi
  sleep 2
done

if [[ "$LATEST_EPOCH" -le "$BASELINE_LATEST_EPOCH" ]]; then
  echo "Telemetry did not advance for device $DEVICE_ID" >&2
  echo "api-go log tail:" >&2
  tail -n 40 "$LOG_DIR/api-go.log" >&2 || true
  echo "api-java log tail:" >&2
  tail -n 40 "$LOG_DIR/api-java.log" >&2 || true
  echo "simulator log tail:" >&2
  tail -n 40 "$LOG_DIR/simulator.log" >&2 || true
  exit 1
fi

ONLINE_COUNT="$(
  curl -fsS -H "Authorization: Bearer $TOKEN" "$JAVA_URL/api/devices" | json_online_count
)"

echo "✅ Backend E2E passed"
echo "- devices: $DEVICE_COUNT"
echo "- unacknowledged alerts: $ALERT_COUNT"
echo "- online devices: $ONLINE_COUNT"
echo "- telemetry latest epoch for $DEVICE_ID: $BASELINE_LATEST_EPOCH -> $LATEST_EPOCH"
echo "- telemetry count sample for $DEVICE_ID: $BASELINE_COUNT -> $LATEST_COUNT"
