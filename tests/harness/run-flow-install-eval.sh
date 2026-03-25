#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIXTURES_ROOT="$WORKSPACE_ROOT/tests/fixtures/harness-smoke"
TEMP_ROOT="$(mktemp -d /tmp/flow-install-eval-XXXXXX)"
HOME_DIR="$TEMP_ROOT/home"
BIN_DIR="$HOME_DIR/.local/bin"

export HOME="$HOME_DIR"
export XDG_BIN_HOME="$BIN_DIR"
export PATH="$BIN_DIR:$PATH"

record_pass() {
  printf 'PASS %s%s\n' "$1" "${2:+: $2}"
}

record_fail() {
  printf 'FAIL %s%s\n' "$1" "${2:+: $2}"
}

prepare_home() {
  mkdir -p "$BIN_DIR" "$HOME/.config/opencode" "$HOME/.claude"
  cat > "$HOME/.config/opencode/opencode.json" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "skills": { "paths": [] }
}
EOF
  cat > "$HOME/.claude/settings.json" <<'EOF'
{}
EOF
}

copy_fixture() {
  local name="$1"
  local dest="$2"
  cp -R "$FIXTURES_ROOT/$name" "$dest"
  git -C "$dest" init -b main >/dev/null
}

install_jarvis() {
  uv tool install --force "$WORKSPACE_ROOT/Jarvis" >/dev/null
  if [[ -x "$BIN_DIR/jarvis" ]]; then
    record_pass "Jarvis CLI installed in isolated HOME" "$BIN_DIR/jarvis"
  else
    record_fail "Jarvis CLI installed in isolated HOME" "$BIN_DIR/jarvis"
    return 1
  fi
}

install_agent_clis() {
  npm install -g --prefix "$HOME/.local" opencode-ai @anthropic-ai/claude-code >/dev/null
  test -x "$BIN_DIR/opencode"
  record_pass "OpenCode CLI installed in isolated HOME" "$BIN_DIR/opencode"
  test -x "$BIN_DIR/claude"
  record_pass "Claude CLI installed in isolated HOME" "$BIN_DIR/claude"
}

install_flow() {
  local repo="$1"
  node "$WORKSPACE_ROOT/tools/flow-install/index.mjs" --yes --target "$repo" >/dev/null
}

verify_opencode_skill_load() {
  local prompt="$1"
  local output_file
  output_file="$(mktemp /tmp/opencode-skill-load-XXXXXX)"
  "$HOME/.local/bin/opencode" run --format json "$prompt" > "$output_file"
  python3 - "$output_file" <<'PY'
import json, sys
from pathlib import Path
seen = False
for line in Path(sys.argv[1]).read_text().splitlines():
    line = line.strip()
    if not line:
        continue
    obj = json.loads(line)
    if obj.get('type') == 'tool_use' and obj.get('part', {}).get('tool') == 'task':
        seen = True
        break
if not seen:
    raise SystemExit(1)
PY
  rm -f "$output_file"
}

verify_claude_skill_exec() {
  local prompt="$1"
  local expected="$2"
  local output_file
  output_file="$(mktemp /tmp/claude-skill-load-XXXXXX)"
  "$HOME/.local/bin/claude" -p "$prompt" > "$output_file"
  python3 - "$output_file" "$expected" <<'PY'
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text().strip()
expected = sys.argv[2]
if expected not in text:
    raise SystemExit(1)
PY
  rm -f "$output_file"
}

run_base_eval() {
  local repo="$TEMP_ROOT/base"
  copy_fixture base "$repo"
  install_flow "$repo"
  test -f "$repo/AGENTS.md"
  record_pass "Base fixture AGENTS installed" "$repo/AGENTS.md"
  test -f "$repo/.jarvis/context/AGENTS.md"
  record_pass "Base fixture context AGENTS installed" "$repo/.jarvis/context/AGENTS.md"
  test -f "$repo/scripts/flow/verify-harness.mjs"
  record_pass "Base fixture verify-harness script installed" "$repo/scripts/flow/verify-harness.mjs"
  if [[ "${FLOW_EVAL_FULL_COMMUNITY:-0}" == "1" ]]; then
    (cd "$repo" && node "$WORKSPACE_ROOT/tools/flow-install/skills/community-skills-install/scripts/main.js" --full >/dev/null)
    record_pass "Base fixture full community skill install completed"
  fi
  pnpm --dir "$repo" harness:verify >/dev/null
  record_pass "Base fixture harness verify passed"
  if [[ "${FLOW_EVAL_LLM_TESTS:-0}" == "1" ]]; then
    verify_opencode_skill_load "/brainstorm"
    record_pass "OpenCode can load Flow core skill" "brainstorm"
    verify_claude_skill_exec "/brainstorm" "What's on your mind?"
    record_pass "Claude can execute Flow core slash skill" "brainstorm"
  else
    record_pass "OpenCode/Claude LLM tests skipped (FLOW_EVAL_LLM_TESTS not set)"
  fi
  install_flow "$repo"
  pnpm --dir "$repo" harness:verify >/dev/null
  record_pass "Base fixture rerun remains idempotent enough for harness verify"
  python3 - <<'PY'
import json, os
path = os.path.join(os.environ['HOME'], '.config', 'opencode', 'opencode.json')
data = json.load(open(path))
paths = data.get('skills', {}).get('paths', [])
assert len(paths) == len(set(paths))
PY
  record_pass "OpenCode skills.paths remain unique after rerun"
}

run_local_skill_eval() {
  local repo="$TEMP_ROOT/local-skill"
  copy_fixture local-skill "$repo"
  install_flow "$repo"
  pnpm --dir "$repo" skills:register >/dev/null
  test -f "$HOME/.agents/skills/fixture-skill/SKILL.md"
  record_pass "Project-local skill copied globally" "$HOME/.agents/skills/fixture-skill/SKILL.md"
  pnpm --dir "$repo" harness:verify >/dev/null
  record_pass "Local-skill fixture harness verify passed"
  if [[ "${FLOW_EVAL_LLM_TESTS:-0}" == "1" ]]; then
    verify_opencode_skill_load "/fixture-skill"
    record_pass "OpenCode can load project-local skill" "fixture-skill"
    verify_claude_skill_exec "/fixture-skill" "This skill exists only for harness smoke testing."
    record_pass "Claude can execute project-local slash skill" "fixture-skill"
  else
    record_pass "OpenCode/Claude LLM tests skipped (FLOW_EVAL_LLM_TESTS not set)"
  fi
}

run_custom_path_eval() {
  local repo="$TEMP_ROOT/custom-paths"
  copy_fixture base "$repo"
  python3 - <<'PY'
import json, os
from pathlib import Path
repo = Path(os.environ['CUSTOM_REPO'])
(repo / 'flow-install.lock.json').write_text(json.dumps({
  'installPaths': {
    'agentsFile': 'config/AGENTS.md',
    'contextDir': '.flow/context',
    'skillsDir': '.flow/skills',
    'scriptsDir': 'tools/flow-scripts',
  },
  'communitySkills': {'mode': 'none', 'expected': [], 'strict': False},
}, indent=2) + '\n', encoding='utf8')
PY
  install_flow "$repo"
  test -f "$repo/config/AGENTS.md"
  record_pass "Custom AGENTS path installed" "$repo/config/AGENTS.md"
  test -f "$repo/.flow/context/AGENTS.md"
  record_pass "Custom context path installed" "$repo/.flow/context/AGENTS.md"
  test -f "$repo/tools/flow-scripts/verify-harness.mjs"
  record_pass "Custom scripts path installed" "$repo/tools/flow-scripts/verify-harness.mjs"
  pnpm --dir "$repo" harness:verify >/dev/null
  record_pass "Custom-path fixture harness verify passed"
}

main() {
  prepare_home
  install_jarvis
  if [[ "${FLOW_EVAL_LLM_TESTS:-0}" == "1" ]]; then
    install_agent_clis
  else
    record_pass "Agent CLI install skipped (FLOW_EVAL_LLM_TESTS not set)"
  fi
  run_base_eval
  run_local_skill_eval
  CUSTOM_REPO="$TEMP_ROOT/custom-paths" run_custom_path_eval
  printf '\nArtifacts: %s\n' "$TEMP_ROOT"
}

if ! main; then
  record_fail "Fixture-based install evaluation failed" "$TEMP_ROOT"
  exit 1
fi
