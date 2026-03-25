# Flow Context AGENTS

This file contains Flow's installed agent protocol for this repository.

- Flow manages only the dedicated managed block below.
- You can add project-specific notes above or below the managed block.
- Future Flow updates should merge only the managed block, never replace this file.

<!-- flow-context:start -->
## Flow Protocol

This repo is Flow-managed. Use this file as the canonical Flow agent protocol for the installed project.

### Session Start

1. Read `.jarvis/context/README.md`
2. Load context in order: `status.md` -> `roadmap.md` -> `team.md` -> `technical-debt.md`
3. For ideation, issue intake, PRD, roadmap, and architecture tradeoff work, read `.jarvis/context/docs/strategy/README.md` when it exists, then load the relevant strategy docs it points to
4. Treat `projects.md` and `decisions.md` as optional supporting docs when present
5. Check `.jarvis/context/skills/_catalog.md` for project catalog entries
6. Prefer deeper sub-project context when working inside a nested app with its own `.jarvis/context/`

### Skills

- Global skills live in `~/.agents/skills/`
- Project-local skills live in `.agents/skills/` when present
- Run `pnpm skills:register` after adding or updating project-local skills
- Run `pnpm harness:verify` to confirm Flow, community, OpenCode, and Claude parity

### Context Vault

- Canonical context root: `.jarvis/context/`
- Standard strategy folder: `.jarvis/context/docs/strategy/`
- Memory scope registry: `.jarvis/context/scopes/_scopes.yaml`
- Technical debt register: `.jarvis/context/technical-debt.md`
- Template token `{{global}}` is Jarvis templating; treat it as a no-op in raw files

### Conventions

- Never commit `.env` files; use `.env.example`
- Personal context belongs in `.jarvis/context/private/<username>/`
- Keep debt tracked in the debt registers, not only in chat or TODO comments
<!-- flow-context:end -->>>>
