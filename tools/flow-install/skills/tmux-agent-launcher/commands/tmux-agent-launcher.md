---
description: Launch Claude or OpenCode in a named tmux session
argument-hint: "--runner <claude|opencode> <session-name> [options]"
---

# Command Contract: tmux-agent-launcher

## Purpose

Start `claude` or `opencode` in a new tmux session, or attach to an existing named session, so users or agents can keep long-running interactive CLIs isolated by session name.

## Ownership

- Owner: julian
- Source of truth: `${AGENTS_SKILLS_ROOT}/tmux-agent-launcher/scripts/tmux-agent-launcher`
- Wrapper layer: skill

## Invocation

```bash
tmux-agent-launcher --runner <claude|opencode> <session-name> [options]
tmux-agent-launcher attach <session-name> [--dry-run] [--json]
tmux-agent-launcher list [--json]
t --runner <claude|opencode> <session-name> [options]
t attach <session-name> [--dry-run] [--json]
t list [--json]
```

This command is intended to be installed into the user-local bin directory (`$XDG_BIN_HOME` or `~/.local/bin`) by Flow so it is runnable directly from the terminal when that directory is on `PATH`.
Flow also installs a short alias command, `t`, from the same skill.

## Arguments

| Name | Required | Description |
|---|---|---|
| `session-name` | yes | Name of the tmux session to create |

## Flags

| Flag | Required | Description |
|---|---|---|
| `--runner <name>` | yes | Runner to launch: `claude` or `opencode` |
| `--cwd <path>` | no | Working directory for the tmux session; defaults to the current directory |
| `--attach` | no | Attach immediately after creating the session |
| `--dry-run` | no | Print the resolved launch plan without creating a tmux session |
| `--json` | no | Emit machine-readable JSON |
| `--help` | no | Show usage |

## Modes

- `launch` (default): create a new named tmux session and start the selected runner inside it.
- `attach`: attach to an already-running tmux session by name.
- `list`: list current tmux session names.

## Environment

| Variable | Required | Description |
|---|---|---|
| `TMUX_AGENT_LAUNCHER_CLAUDE_CMD` | no | Override the command used for the `claude` runner |
| `TMUX_AGENT_LAUNCHER_OPENCODE_CMD` | no | Override the command used for the `opencode` runner |

## Output

### Human mode

Prints a concise success message with the session name, runner, and working directory. In `--dry-run`, prints the resolved tmux command plan.

### JSON mode

```json
{
  "ok": true,
  "action": "launch",
  "runner": "claude",
  "session": "agent-name",
  "cwd": "/abs/path",
  "attach": false,
  "dry_run": false,
  "command": ["tmux", "new-session", "-d", "-s", "agent-name", "-c", "/abs/path", "bash", "-lc", "claude"]
}
```

Attach dry-run example:

```json
{
  "ok": true,
  "action": "attach",
  "session": "agent-name",
  "dry_run": true,
  "command": ["tmux", "attach-session", "-t", "agent-name"]
}
```

List example:

```json
{
  "ok": true,
  "action": "list",
  "sessions": ["agent-name", "reviewer"]
}
```

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Generic failure |
| `2` | Invalid input or unsupported runner |
| `3` | Missing dependency (`tmux` or runner command) |
| `4` | Session conflict or missing target session |

## Side Effects

- Creates a tmux session.
- Starts a local CLI process inside that tmux session.
- Attaches the current terminal to an existing tmux session in `attach` mode.
- Reads the active tmux session list in `list` mode.

## Examples

```bash
tmux-agent-launcher --runner claude reviewer
tmux-agent-launcher --runner opencode planner --cwd /tmp/project --attach
tmux-agent-launcher --runner claude qa-agent --dry-run --json
tmux-agent-launcher attach reviewer
tmux-agent-launcher attach reviewer --dry-run --json
tmux-agent-launcher list
tmux-agent-launcher list --json
t --runner claude reviewer
t list
```

## Smoke Test

```bash
tmux-agent-launcher --runner claude demo-agent --dry-run --json
t --runner claude demo-agent --dry-run --json
```
