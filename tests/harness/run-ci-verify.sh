#!/usr/bin/env bash
set -euo pipefail

# CI-friendly Flow harness verification in Docker.
#
# Mounts the repo as a read-only volume and runs a clean install + verify
# inside the container. No HTTP server needed — uses file:// protocol.
#
# Usage (from repo root):
#   bash tests/harness/run-ci-verify.sh
#
# Inside GitHub Actions, the workflow builds the image and runs this script
# inside the container directly (no nested Docker).
#
# Environment variables:
#   HARNESS_SOURCE_DIR  — path to harnessy repo (default: /source/harnessy)
#   HARNESS_TARGET_DIR  — where to install (default: /workspace)
#   SKIP_COMMUNITY      — set to 1 to skip community skills (faster CI)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${HARNESS_SOURCE_DIR:-/source/harnessy}"
TARGET_DIR="${HARNESS_TARGET_DIR:-/workspace}"
SKIP_COMMUNITY="${SKIP_COMMUNITY:-1}"

log() { echo "[ci-verify] $*"; }
pass() { echo "  [PASS] $*"; }
fail() { echo "  [FAIL] $*" >&2; }

FAILURES=0

# ── Phase 1: Validate source mount ──────────────────────────────────────────
log "Phase 1: Validating source"

if [[ ! -d "$SOURCE_DIR" ]]; then
  fail "Source directory not found: $SOURCE_DIR"
  fail "Mount the harnessy repo: docker run -v /path/to/harnessy:/source/harnessy:ro ..."
  exit 1
fi

if [[ ! -f "$SOURCE_DIR/install.sh" ]]; then
  fail "install.sh not found in $SOURCE_DIR"
  exit 1
fi

pass "Source directory: $SOURCE_DIR"
pass "install.sh found"

# ── Phase 2: Initialize workspace ───────────────────────────────────────────
log "Phase 2: Initializing workspace"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# Create a minimal package.json if none exists (simulates a fresh project)
if [[ ! -f package.json ]]; then
  echo '{"name":"harness-ci-target","private":true,"scripts":{}}' > package.json
  pass "Created minimal package.json"
fi

# Initialize git repo (required by flow-install for detection)
if [[ ! -d .git ]]; then
  git init -q
  git config user.email "ci@harnessy.dev"
  git config user.name "CI"
  git add -A && git commit -q -m "init" --allow-empty
  pass "Initialized git repo"
fi

# ── Phase 3: Run Flow install ───────────────────────────────────────────────
log "Phase 3: Running Flow install"

INSTALL_ARGS=(--yes --target "$TARGET_DIR")
if [[ "$SKIP_COMMUNITY" == "1" ]]; then
  INSTALL_ARGS+=(--no-community)
fi

# Use source as the cached harness (skip clone)
export FLOW_CACHE_DIR="$SOURCE_DIR"
export FLOW_REPO_URL="file://$SOURCE_DIR"

# Install Jarvis
log "  Installing Jarvis CLI"
uv tool install --force "$SOURCE_DIR/Jarvis" 2>&1 || {
  fail "Jarvis installation failed"
  FAILURES=$((FAILURES + 1))
}

# Run flow-install
log "  Running flow-install"
node "$SOURCE_DIR/tools/flow-install/index.mjs" "${INSTALL_ARGS[@]}" 2>&1 || {
  fail "flow-install failed"
  FAILURES=$((FAILURES + 1))
}

# ── Phase 4: Run harness verification ───────────────────────────────────────
log "Phase 4: Running harness:verify"

if [[ -f scripts/flow/verify-harness.mjs ]]; then
  node scripts/flow/verify-harness.mjs 2>&1 || {
    fail "harness:verify failed"
    FAILURES=$((FAILURES + 1))
  }
else
  fail "verify-harness.mjs not generated"
  FAILURES=$((FAILURES + 1))
fi

# ── Phase 5: Spot checks ───────────────────────────────────────────────────
log "Phase 5: Spot checks"

# Check jarvis is in PATH
if command -v jarvis &>/dev/null; then
  pass "jarvis CLI available"
else
  fail "jarvis CLI not in PATH"
  FAILURES=$((FAILURES + 1))
fi

# Check skills directory
SKILLS_COUNT=$(find ~/.agents/skills/ -maxdepth 1 -type d 2>/dev/null | wc -l)
if [[ "$SKILLS_COUNT" -gt 30 ]]; then
  pass "Skills installed: $((SKILLS_COUNT - 1)) directories in ~/.agents/skills/"
else
  fail "Expected 30+ skills, found $((SKILLS_COUNT - 1))"
  FAILURES=$((FAILURES + 1))
fi

# Check trace infrastructure
if [[ -f "$HOME/.agents/skills/_shared/trace_capture.py" ]]; then
  pass "trace_capture.py installed"
else
  fail "trace_capture.py missing"
  FAILURES=$((FAILURES + 1))
fi

if [[ -f "$HOME/.agents/skills/_shared/trace_query.py" ]]; then
  pass "trace_query.py installed"
else
  fail "trace_query.py missing"
  FAILURES=$((FAILURES + 1))
fi

if [[ -f "$HOME/.agents/skills/_shared/run_metrics.py" ]]; then
  pass "run_metrics.py installed"
else
  fail "run_metrics.py missing"
  FAILURES=$((FAILURES + 1))
fi

# Check metrics script runs
if python3 "$HOME/.agents/skills/_shared/run_metrics.py" compute --skill issue-flow --json &>/dev/null; then
  pass "run_metrics.py computes successfully"
else
  fail "run_metrics.py failed to compute"
  FAILURES=$((FAILURES + 1))
fi

# Check lockfile has autoflow component field
if grep -q '"autoflow"' flow-install.lock.json 2>/dev/null; then
  pass "Lockfile tracks autoflow component"
else
  # autoflow is optional, just note it
  log "  [INFO] Lockfile does not track autoflow (expected for --yes installs)"
fi

# Check traces: in manifests
TRACED_SKILLS=$(grep -rl "^traces:" ~/.agents/skills/*/manifest.yaml 2>/dev/null | wc -l)
if [[ "$TRACED_SKILLS" -gt 30 ]]; then
  pass "Skills with traces: $TRACED_SKILLS"
else
  fail "Expected 30+ skills with traces, found $TRACED_SKILLS"
  FAILURES=$((FAILURES + 1))
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAILURES" -eq 0 ]]; then
  log "ALL CHECKS PASSED"
  exit 0
else
  log "FAILED with $FAILURES issue(s)"
  exit 1
fi
