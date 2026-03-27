#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE_ROOT="${FLOW_EVAL_CONTAINER_ROOT:-$HOME/containers/harnessy/install-eval}"
IMAGE_TAG="${FLOW_EVAL_IMAGE_TAG:-flow-install-eval:latest}"
PORT="${FLOW_EVAL_HTTP_PORT:-38123}"
SNAPSHOT_DIR="${FLOW_EVAL_SNAPSHOT_DIR:-$(mktemp -d /tmp/flow-remote-install-XXXXXX)}"
INSTALL_DIR_IN_CONTAINER='${HOME}/harnessy'

cleanup() {
  if [[ -n "${HTTP_PID:-}" ]]; then
    kill "$HTTP_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

python3 "$WORKSPACE_ROOT/tools/flow-install/skills/dev-container/scripts/scaffold.py" --output "$BUNDLE_ROOT" --force >/dev/null
"$BUNDLE_ROOT/scripts/build-image.sh" "$BUNDLE_ROOT/specs/dev-baseline.json" "$IMAGE_TAG" >/dev/null

mkdir -p "$SNAPSHOT_DIR"
FILE_LIST="$(mktemp /tmp/flow-remote-files-XXXXXX)"
git -C "$WORKSPACE_ROOT" ls-files -co --exclude-standard -z > "$FILE_LIST"
python3 - "$WORKSPACE_ROOT" "$SNAPSHOT_DIR" "$FILE_LIST" <<'PY'
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
dest = Path(sys.argv[2])
data = Path(sys.argv[3]).read_bytes().split(b'\0')
for raw in data:
    if not raw:
        continue
    rel = Path(raw.decode('utf8'))
    src = root / rel
    if not src.exists() or src.is_dir():
        continue
    target = dest / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)
PY
rm -f "$FILE_LIST"
git -C "$SNAPSHOT_DIR" init >/dev/null
git -C "$SNAPSHOT_DIR" config user.email flow-eval@example.com
git -C "$SNAPSHOT_DIR" config user.name flow-eval
git -C "$SNAPSHOT_DIR" add . >/dev/null
git -C "$SNAPSHOT_DIR" commit -m "flow remote eval snapshot" >/dev/null

python3 -m http.server "$PORT" --directory "$SNAPSHOT_DIR" >/tmp/flow-remote-install-http.log 2>&1 &
HTTP_PID=$!
sleep 2

DOCKER_ARGS=(
  run --rm --init
  -v "$SNAPSHOT_DIR:/source/harnessy:ro"
)

docker "${DOCKER_ARGS[@]}" "$IMAGE_TAG" bash -lc '
  set -euo pipefail
  mkdir -p "$HOME/.config/opencode" "$HOME/.claude" "$HOME/.local/bin"
  cat > "$HOME/.config/opencode/opencode.json" <<"EOF"
{
  "$schema": "https://opencode.ai/config.json",
  "skills": { "paths": [] }
}
EOF
  cat > "$HOME/.claude/settings.json" <<"EOF"
{}
EOF
  export PATH="$HOME/.local/bin:$PATH"
  npm install -g --prefix "$HOME/.local" opencode-ai @anthropic-ai/claude-code >/dev/null
  FLOW_INSTALL_DIR="$HOME/harnessy" \
  FLOW_NONINTERACTIVE=1 \
  FLOW_SKIP_SUBPROJECTS=1 \
  FLOW_REPO_URL="file:///source/harnessy" \
  bash -lc "$(curl -fsSL http://host.docker.internal:'"$PORT"'/install.sh)"
  jarvis --help >/dev/null
  pnpm --dir "$HOME/harnessy" harness:verify
  opencode run --format json "/brainstorm" > /tmp/opencode-flow-skill.json
  python3 - /tmp/opencode-flow-skill.json <<"PY"
import json, sys
from pathlib import Path
seen = False
for line in Path(sys.argv[1]).read_text().splitlines():
    line = line.strip()
    if not line:
        continue
    obj = json.loads(line)
    if obj.get("type") == "tool_use" and obj.get("part", {}).get("tool") == "task":
        seen = True
        break
if not seen:
    raise SystemExit(1)
PY
  echo "PASS opencode loaded Flow core skill"
  opencode run --format json "/ab-test-setup We are testing signup CTA button copy." > /tmp/opencode-community-skill.json
  python3 - /tmp/opencode-community-skill.json <<"PY"
import json, sys
from pathlib import Path
seen = False
for line in Path(sys.argv[1]).read_text().splitlines():
    line = line.strip()
    if not line:
        continue
    obj = json.loads(line)
    if obj.get("type") == "tool_use" and obj.get("part", {}).get("tool") == "task":
        seen = True
        break
if not seen:
    raise SystemExit(1)
PY
  echo "PASS opencode loaded community skill"
  claude -p "/brainstorm" > /tmp/claude-flow-skill.txt
  python3 - /tmp/claude-flow-skill.txt <<"PY"
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
if "Dont worry about having it all figured out" not in text:
    raise SystemExit(1)
PY
  echo "PASS claude executed Flow core slash skill"
  claude -p "/ab-test-setup We are testing signup CTA button copy." > /tmp/claude-community-skill.txt
  python3 - /tmp/claude-community-skill.txt <<"PY"
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
if "Hypothesis" not in text and "A/B" not in text and "test" not in text.lower():
    raise SystemExit(1)
PY
  echo "PASS claude executed community slash skill"
  if [[ "${FLOW_REMOTE_EVAL_FULL_COMMUNITY:-0}" == "1" ]]; then
    cd "$HOME/harnessy"
    node tools/flow-install/skills/community-skills-install/scripts/main.js --full
    pnpm harness:verify
  fi
  opencode --version >/dev/null
  echo "PASS opencode CLI installed in container"
  claude --version >/dev/null
  echo "PASS claude CLI installed in container"
'

echo "Remote docker install evaluation passed. Snapshot: $SNAPSHOT_DIR"
