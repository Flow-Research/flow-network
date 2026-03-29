# Flow Harness — Agent Instructions

## Workspace Structure

| Project | Path | Stack | Status |
|---------|------|-------|--------|
| Flow Platform (POC) | `Focus/Flow/` | Python/FastAPI, React, Solidity, Base Chain | Active primary |
| Flow Core (P2P Engine) | `Flow/` | Rust, libp2p, RocksDB, Axum, Qdrant | Phase 3 complete, paused |
| Jarvis CLI | `Jarvis/` | Python 3.11+, Click, AnyType/Notion | Active tooling |
| Knowledge Base | `knowledge-base/` | Python + Astro, GitHub Actions | Brainstorming |

## Installation

```bash
# Full Flow workspace bootstrap (after publishing harnessy)
./install.sh

# Install Jarvis CLI from this workspace
uv tool install --force ./Jarvis

# Install Flow framework into another project
node tools/flow-install/index.mjs --yes
```

## Context Loading

Read `.jarvis/context/README.md` for the knowledge base protocol. Start with `status.md`, `roadmap.md`, and `team.md` for orientation. For ideation, issue intake, PRD, and architecture tradeoff work, also read `.jarvis/context/docs/strategy/README.md` when it exists and follow its suggested read order.

## Key Commands

| Project | Dev | Test | Lint |
|---------|-----|------|------|
| Focus/Flow backend | `cd Focus/Flow/backend && uvicorn app.main:app --reload` | `pytest` | `ruff check` |
| Focus/Flow frontend | `cd Focus/Flow/frontend && pnpm dev` | — | `pnpm lint` |
| Flow (Rust) | `cargo run -p flow-node` | `cargo test -p flow-node` | `cargo clippy -p flow-node -- -D warnings` |
| Jarvis CLI | `uv run jarvis <command>` | `uv run pytest` | `uv run ruff check` |

## Conventions

- **No `.env` commits** — each project has `.env.example`
- **Jarvis CLI** — always run via `uv run jarvis` or `uv run python -m jarvis`
- **`{{global}}`** in `.jarvis/context/` files is Jarvis CLI templating; treat as no-op
- **Sub-project agent files** — `Flow/AGENTS.md` and `Jarvis/AGENTS.md` have project-specific instructions; defer to them when working in those directories

## Skill Usage Protocol

- **For every user request**, check available skills (installed and installable) before proceeding.
- Sources of truth:
  - Global discovery: `${AGENTS_SKILLS_ROOT}` (synced via `pnpm skills:register`; default resolved from `scripts/skills-root.config.json`)
  - Catalog: `.jarvis/context/skills/_catalog.md`
- If a relevant skill exists, **use it** even when the user doesn't explicitly invoke a slash command.
- After adding or updating skills, run `pnpm skills:validate && pnpm skills:register`.
- For skills that call command docs, reference installed paths in `SKILL.md` as `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/<file-name>.md`.
- Every `SKILL.md` must declare template resolution: `Template paths are resolved from ${AGENTS_SKILLS_ROOT}/<skill-name>/.`

## Autoresearch Convention

All Flow skills include `autoresearch: enabled: true` in their `manifest.yaml` by default. This enables the autonomous self-improvement ratchet loop via `/autoflow`:

- **Protocol**: `${AGENTS_SKILLS_ROOT}/_shared/autoresearch.md` defines the three-file contract (editable skills / fixed evaluation / human control)
- **Metric**: Multiplicative composite score (`ratchet.py`) — weakness in any dimension drags the entire score
- **Hard gates**: Catastrophic failures and regressions are vetoes, not soft penalties
- **When creating skills**: `/skill-create` includes autoresearch by default. Set `time_budget_seconds` by blast_radius: high=1800, medium=1200, low=600
- **Human control**: `program.md` at the repo root steers the loop. Agents read it every iteration but never modify it.

## Technical Debt Tracking Law

- Treat intentional shortcuts, deferred migrations, and knowingly postponed cleanup as **tracked technical debt**, not informal notes.
- Maintain debt in `.jarvis/context/technical-debt.md` and per-epic in `.jarvis/context/specs/<epic>/tech_debt.md`.
- Every debt item must include: ID, status, type, scope, context, impact, proposed resolution, target phase, and links.
- Do not hide debt in chat responses or TODO comments alone. Persist it in the debt registers.
- When debt is resolved or accepted, update the status in the register.

## Personal Context

- Machine-specific config lives in `.jarvis/context/local.md` (gitignored). See `local.md.example` for the template.
- Per-contributor private space: `.jarvis/context/private/<username>/` (gitignored).
- Personal contributor notes should live under `.jarvis/context/private/<username>/` rather than shared root files.
- Full protocol: `.jarvis/context/docs/personal-context-protocol.md`.
- **Rule:** AGENTS.md must contain zero absolute filesystem paths. Reference `local.md` for per-machine values.

<!-- flow:start -->
## Flow Framework

> `FLOW_SKIP_SUBPROJECTS=true`

This repo is Flow-managed.

- Read `.jarvis/context/README.md`
- Read `.jarvis/context/AGENTS.md`
- Global skills: `~/.agents/skills/`
- Project skills: `.agents/skills/` (if present)
- If inside a sub-project, prefer its local `.jarvis/context/`
<!-- flow:end -->
