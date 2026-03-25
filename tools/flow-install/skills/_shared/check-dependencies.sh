#!/usr/bin/env bash
set -euo pipefail

# Shared dependency checker for Flow skills.
# Reads dependencies from a skill's manifest.yaml and validates them.
#
# Usage:
#   check-dependencies.sh --manifest <path> [--json] [--interactive]
#
# Exit codes:
#   0 = all required dependencies satisfied
#   3 = missing required dependency

MANIFEST=""
JSON_MODE=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --manifest) MANIFEST="$2"; shift 2 ;;
    --json) JSON_MODE=1; shift ;;
    --interactive) INTERACTIVE=1; shift ;;
    --help) echo "Usage: check-dependencies.sh --manifest <path> [--json] [--interactive]"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$MANIFEST" ]] || { echo "Error: --manifest is required" >&2; exit 2; }
[[ -f "$MANIFEST" ]] || { echo "Error: Manifest not found: $MANIFEST" >&2; exit 2; }

PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$PLATFORM" in
  darwin*) PLATFORM="darwin" ;;
  linux*)  PLATFORM="linux" ;;
  *)       PLATFORM="other" ;;
esac

# Parse manifest dependencies using Python (handles YAML safely)
DEPS_JSON=$(python3 - "$MANIFEST" <<'PY'
import sys, json

path = sys.argv[1]
content = open(path).read()

# Simple YAML parser for the dependencies array
deps = []
in_deps = False
current = {}
in_install = False

for line in content.split('\n'):
    stripped = line.strip()
    if stripped == 'dependencies:':
        in_deps = True
        continue
    if in_deps:
        if line and not line[0].isspace() and not stripped.startswith('-'):
            break
        if stripped.startswith('- tool:'):
            if current:
                deps.append(current)
            current = {'tool': stripped.split(':', 1)[1].strip().strip('"').strip("'")}
            in_install = False
        elif stripped.startswith('description:'):
            current['description'] = stripped.split(':', 1)[1].strip().strip('"').strip("'")
        elif stripped.startswith('check:'):
            current['check'] = stripped.split(':', 1)[1].strip().strip('"').strip("'")
        elif stripped.startswith('auth_check:'):
            current['auth_check'] = stripped.split(':', 1)[1].strip().strip('"').strip("'")
        elif stripped.startswith('required:'):
            val = stripped.split(':', 1)[1].strip().lower()
            current['required'] = val in ('true', 'yes', '1')
        elif stripped == 'install:':
            in_install = True
            current.setdefault('install', {})
        elif in_install and ':' in stripped:
            key, val = stripped.split(':', 1)
            current.setdefault('install', {})[key.strip()] = val.strip().strip('"').strip("'")
        elif not stripped.startswith('-') and not in_install:
            in_install = False

if current:
    deps.append(current)

print(json.dumps(deps))
PY
)

if [[ "$DEPS_JSON" == "[]" ]]; then
  if [[ "$JSON_MODE" == "1" ]]; then
    printf '{"ok":true,"dependencies":[],"missing":[],"message":"No dependencies declared"}\n'
  else
    echo "No dependencies declared in manifest."
  fi
  exit 0
fi

# Check each dependency
RESULTS=$(python3 - "$DEPS_JSON" "$PLATFORM" "$INTERACTIVE" "$JSON_MODE" <<'PY'
import json, subprocess, sys, os

deps = json.loads(sys.argv[1])
platform = sys.argv[2]
interactive = sys.argv[3] == "1"
json_mode = sys.argv[4] == "1"

results = []
missing_required = []

for dep in deps:
    tool = dep.get('tool', '')
    check_cmd = dep.get('check', f'{tool} --version')
    required = dep.get('required', True)
    description = dep.get('description', tool)
    auth_check = dep.get('auth_check')
    install_cmds = dep.get('install', {})

    # Check if tool exists
    try:
        subprocess.run(check_cmd, shell=True, capture_output=True, timeout=10)
        available = True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        available = False

    # Check auth if tool is available
    auth_ok = None
    if available and auth_check:
        try:
            r = subprocess.run(auth_check, shell=True, capture_output=True, timeout=10)
            auth_ok = r.returncode == 0
        except:
            auth_ok = False

    result = {
        'tool': tool,
        'description': description,
        'available': available,
        'required': required,
        'auth_ok': auth_ok,
    }

    if not available:
        install_cmd = install_cmds.get(platform, install_cmds.get('fallback', ''))
        result['install_cmd'] = install_cmd
        if required:
            missing_required.append(result)

    if available and auth_ok is False:
        result['auth_check'] = auth_check

    results.append(result)

output = {
    'ok': len(missing_required) == 0,
    'platform': platform,
    'dependencies': results,
    'missing_required': [r['tool'] for r in missing_required],
}

if json_mode:
    print(json.dumps(output, indent=2))
else:
    for r in results:
        status = "OK" if r['available'] else ("MISSING (required)" if r['required'] else "MISSING (optional)")
        print(f"  {'[ok]' if r['available'] else '[!!]'} {r['tool']}: {status}")
        if not r['available'] and r.get('install_cmd'):
            print(f"      Install: {r['install_cmd']}")
        if r.get('auth_ok') is False:
            print(f"      Auth: NOT AUTHENTICATED — run: {r.get('auth_check', 'unknown')}")
        elif r.get('auth_ok') is True:
            print(f"      Auth: OK")

    if missing_required:
        print(f"\n  {len(missing_required)} required dependency(ies) missing: {', '.join(r['tool'] for r in missing_required)}")
        sys.exit(3)
    else:
        print(f"\n  All dependencies satisfied.")

sys.exit(3 if missing_required else 0)
PY
)

echo "$RESULTS"
# Propagate the exit code from Python
LAST_EXIT=${PIPESTATUS[0]:-$?}

# Re-run to get exit code (echo consumed it)
python3 -c "
import json, subprocess, sys
deps = json.loads('''$DEPS_JSON''')
for dep in deps:
    check_cmd = dep.get('check', dep.get('tool','') + ' --version')
    try:
        subprocess.run(check_cmd, shell=True, capture_output=True, timeout=10, check=True)
    except:
        if dep.get('required', True):
            sys.exit(3)
" 2>/dev/null
