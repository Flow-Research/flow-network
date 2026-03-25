# Technical Debt Register — Flow Harness

Project-level debt tracker. Every item follows the standard in `docs/standards/technical-debt-tracking-standard.md`.

## Active Debt

| ID | Status | Type | Scope | Summary | Target Phase |
|----|--------|------|-------|---------|-------------|
| FN-TD-001 | resolved | design | skills | Skills copied from AA; no shared source repo. Drift risk between AA and Flow skill copies. | Phase 2+ |

## Resolved Debt

### FN-TD-001 — Skills Drift (Resolved 2026-03-19)
- **Resolution:** `flow-install` package created at `tools/flow-install/`. Shared/core skills are now the single source of truth in `tools/flow-install/skills/`. Projects install via `npx flow-install`, which copies skills to `~/.agents/skills/` with version-based upgrade logic. Project-specific skills live in each project's `.agents/skills/` and are registered into `${AGENTS_SKILLS_ROOT}` by the generated lifecycle scripts.

### FN-TD-002 — Memory System Generalization (Resolved 2026-03-19)
- **Resolution:** Memory system scope hierarchy generalized in `flow-install`. Auto-detection algorithm reads `package.json` workspaces and git remote to generate project-specific `_scopes.yaml` during install. AA-specific hardcoded scopes (`org:accelerate-africa`, `app:api`, etc.) replaced with auto-detected values. Phase 4 product scopes (cohort/founder/coach) deferred as per-project extensions — tracked as new item FN-TD-004.

### FN-TD-003 — Installation and Distribution Model (Resolved 2026-03-19)
- **Resolution:** Flow now has a concrete installation model: shared/core skills are sourced from `tools/flow-install/skills/`, project-local skills live in `.agents/skills/`, generated lifecycle scripts are installed to `$HOME/.scripts/`, Jarvis installs with `uv tool install`, and bootstrap is defined in `install.sh`. Accelerate Africa and Awadoc were migrated to the canonical layout. Remaining work is operational publication of the hub repo, not design uncertainty.

### FN-TD-004 — Phase 4 Product Scopes (Added 2026-03-19)
- **ID:** FN-TD-004
- **Status:** open
- **Type:** design
- **Scope:** memory
- **Summary:** Phase 4 product scopes (cohort, founder, coach) are AA-specific. Need a per-project extension mechanism for domain-specific scope types beyond org/project/app/user.
- **Target:** Phase 4+
