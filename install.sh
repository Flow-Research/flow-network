#!/usr/bin/env bash
set -euo pipefail

FLOW_REPO_URL="${FLOW_REPO_URL:-https://github.com/Flow-Research/harnessy.git}"
FLOW_INSTALL_DIR="${FLOW_INSTALL_DIR:-$HOME/harnessy}"
FLOW_CACHE_DIR="${FLOW_CACHE_DIR:-$HOME/.cache/harnessy}"
FLOW_NONINTERACTIVE="${FLOW_NONINTERACTIVE:-0}"
FLOW_SKIP_SUBPROJECTS="${FLOW_SKIP_SUBPROJECTS:-0}"

SCRIPT_SOURCE="${BASH_SOURCE[0]-$0}"
SCRIPT_DIR="$(cd -- "$(dirname -- "$SCRIPT_SOURCE")" && pwd)"
LOCAL_SOURCE=0
INSTALL_MODE="bootstrap"
TARGET_ROOT=""
INSTALL_COMMUNITY="auto"
FLOW_RECONFIGURE="${FLOW_RECONFIGURE:-0}"

if [[ -d "$SCRIPT_DIR/tools/flow-install" && -d "$SCRIPT_DIR/Jarvis" ]]; then
  LOCAL_SOURCE=1
fi

log() {
  printf '%s\n' "$1"
}

need_command() {
  command -v "$1" >/dev/null 2>&1
}

path_has_entry() {
  local needle="$1"
  local entry
  IFS=':' read -r -a path_entries <<<"${PATH:-}"
  for entry in "${path_entries[@]}"; do
    [[ "$entry" == "$needle" ]] && return 0
  done
  return 1
}

local_commands_dir() {
  if [[ -n "${XDG_BIN_HOME:-}" ]]; then
    printf '%s' "$XDG_BIN_HOME"
  else
    printf '%s' "$HOME/.local/bin"
  fi
}

usage() {
  cat <<'EOF'
Flow installer

Usage:
  ./install.sh [--here] [--target PATH] [--yes] [--reconfigure] [--no-community] [--community]

Modes:
  default           Bootstrap a full Flow workspace locally
  --here            Install Flow into the current repository in-place
  --target PATH     Install Flow into the specified repository in-place

Flags:
  --yes             Non-interactive mode
  --reconfigure     Ask for install destinations again even if saved in lockfile
  --no-community    Skip community skill installation
  --community       Force community skill installation
  --help            Show this help
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --here)
        INSTALL_MODE="in-place"
        TARGET_ROOT="$(pwd)"
        ;;
      --target)
        if [[ $# -lt 2 ]]; then
          log "[error] --target requires a path"
          exit 1
        fi
        INSTALL_MODE="in-place"
        TARGET_ROOT="$2"
        shift
        ;;
      --yes)
        FLOW_NONINTERACTIVE=1
        ;;
      --reconfigure)
        FLOW_RECONFIGURE=1
        ;;
      --no-community)
        INSTALL_COMMUNITY="0"
        ;;
      --community)
        INSTALL_COMMUNITY="1"
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        log "[error] Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
    shift
  done

  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    TARGET_ROOT="$(cd "$TARGET_ROOT" && pwd)"
  fi
  if [[ "$INSTALL_COMMUNITY" == "auto" ]]; then
    INSTALL_COMMUNITY="1"
  fi
}

install_uv() {
  if need_command uv; then
    log "[ok] uv already installed"
    return
  fi

  log "[info] Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
}

ensure_node_and_pnpm() {
  if ! need_command node; then
    log "[error] node is required for Flow installation. Install Node 18+ and rerun."
    exit 1
  fi

  if need_command pnpm; then
    log "[ok] pnpm already installed"
    return
  fi

  if need_command corepack; then
    log "[info] Enabling pnpm via corepack..."
    corepack enable pnpm >/dev/null 2>&1 || true
    corepack prepare pnpm@9.15.4 --activate >/dev/null 2>&1 || true
  fi

  if ! need_command pnpm; then
    log "[error] pnpm is required for Flow installation. Install pnpm and rerun."
    exit 1
  fi
}

resolve_flow_source() {
  if [[ "$LOCAL_SOURCE" -eq 1 ]]; then
    FLOW_ROOT="$SCRIPT_DIR"
    log "[ok] Using local Flow checkout: $FLOW_ROOT"
    return
  fi

  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    FLOW_ROOT="$FLOW_CACHE_DIR"
  else
    FLOW_ROOT="$FLOW_INSTALL_DIR"
  fi

  if [[ -d "$FLOW_ROOT/.git" ]]; then
    log "[info] Updating existing Flow checkout at $FLOW_ROOT"
    git -C "$FLOW_ROOT" pull --ff-only
  else
    mkdir -p "$(dirname "$FLOW_ROOT")"
    log "[info] Cloning Flow into $FLOW_ROOT"
    git clone "$FLOW_REPO_URL" "$FLOW_ROOT"
  fi
}

install_jarvis() {
  log "[info] Installing Jarvis CLI into PATH"
  uv tool install --force "$FLOW_ROOT/Jarvis"
}

install_flow_framework() {
  local flow_args=()
  if [[ "$FLOW_NONINTERACTIVE" == "1" ]]; then
    flow_args+=(--yes)
  fi
  if [[ "$FLOW_RECONFIGURE" == "1" ]]; then
    flow_args+=(--reconfigure)
  fi

  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    log "[info] Installing Flow framework into target repo: $TARGET_ROOT"
    if ((${#flow_args[@]})); then
      node "$FLOW_ROOT/tools/flow-install/index.mjs" "${flow_args[@]}" --target "$TARGET_ROOT"
    else
      node "$FLOW_ROOT/tools/flow-install/index.mjs" --target "$TARGET_ROOT"
    fi
    return
  fi

  log "[info] Installing Flow framework into project root"
  (
    cd "$FLOW_ROOT"
    if ((${#flow_args[@]})); then
      node tools/flow-install/index.mjs "${flow_args[@]}"
    else
      node tools/flow-install/index.mjs
    fi
  )
}

install_community_skills() {
  if [[ "$INSTALL_COMMUNITY" != "1" ]]; then
    log "[skip] Skipping community skill installation"
    return
  fi

  local installer="$FLOW_ROOT/tools/flow-install/skills/community-skills-install/scripts/main.js"
  local install_context="$FLOW_ROOT"
  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    install_context="$TARGET_ROOT"
  fi
  if [[ -f "$installer" ]]; then
    log "[info] Installing community skills"
    (
      cd "$install_context"
      node "$installer" --full
    )
  else
    log "[warn] Community skills installer not found at $installer"
  fi
}

clone_subprojects() {
  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    log "[skip] In-place install selected; not cloning Flow sub-projects"
    return
  fi

  if [[ "$FLOW_SKIP_SUBPROJECTS" == "1" ]]; then
    log "[skip] Skipping Flow sub-project clone"
    return
  fi

  if [[ "$LOCAL_SOURCE" -eq 1 ]]; then
    log "[skip] Local checkout detected; not cloning sub-projects"
    return
  fi

  if [[ "$FLOW_NONINTERACTIVE" != "1" ]]; then
    printf 'Clone Flow Core and Flow Platform repos into the workspace? [y/N]: '
    read -r answer
    case "$answer" in
      y|Y|yes|YES) ;;
      *) log "[skip] Skipping sub-project clone"; return ;;
    esac
  fi

  mkdir -p "$FLOW_ROOT/Focus"
  if [[ ! -d "$FLOW_ROOT/Flow/.git" ]]; then
    git clone https://github.com/Flow-Research/Flow.git "$FLOW_ROOT/Flow"
  fi
  if [[ ! -d "$FLOW_ROOT/Focus/Flow/.git" ]]; then
    git clone https://github.com/Flow-Research/work-stream.git "$FLOW_ROOT/Focus/Flow"
  fi
}

print_summary() {
  local installed_root="$FLOW_ROOT"
  if [[ "$INSTALL_MODE" == "in-place" ]]; then
    installed_root="$TARGET_ROOT"
  fi

  log ""
  log "Flow installation complete"
  log "- Installer source: $FLOW_ROOT"
  log "- Install target: $installed_root"
  log "- Jarvis: $(command -v jarvis || printf 'not found')"
  log "- Shared skills: $HOME/.agents/skills"
  log "- Terminal command shims: $(local_commands_dir)"
  log "- Lifecycle scripts: $HOME/.scripts"
  if ! path_has_entry "$(local_commands_dir)"; then
    log "- PATH warning: add '$(local_commands_dir)' to your shell PATH for Flow-installed commands"
  fi
  log ""
  log "Next steps:"
  log "1. Review .jarvis/context/ and fill in project-specific context files"
  log "2. Run 'pnpm skills:register' or 'npm run skills:register' in any project with local .agents/skills/"
  log "3. Run 'jarvis status' to verify the CLI install"
}

main() {
  parse_args "$@"
  install_uv
  ensure_node_and_pnpm
  resolve_flow_source
  install_jarvis
  install_flow_framework
  install_community_skills
  clone_subprojects
  print_summary
}

main "$@"
