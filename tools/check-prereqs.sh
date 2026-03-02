#!/usr/bin/env bash
# Pre-flight check: verifies all tools required for local development are present
# and meet minimum version requirements.
#
# Usage:
#   ./tools/check-prereqs.sh          # check required tools only
#   ./tools/check-prereqs.sh --tmux   # also require tmux (for npm run dev:tmux)
#
# Exit codes: 0 = all required checks passed, 1 = one or more checks failed.

set -euo pipefail

REQUIRE_TMUX=false
for arg in "$@"; do
  [[ "$arg" == "--tmux" ]] && REQUIRE_TMUX=true
done

# ── Colour codes ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

ERRORS=0
WARNINGS=0

# ── Helpers ───────────────────────────────────────────────────────────────────
pass()  { printf "  ${GREEN}✓${RESET} %-10s ${GREEN}%-12s${RESET} %s\n" "$1" "$2" "$3"; }
fail()  { printf "  ${RED}✗${RESET} %-10s ${RED}%-12s${RESET} %s\n" "$1" "$2" "$3"; ERRORS=$(( ERRORS + 1 )); }
warn()  { printf "  ${YELLOW}⚠${RESET} %-10s ${YELLOW}%-12s${RESET} %s\n" "$1" "$2" "$3"; WARNINGS=$(( WARNINGS + 1 )); }
missing() { printf "  ${RED}✗${RESET} %-10s ${RED}%-12s${RESET} %s\n" "$1" "not found" "$2"; ERRORS=$(( ERRORS + 1 )); }
missing_warn() { printf "  ${YELLOW}⚠${RESET} %-10s ${YELLOW}%-12s${RESET} %s\n" "$1" "not found" "$2"; WARNINGS=$(( WARNINGS + 1 )); }

# Compare semver: returns 0 if $1 >= $2
version_gte() {
  # Strip leading 'v' or 'go'
  local a="${1#[vg]o}" b="${2#[vg]o}"
  printf '%s\n%s\n' "$b" "$a" | sort -V -C
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}Fleet Platform — prerequisite check${RESET}\n"
echo "────────────────────────────────────────────────────────"
printf "  %-10s %-12s %s\n" "Tool" "Found" "Requirement"
echo "────────────────────────────────────────────────────────"

# ── Node.js (≥ 22) ───────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/^v//')
  if version_gte "$NODE_VER" "22.0.0"; then
    pass "Node.js" "v${NODE_VER}" "required: 22+"
  else
    fail "Node.js" "v${NODE_VER}" "required: 22+  →  https://nodejs.org"
  fi
else
  missing "Node.js" "required: 22+  →  https://nodejs.org"
fi

# ── pnpm (≥ 10) ──────────────────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  PNPM_VER=$(pnpm --version)
  if version_gte "$PNPM_VER" "10.0.0"; then
    pass "pnpm" "$PNPM_VER" "required: 10+"
  else
    fail "pnpm" "$PNPM_VER" "required: 10+  →  npm install -g pnpm@10"
  fi
else
  missing "pnpm" "required: 10+  →  npm install -g pnpm@10"
fi

# ── Go (≥ 1.25.7) ────────────────────────────────────────────────────────────
if command -v go &>/dev/null; then
  GO_VER=$(go version | awk '{print $3}' | sed 's/^go//')
  if version_gte "$GO_VER" "1.25.7"; then
    pass "Go" "$GO_VER" "required: 1.25.7+"
  else
    fail "Go" "$GO_VER" "required: 1.25.7+  →  https://go.dev/dl"
  fi
else
  missing "Go" "required: 1.25.7+  →  https://go.dev/dl"
fi

# ── Java (≥ 21) ──────────────────────────────────────────────────────────────
if command -v java &>/dev/null; then
  # 'java -version' prints to stderr; format varies between vendors
  JAVA_FULL=$(java -version 2>&1 | head -1)
  JAVA_VER=$(echo "$JAVA_FULL" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  # Handle version strings like "21.0.1" or "17.0.5" or "1.8.0_352"
  JAVA_MAJOR=$(echo "$JAVA_VER" | cut -d. -f1)
  # Old-style: 1.8 → major is second segment
  [[ "$JAVA_MAJOR" == "1" ]] && JAVA_MAJOR=$(echo "$JAVA_VER" | cut -d. -f2)
  if [[ -n "$JAVA_MAJOR" ]] && (( JAVA_MAJOR >= 21 )); then
    pass "Java" "$JAVA_VER" "required: 21+"
  else
    DISPLAY_VER="${JAVA_VER:-unknown}"
    fail "Java" "$DISPLAY_VER" "required: 21+  →  brew install --cask temurin@21  OR  sdk install java 21-tem"
  fi
else
  missing "Java" "required: 21+  →  brew install --cask temurin@21  OR  sdk install java 21-tem"
fi

# ── Docker (installed + daemon running) ──────────────────────────────────────
if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker version --format '{{.Client.Version}}' 2>/dev/null || true)
  if docker info &>/dev/null; then
    pass "Docker" "${DOCKER_VER:-installed}" "daemon running"
  else
    fail "Docker" "${DOCKER_VER:-installed}" "daemon not running  →  start Docker Desktop"
  fi
else
  missing "Docker" "required  →  https://www.docker.com/products/docker-desktop"
fi

# ── Maven (needed for api-java:serve) ────────────────────────────────────────
if command -v mvn &>/dev/null; then
  MVN_VER=$(mvn --version 2>/dev/null | head -1 | awk '{print $3}')
  pass "Maven" "$MVN_VER" "required for api-java:serve"
else
  fail "Maven" "not found" "required for api-java:serve  →  brew install maven  OR  sdk install maven"
fi

# ── tmux (optional unless --tmux flag passed) ─────────────────────────────────
if command -v tmux &>/dev/null; then
  TMUX_VER=$(tmux -V | awk '{print $2}')
  if version_gte "$TMUX_VER" "3.2"; then
    pass "tmux" "$TMUX_VER" "optional (needed for: npm run dev:tmux)"
  else
    warn "tmux" "$TMUX_VER" "needs 3.2+ for pane titles  →  brew upgrade tmux"
  fi
else
  if $REQUIRE_TMUX; then
    missing "tmux" "required for: npm run dev:tmux  →  brew install tmux"
  else
    missing_warn "tmux" "optional  →  brew install tmux  (only needed for: npm run dev:tmux)"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────────"
if (( ERRORS > 0 )); then
  printf "${RED}${BOLD}✗ ${ERRORS} prerequisite(s) missing or out of date. Fix the above before continuing.${RESET}\n\n"
  exit 1
elif (( WARNINGS > 0 )); then
  printf "${YELLOW}${BOLD}⚠ All required tools present. ${WARNINGS} optional tool(s) not found.${RESET}\n\n"
  exit 0
else
  printf "${GREEN}${BOLD}✓ All prerequisites satisfied.${RESET}\n\n"
  exit 0
fi
