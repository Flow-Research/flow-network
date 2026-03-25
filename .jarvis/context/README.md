# .jarvis/context/ — Knowledge Base Protocol

## Purpose

This directory is the canonical knowledge base for the Flow Harness workspace. AI agents, Jarvis CLI, and human contributors read these files for project context.

## Loading Order

For **general context**, read in this order:
1. `status.md` — Active work and current execution truth
2. `roadmap.md` — Phase ordering, milestones, and what is deferred
3. `team.md` — Ownership, delegation, and coordination model
4. `technical-debt.md` — Current debt register and cleanup obligations

For **strategy, ideation, issue intake, PRD, and architecture tradeoff** work, also read:
5. `docs/strategy/README.md` — Strategy folder guide and suggested read order when present
6. The relevant strategy docs linked from `docs/strategy/README.md`

Optional supporting docs when relevant:
7. `projects.md` — Workspace inventory, paths, and project roles
8. `decisions.md` — Settled architectural and economic decisions

For **architecture/design** tasks, also read:
9. `docs/flow-poc-architecture.md` — Current POC system architecture
10. `docs/flow-deep-system-analysis.md` — Reference analysis of the broader Flow vision

For **development** tasks, also read:
11. `docs/standards/development-guidance.md` — Workspace engineering workflow guidance

For **meeting context**, browse:
12. `meetings/PROTOCOL.md` — Meeting notes template and naming convention
13. `meetings/YYYY/Mon/DD-<title>.md` — Individual meeting notes (most recent first)

## Canonical Root Files

| File | Role | Updated |
|------|------|---------|
| `status.md` | Canonical current-state document for focus, blockers, constraints, and sprint work | 2026-03 |
| `roadmap.md` | Canonical phase and milestone guide | 2026-03 |
| `team.md` | Canonical ownership and delegation guide | 2026-03 |
| `technical-debt.md` | Project-level debt register | 2026-03 |

## Optional Supporting Root Files

| File | Role | Updated |
|------|------|---------|
| `projects.md` | Workspace catalog with paths, stacks, and project roles | 2026-03 |
| `decisions.md` | Architecture and economics decisions | 2026-03 |

## Standards and Reference Docs

| File | Role | Updated |
|------|------|---------|
| `docs/standards/development-guidance.md` | Workspace engineering workflow guidance | 2026-03 |
| `docs/standards/technical-debt-tracking-standard.md` | Required debt tracking structure | 2026-03 |
| `docs/flow-poc-architecture.md` | Current POC architecture (Bittensor, orchestrator, agents) | 2026-03 |
| `docs/flow-deep-system-analysis.md` | Deep reference analysis of the full Flow ecosystem | 2026-03 |
| `docs/flow-v1-unit-economics-model-appendix.md` | Detailed unit economics appendix | 2026-03 |
| `docs/contribution-protocol.md` | Contribution workflow for Flow core, skills, knowledge, and memory | 2026-03 |
| `docs/skill-promotion-maintainer-playbook.md` | Maintainer-specific skill promotion workflow | 2026-03 |

## Standard Strategy Folder

- `docs/strategy/` is the standard home for strategic intent, operating thesis, and business-model documents.
- Repos adopting Flow should store org-level strategy docs there and keep a `docs/strategy/README.md` index.
- `issue-flow` and brainstorming should cite this folder when it exists so epics and issues stay aligned with strategy instead of only local implementation context.

## Template Syntax

Files may start with `{{global}}`. This is a **Jarvis CLI feature** that includes global context from `~/.jarvis/context/`. Other agents should treat `{{global}}` as a no-op marker and read the rest of the file normally.

## Tiers

- **Workspace-level** (this directory): Shared Flow Harness truth
- **Project-level** (e.g. `Flow/.jarvis/context/`): Project-specific overrides and implementation details
- Project-level files take precedence when working inside a specific sub-project

## Freshness Convention

The `Updated` column in the catalog tracks when each file was last meaningfully updated. Files older than 2 months should be reviewed before relying on them for current decisions.
