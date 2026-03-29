---
name: skill-create
description: Scaffold a new skill in the monorepo with a valid manifest and catalog entry. Use when creating any new skill.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, ApplyPatch, Write
argument-hint: "[skill-name] [type: opencode|OpenClaw|n8n]"
---

# Skill Create — Monorepo Scaffold

## Purpose
Create a new skill in the monorepo with a valid `manifest.yaml` and a catalog entry. Enforce secure defaults and prevent duplicates.

## Inputs
- Skill name (kebab-case)
- Type: `opencode` | `OpenClaw` | `n8n`
- Install scope: `local-repo` | `global`
- Owner
- Blast radius: `low` | `medium` | `high`
- Description
- Permissions (explicit list)
- Data categories (e.g., `pii`, `financial`, `credentials`, `none`)
- Egress allowlist (domains or services)
- Invoke command/trigger
- Phase(s)

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/skill-create/`.

## Steps
1. **Validate naming**
   - Ensure name is lowercase, kebab-case, and ≤ 64 chars.
2. **Choose install scope (required)**
   - Ask the user whether the skill should be installed as:
     - `local-repo` (Recommended for repo-specific automation) -> `.agents/skills/<skill-name>/`
     - `global` (shared Flow skill) -> `tools/flow-install/skills/<skill-name>/`
   - If the user is unsure, recommend `local-repo` unless the skill is intended for cross-repo reuse through Flow installation.
3. **Check for duplicates (required)**
   - Search both `.agents/skills` and `tools/flow-install/skills` for matching skill names.
   - Search `.agents/OpenClaw` and `.agents/n8n` when applicable.
   - Search `.jarvis/context/skills/_catalog.md` for existing entries with the same name or invoke command.
   - If any match is found, STOP and report the conflict.
4. **Create directory**
   - For `local-repo`, create `.agents/<type>/<skill-name>/`.
   - For `global`, create `tools/flow-install/<type>/<skill-name>/`.
5. **Design the intelligence ↔ determinism split**
   - Put orchestration, intent parsing, and decision-making in `SKILL.md`.
   - Put repeatable logic (parsing, transforms, formatting, API calls) into `scripts/` inside the skill folder.
   - If the script should be terminal-callable, name the executable after the final command so installation can expose it through the user-local bin directory (`$XDG_BIN_HOME` or `~/.local/bin`).
   - The skill must describe when to call scripts and what input/output contracts they expect.
6. **Write `manifest.yaml`** using `templates/manifest.yaml`.
   - **Autoresearch is mandatory**: all Flow skills include `autoresearch: enabled: true` by default. Set `time_budget_seconds` based on blast_radius: high=1800, medium=1200, low=600.
7. **Write `SKILL.md`** using `templates/SKILL.md` (fill in purpose, inputs, steps, output).
   - If the skill delegates to command docs, reference them as `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/<file-name>.md`.
   - Do not use fragile references like `./commands/<file-name>.md`.
   - Include this mandatory line in every skill doc: `Template paths are resolved from ${AGENTS_SKILLS_ROOT}/<skill-name>/.`
   - When `templates/...` is used, resolve it from `${AGENTS_SKILLS_ROOT}/<skill-name>/`.
   - For `local-repo`, keep skill runtime scripts under `.agents/skills/<skill-name>/scripts/`.
   - For `global`, keep skill runtime scripts under `tools/flow-install/skills/<skill-name>/scripts/`.
8. **Add catalog entry** in `.jarvis/context/skills/_catalog.md` using `templates/catalog-entry.md`.
9. **Register skills when required**
   - For `local-repo`, run `pnpm skills:register` to install the skill to `${AGENTS_SKILLS_ROOT}`.
   - For `global`, update the shared source of truth and note any install/sync step the user should run afterward.
10. **Return a checklist** for validation and publishing.

## Templates
- `templates/manifest.yaml`
- `templates/SKILL.md`
- `templates/catalog-entry.md`

## Checklist (Return to User)
- [ ] Verify `autoresearch` section is present in `manifest.yaml`
- [ ] Run `/skill-validate <skill-name>`
- [ ] If local-repo: run `pnpm skills:register` (installs to `${AGENTS_SKILLS_ROOT}`)
- [ ] If global: sync the shared skill install path after review
- [ ] Add test evidence for blast radius
- [ ] If high blast radius: get explicit approval before publish

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "skill-create" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

