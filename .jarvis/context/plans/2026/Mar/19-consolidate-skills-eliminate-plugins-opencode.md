# Plan: Consolidate Skills to `tools/flow-install/skills/` + Eliminate `plugins/opencode/`

**Date:** 2026-03-19
**Status:** Executed locally on 2026-03-19
**Resolves:** FN-TD-001 (skills drift), plugins/opencode elimination
**Depends on:** flow-install v1.0.0 (completed same day)

---

## Target State

| Concern | Location | Owned By |
|---------|----------|----------|
| **Shared/core skills** (source of truth) | `Flow Network/tools/flow-install/skills/` | flow-install |
| **Shared skills** (installed runtime) | `~/.agents/skills/` | flow-install (auto-managed) |
| **Project-specific skills** | `.agents/skills/` in each project repo | Each project |
| **Lifecycle scripts** | `~/.scripts/` | flow-install (auto-managed) |
| **`plugins/opencode/`** | Deleted everywhere | N/A |

---

## Change Inventory

### 1. Flow Network (source of truth)

**Delete:**
- `plugins/opencode/` (entire directory — 18 skills, all duplicated in `tools/flow-install/skills/`)
- `plugins/` directory itself if empty after deletion

**Update `tools/flow-install/skills/*/manifest.yaml`** (18 files):
- Change `location: plugins/opencode/<name>` to `location: tools/flow-install/skills/<name>`

**Update `tools/flow-install/lib/scripts.mjs`**:
- The `generateRegisterSkills()` function generates a script that scans `plugins/opencode/`. Change it to scan `.agents/skills/` (project-local) instead.
- The `generateValidateSkills()` function scans `plugins/opencode/`. Change to scan `.agents/skills/`.

**Update `tools/flow-install/lib/agents-md.mjs`**:
- Line 35: Change `- Project skills: \`plugins/opencode/\` (if present)` to `- Project skills: \`.agents/skills/\` (if present)`

**Update `scripts/setup-local.mjs`**:
- Lines 170-175: Change `plugins/opencode` reference to `tools/flow-install/skills`

**Update `.jarvis/context/skills/_catalog.md`** (19 entries):
- Change all `location: plugins/opencode/<name>` to `location: tools/flow-install/skills/<name>`

**Update `Jarvis/AGENTS.md`**:
- Line 22: Change `plugins/opencode/jarvis/commands/jarvis.md` to reference installed path `${AGENTS_SKILLS_ROOT}/jarvis/commands/jarvis.md`

**Update AGENTS.md** (root):
- Any remaining references to `plugins/opencode/` in the Skill Usage Protocol section

**Update `tools/flow-install/skills/skill-create/SKILL.md`**:
- Lines 32, 47: Change `plugins/opencode` references to `.agents/skills/`

**Update `tools/flow-install/skills/skill-create/templates/SKILL.md`**:
- Line 25: Change `plugins/opencode/<skill-name>/scripts/` to `.agents/skills/<skill-name>/scripts/`

**Update `tools/flow-install/skills/skill-validate/SKILL.md`**:
- Line 20: Change `plugins/opencode` reference to `.agents/skills/`

**Update `.jarvis/context/technical-debt.md`**:
- FN-TD-001 resolution text: change `plugins/opencode/` to `.agents/skills/`

**Low-priority documentation** (plans, roadmaps — historical, update if touched):
- `.jarvis/context/plans/2026/Mar/17-*.md` — 3 files with references
- Historical records; update references but won't break anything

### 2. pilot-project-a

**Move project-specific skills to `.agents/skills/`**:
- AA has 27 skills in `plugins/opencode/`. 18 are shared (already in flow-install). 10 are AA-specific:
  - `browser-integration-codegen`, `browser-qa`, `ci-fix`, `ci-logs`, `ci-rerun`, `ci-watch`, `context-sync`, `github-issue-create`, `local-run`, `supabase-workflow`

**Steps:**
- Create `.agents/skills/` directory in AA project root
- Move the 10 AA-specific skills from `plugins/opencode/` to `.agents/skills/`
- Delete `plugins/opencode/` (the 18 shared skills are now managed by flow-install globally)
- Delete `plugins/` if empty
- Update all 10 AA-specific manifest.yaml `location:` fields
- Update `.jarvis/context/skills/_catalog.md` — all 27 entries need location updates
- Re-run `npx flow-install --yes` to update AGENTS.md section and regenerate `~/.scripts/`

**Update AGENTS.md**:
- Change `plugins/opencode/` references to `.agents/skills/`

**Delete superseded local scripts:**
- `scripts/register-opencode-skills.mjs` (replaced by `~/.scripts/register-skills.mjs`)

### 3. pilot-project-b

**Already has `.agents/skills/`** with 23 vendored skills:
- Update all 23 manifest.yaml `location:` fields from `plugins/opencode/<name>` to `.agents/skills/<name>`
- Update AGENTS.md reference
- Re-run `npx flow-install --yes`

### 4. Global locations (`~/.agents/skills/`, `~/.scripts/`)

**Auto-fixed by re-running flow-install:**
- `~/.scripts/register-skills.mjs` — regenerated from updated code
- `~/.scripts/validate-skills.mjs` — regenerated
- `~/.agents/skills/*/manifest.yaml` — re-copied with updated location fields
- `~/.agents/skills/skill-create/SKILL.md`, templates, `skill-validate/SKILL.md` — re-copied

### 5. Jarvis migration (bundled)

- Migrate `Jarvis/context/` to `Jarvis/.jarvis/context/` (15 files)
- Run flow-install on Jarvis
- Package.json warning for Python projects is acceptable

---

## Execution Order

1. **Update flow-install source** (tools/flow-install/):
   - `lib/scripts.mjs` — change generated scripts to scan `.agents/skills/`
   - `lib/agents-md.mjs` — change template
   - `skills/*/manifest.yaml` — update all 18 location fields
   - `skills/skill-create/SKILL.md` + `templates/SKILL.md` — update path references
   - `skills/skill-validate/SKILL.md` — update path references

2. **Update Flow Network repo**:
   - Delete `plugins/opencode/`
   - Update `scripts/setup-local.mjs`
   - Update `.jarvis/context/skills/_catalog.md`
   - Update `.jarvis/context/technical-debt.md`
   - Update `AGENTS.md` (root)
   - Update `Jarvis/AGENTS.md`

3. **Migrate Jarvis context**:
   - Move `Jarvis/context/*` to `Jarvis/.jarvis/context/`
   - Remove `Jarvis/context/`

4. **Run flow-install on all projects** (propagates all changes to global locations):
   - `cd "Flow Network" && node tools/flow-install/index.mjs --yes`
   - `cd Jarvis && node ../tools/flow-install/index.mjs --yes`
   - `cd "pilot-project-a" && node "path/to/flow-install/index.mjs" --yes`
   - `cd pilot-project-b/pilot-project-b && node "path/to/flow-install/index.mjs" --yes`

5. **Migrate AA project-specific skills**:
   - Move 10 AA-specific skills from `plugins/opencode/` to `.agents/skills/`
   - Delete AA's `plugins/opencode/`
   - Update AA's `_catalog.md`
   - Update AA's AGENTS.md
   - Delete AA's local `scripts/register-opencode-skills.mjs`

6. **Update pilot-project-b manifests**:
   - Update 23 manifest.yaml location fields in `.agents/skills/`
   - Update AGENTS.md

7. **Verify**:
   - Re-run flow-install on all 3 with `--dry-run` — should show all SKIP
   - Verify `pnpm skills:register` works in AA (reads from `.agents/skills/` now)

---

## Risks

| Risk | Mitigation |
|------|------------|
| AA's local `scripts/register-opencode-skills.mjs` still scans `plugins/opencode/` | Replaced by `~/.scripts/register-skills.mjs` which scans `.agents/skills/`. AA package.json already patched to use `~/.scripts/`. |
| Agents reference `plugins/opencode/` from cached context | flow-install re-merges AGENTS.md with updated instructions. Agents will pick up new path on next session. |
| `skill-create` template generates manifests with old location | Template updated in step 1. |
| Breaking existing workflows that assume plugins/opencode | The register/validate scripts are the only code paths. Both are updated. |

## Total File Changes

| Category | Count |
|----------|-------|
| flow-install source files | 5 files |
| flow-install skill manifests | 18 files |
| flow-install skill docs | 4 files |
| Flow Network deletions | ~18 directories (plugins/opencode/) |
| Flow Network config/docs | ~6 files |
| Jarvis migration | 15 files moved + 1 dir deleted |
| AA skill moves | 10 directories |
| AA deletions | ~18 directories (shared skills from plugins/opencode/) |
| AA config/docs | ~4 files |
| pilot-project-b manifests | 23 files |
| Global (auto-regenerated) | ~30 files via flow-install re-run |
