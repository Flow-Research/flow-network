---
name: tmux-agent-launcher
description: "Launch Claude or OpenCode in a named tmux session from the command line or agent workflows."
disable-model-invocation: true
allowed-tools: Read, Bash
argument-hint: "--runner <claude|opencode> <session-name> [options]"
---

# Tmux Agent Launcher

## Purpose

Launch `claude` or `opencode` inside a named tmux session, attach to an existing named tmux session, or list tmux sessions, without re-implementing the logic in the skill.

## Inputs

- runner: `claude` or `opencode`
- session name
- optional mode: `attach`
- optional mode: `list`
- optional `--cwd <path>`
- optional `--attach`
- optional `--dry-run`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/tmux-agent-launcher/`.

## Steps

1. Read the command contract at `${AGENTS_SKILLS_ROOT}/tmux-agent-launcher/commands/tmux-agent-launcher.md`.
2. Validate that the request includes a supported runner and a session name.
3. Execute `tmux-agent-launcher` with the requested arguments.
4. Prefer `--json` when the caller needs machine-readable output.
5. Return the script output as-is rather than duplicating launch logic in the skill.

## Deterministic Logic (Scripts)

- Source of truth: `${AGENTS_SKILLS_ROOT}/tmux-agent-launcher/scripts/tmux-agent-launcher`
- Input contract: documented in the command contract
- Output contract: human mode and `--json`

## Output

- The launcher script's stdout/stderr and exit semantics.
