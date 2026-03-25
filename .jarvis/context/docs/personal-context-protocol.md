# Personal Context Protocol

How personal (per-contributor) context is managed alongside shared (git-tracked)
project context in the Flow Harness workspace.

## Principle

`AGENTS.md` and all git-tracked files must contain **zero machine-specific paths**
or user-specific configuration. Personal context lives in gitignored locations
and is never committed.

## Shared vs Personal Boundary

| Layer | Location | Git Status | Contains |
|---|---|---|---|
| Shared project context | `.jarvis/context/**` (tracked files) | Tracked | Projects, status, roadmap, team, architecture, specs, plans, standards, decisions, debt |
| Machine-specific overrides | `.jarvis/context/local.md` | Gitignored | External project paths, local tool locations, machine-specific config |
| Private contributor space | `.jarvis/context/private/<username>/` | Gitignored | Personal focus, schedule, work style, private notes, drafts, scratch space |

## Setup

Run `pnpm setup` to configure personal context interactively. The setup script will:

1. Create `local.md` from the template, prompting for external project paths
2. Create your `private/<username>/` namespace
3. Optionally create personal notes inside your private namespace

You can also set up manually:

    cp .jarvis/context/local.md.example .jarvis/context/local.md
    mkdir -p .jarvis/context/private/$(whoami)

## `local.md` Format

`local.md` uses a simple markdown table format that agents can parse:

    # Local Context (Machine-Specific)

    ## External Projects

    | Project | Local Path | Notes |
    |---|---|---|
    | Jarvis CLI | /your/path/to/jarvis | Python 3.11+, use `uv run jarvis <command>` |

    ## Environment Notes

    - Node version manager: nvm / fnm / volta
    - Python environment: uv

## Personal Note Layout

Contributors who want private equivalents of older root-note patterns should create them inside their private namespace, for example:

- `.jarvis/context/private/<username>/focus.md`
- `.jarvis/context/private/<username>/preferences.md`
- `.jarvis/context/private/<username>/calendar.md`

These are intentionally outside the shared canonical root set.

## Rules for AGENTS.md

1. Never add absolute filesystem paths (e.g., `/Users/someone/...`).
2. Never add machine-specific tool versions or locations.
3. Reference `local.md` when context is inherently per-machine.
4. External project descriptions belong in AGENTS.md; their paths belong in `local.md`.
