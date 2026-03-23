# .jarvis/context/ — Knowledge Base Protocol

## Purpose

This directory is the canonical knowledge base for the Flow Network workspace. AI agents, Jarvis CLI, and human contributors read these files for project context.

## Loading Order

For **general context**, read in this order:
1. `projects.md` — What exists, where it lives, current status
2. `focus.md` — What we're actively working on right now
3. `priorities.md` — Priority ordering when conflicts arise
4. `goals.md` — Current sprint and phase goals

For **architecture/design** tasks, also read:
5. `decisions.md` — Settled architectural decisions
6. `docs/flow-poc-architecture.md` — Current POC system architecture
7. `docs/flow-deep-system-analysis.md` — Strategic analysis of the full vision

For **development** tasks, also read:
8. `patterns.md` — Code patterns and conventions
9. `preferences.md` — Tool and library preferences
10. `constraints.md` — Technical limits and performance targets
11. `blockers.md` — Current blockers and tech debt

For **planning/scheduling**, also read:
12. `calendar.md` — Milestones and timeline
13. `recurring.md` — Recurring tasks and rituals
14. `delegation.md` — Team structure and delegation candidates

For **meeting context**, browse:
15. `meetings/PROTOCOL.md` — Meeting notes template and naming convention
16. `meetings/YYYY/Mon/DD-<title>.md` — Individual meeting notes (most recent first)

## File Catalog

| File | Description | Updated |
|------|-------------|---------|
| `projects.md` | Master project catalog with paths, stacks, status | 2026-03 |
| `focus.md` | Current development mode and active work | 2026-03 |
| `priorities.md` | Priority ordering across projects and task types | 2026-03 |
| `goals.md` | Sprint goals, phase goals, MVP targets | 2026-03 |
| `decisions.md` | Architecture decisions (storage, network, identity, AI, economics) | 2026-03 |
| `patterns.md` | Code patterns (Rust error handling, logging, async) | 2025-11 |
| `preferences.md` | Dev tool preferences (tracing, anyhow, Sea-ORM) | 2025-11 |
| `constraints.md` | MVP constraints and performance targets | 2025-11 |
| `blockers.md` | Current blockers and tech debt | 2025-11 |
| `calendar.md` | Milestones and timeline | 2025-11 |
| `recurring.md` | Recurring tasks and session rituals | 2025-11 |
| `delegation.md` | Team structure and delegation | 2025-11 |
| `docs/flow-deep-system-analysis.md` | 625-line strategic analysis of full Flow ecosystem | 2026-03 |
| `docs/contribution-protocol.md` | Git-native protocol for contributing Flow core, skills, knowledge, and memory | 2026-03 |
| `docs/skill-promotion-maintainer-playbook.md` | Maintainer workflow for promoting local installed-repo skills into shared Flow skills | 2026-03 |
| `docs/flow-v1-unit-economics-model-appendix.md` | V1 unit economics model | 2026-03 |
| `docs/flow-poc-architecture.md` | Current POC architecture (Bittensor, orchestrator, agents) | 2026-03 |
| `partnerships/accelerate-africa/` | Accelerate Africa proposal and deck docs | 2026-02 |
| `meetings/PROTOCOL.md` | Meeting notes template, naming convention, automation plan | 2026-03 |
| `meetings/2026/Mar/14-flow-poc-kickoff.md` | POC kickoff: architecture review, value flow, sprint cadence | 2026-03 |

## Template Syntax

Files may start with `{{global}}`. This is a **Jarvis CLI feature** that includes global context from `~/.jarvis/context/`. Other agents should treat `{{global}}` as a no-op marker and read the rest of the file normally.

## Tiers

- **Workspace-level** (this directory): Covers the full Flow Network workspace
- **Project-level** (e.g. `Flow/.jarvis/context/`): Project-specific overrides; same file structure
- Project-level files take precedence when working within a specific sub-project

## Freshness Convention

The `Updated` column in the catalog tracks when each file was last meaningfully updated. Files older than 2 months should be reviewed before relying on them for current decisions.
