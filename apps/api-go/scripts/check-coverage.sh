#!/usr/bin/env bash
set -euo pipefail

MIN_GO_COVERAGE="${MIN_GO_COVERAGE:-30}"
OUTPUT_DIR="${OUTPUT_DIR:-../../coverage/apps/api-go}"
PROFILE_PATH="${OUTPUT_DIR}/coverage.out"

mkdir -p "${OUTPUT_DIR}"

go test ./... -covermode=atomic -coverprofile="${PROFILE_PATH}"

go tool cover -func="${PROFILE_PATH}" | awk -v min="${MIN_GO_COVERAGE}" '
BEGIN {
  found = 0
}
/^total:/ {
  found = 1
  gsub("%", "", $3)
  coverage = $3 + 0
  if (coverage < min) {
    printf("Go coverage %.2f%% is below required %.2f%%\n", coverage, min)
    exit 1
  }
  printf("Go coverage %.2f%% meets required %.2f%%\n", coverage, min)
}
END {
  if (!found) {
    print "Could not determine Go coverage total"
    exit 1
  }
}
'
