#!/usr/bin/env bash
set -euo pipefail

# Run Docker harness verification and keep the container alive for manual inspection.
#
# Usage (from repo root):
#   bash tests/harness/run-ci-verify-interactive.sh [--with-opencode] [--with-claude]
#
# Flags:
#   --with-opencode   Install and verify OpenCode CLI in the container
#   --with-claude     Install and verify Claude Code CLI in the container
#
# After verification completes (pass or fail), you'll be dropped into a bash shell
# inside the container. Explore freely:
#   ls ~/.agents/skills/
#   cat flow-install.lock.json
#   node scripts/flow/verify-harness.mjs
#   python3 ~/.agents/skills/_shared/run_metrics.py compute --skill issue-flow
#   exit  (stops and removes container)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE_NAME="harnessy-verify"
CONTAINER_NAME="harnessy-verify-interactive"

# Collect flags to pass through
VERIFY_FLAGS=()
DOCKER_ENV=(-e SKIP_COMMUNITY=1)
for arg in "$@"; do
  case "$arg" in
    --with-opencode)
      VERIFY_FLAGS+=("--with-opencode")
      DOCKER_ENV+=(-e INSTALL_OPENCODE=1)
      ;;
    --with-claude)
      VERIFY_FLAGS+=("--with-claude")
      DOCKER_ENV+=(-e INSTALL_CLAUDE=1)
      ;;
  esac
done

echo "=== Building Docker image ==="
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

# Remove any leftover container from a previous run
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

echo ""
echo "=== Running harness verification ==="
if [[ ${#VERIFY_FLAGS[@]} -gt 0 ]]; then
  echo "  Flags: ${VERIFY_FLAGS[*]}"
fi
echo ""

# Build the verify command with flags
VERIFY_CMD="/source/harnessy/tests/harness/run-ci-verify.sh"
if [[ ${#VERIFY_FLAGS[@]} -gt 0 ]]; then
  VERIFY_CMD="$VERIFY_CMD ${VERIFY_FLAGS[*]}"
fi

# Run verification, then drop into interactive shell
docker run \
    --name "$CONTAINER_NAME" \
    -v "$REPO_ROOT:/source/harnessy:ro" \
    "${DOCKER_ENV[@]}" \
    -it \
    "$IMAGE_NAME" \
    bash -c "
        echo '--- Running automated verification ---'
        echo ''
        $VERIFY_CMD
        RESULT=\$?
        echo ''
        if [ \$RESULT -eq 0 ]; then
            echo '=== VERIFICATION PASSED ==='
        else
            echo \"=== VERIFICATION FAILED (\$RESULT issues) ===\"
        fi
        echo ''
        echo 'Dropping into interactive shell. Explore freely:'
        echo '  ls ~/.agents/skills/'
        echo '  cat flow-install.lock.json'
        echo '  node scripts/flow/verify-harness.mjs'
        echo '  python3 ~/.agents/skills/_shared/run_metrics.py compute --skill issue-flow'
        echo '  opencode --version  (if --with-opencode was used)'
        echo '  claude --version    (if --with-claude was used)'
        echo '  exit  (stops container)'
        echo ''
        exec bash
    "

# Cleanup after exit
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
echo "Container removed."
