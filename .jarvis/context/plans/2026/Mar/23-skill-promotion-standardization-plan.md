# pilot-project-a Skill Promotion and Standardization Plan

**Date:** 2026-03-23
**Status:** in-progress (Bucket A extraction complete and validated locally; Bucket B promoted through ci-fix/local-run/github-issue-create, pending commit)
**Owner:** Flow maintainer
**Scope:** Promote and standardize pilot-project-a local skills into Flow shared skills, wrappers, or retained local-only assets
**Source repo:** `/path/to/pilot-project-a`
**Target Flow repo:** `/Users/julian/Documents/Code/Flow Network`
**Downstream validation repo:** `/path/to/pilot-project-b`

### Overall Success Criterion

The effort is complete when:

- All approved skills exist in `tools/flow-install/skills/`, pass validation, and are committed
- At least one downstream project (pilot-project-b) can install Flow and consume the CI/codegen skills with only a delivery profile
- AA's local skill directories point to shared Flow versions (thin wrappers where needed, deletions where not)

---

## Objective

Adopt the useful skill system work from pilot-project-a as a Flow standard so the reusable parts can ship from `tools/flow-install/skills/` and become installable in downstream Flow projects such as pilot-project-b.

This is not a blind copy operation. The goal is to:

- preserve useful AA workflows
- remove hidden AA-specific assumptions
- introduce profile- or adapter-based abstractions where needed
- keep repo-specific wrappers local when a shared Flow core is not enough by itself

---

## Current State

### AA local skill inventory

AA currently has 16 local skills in `.agents/skills/`.

### Already shared in Flow (Bucket A — extraction complete)

These AA-origin skills have been extracted, generalized, and exist in `tools/flow-install/skills/` on the `feat/flow/installable-harness` branch as untracked directories. They are project-agnostic, consume `.flow/delivery-profile.json`, use `${AGENTS_SKILLS_ROOT}` path conventions, and are listed in `flow-install.lock.json` under `flowCoreSkills`.

- `api-integration-codegen`
- `browser-integration-codegen`
- `browser-qa`
- `build-e2e`
- `context-sync`
- `issue-flow`
- `spec-to-regression`
- `tech-spec-review`
- `test-quality-validator`
- `tmux-agent-launcher` (utility skill, not in original AA inventory)

**Status:** Ready to commit. Local validation completed with `pnpm skills:register` and `pnpm harness:verify`.

References:

- `flow-install.lock.json`
- `.jarvis/context/skills/_catalog.md`
- `tools/flow-install/skills/`

### AA-only skills not yet shared in Flow

- `ci-fix`
- `ci-logs`
- `ci-rerun`
- `ci-watch`
- `github-issue-create`
- `local-run`
- `supabase-workflow`

### Constraints discovered during inspection

- AA governance metadata has drift and missing catalog coverage.
- Some skills still encode `my-coach-app`, Supabase, GitHub Project, or monorepo-specific assumptions.
- Some state artifacts and docs leak machine-specific or repo-specific paths.
- pilot-project-b is a strong portability target for backend-oriented and config-driven validation, but a weak target for browser-first flows.

---

## Standardization Principles

1. **Flow shared skills must be project-agnostic.**
2. **Repo-specific behavior moves into profiles, adapters, or thin local wrappers.**
3. **No shared skill may hardcode AA app names, test paths, branches, or service identifiers.**
4. **Downstream adoption should prefer configuration over code edits.**
5. **AA remains the proving ground, not the canonical source of truth, once a skill is shared.**

---

## Skill Buckets

### Bucket A: Extraction complete, pending commit and downstream validation

These 10 skills are already generalized and present in `tools/flow-install/skills/`. The original parity audit is effectively complete — all skills use the delivery profile contract and contain no AA-specific hardcoding.

- `api-integration-codegen`
- `browser-integration-codegen`
- `browser-qa`
- `build-e2e`
- `context-sync`
- `issue-flow`
- `spec-to-regression`
- `tech-spec-review`
- `test-quality-validator`
- `tmux-agent-launcher`

Remaining work: commit, then validate against pilot-project-b to determine whether the delivery profile is sufficient or if adapters are needed (evidence-driven, not speculative).

### Bucket B: Promote into Flow after cleanup

These are the best candidates for net-new Flow shared skills:

- `ci-fix` (promoted, pending commit)
- `ci-logs` (promoted, pending commit)
- `ci-rerun` (promoted, pending commit)
- `ci-watch` (promoted, pending commit)
- `github-issue-create` (promoted, pending commit)
- `local-run` (promoted, pending commit)

### Bucket C: Keep local to AA

- `supabase-workflow`

Reason:

- too tightly coupled to AA's Supabase environment, migration workflow, and service assumptions
- acceptable to revisit later as a stack-specific family if Flow chooses to support provider-specific shared skills

---

## Required Abstractions

The following abstractions must exist before promotion is considered complete.

### 1. Delivery profile

Use `.flow/delivery-profile.json` as the canonical abstraction layer for:

- spec root
- regression artifact paths
- browser/API helper imports
- suite destinations
- validator rules
- workflow branch conventions

Reference:

- `.jarvis/context/docs/flow-delivery-profile-standard.md`

### 2. Regression artifact contract

Shared codegen and validation skills must consume regression artifacts through the documented browser/API/coverage matrix contract, not AA-specific filenames.

Reference:

- `.jarvis/context/docs/flow-regression-artifact-standard.md`

### 3. Validation contract

Every promotion wave must satisfy static portability, contract compliance, source-repo behavior, downstream behavior, artifact correctness, and regression safety.

Reference:

- `.jarvis/context/docs/flow-delivery-verification-standard.md`

### 4. Repo adapters (contingent — only if pilot-project-b validation proves the delivery profile insufficient)

The delivery profile already handles most project-specific configuration through its `browser.supportImports`, `api.supportImports`, `api.fixtureSeedRules`, and `browser.dbHelperRules` fields. A separate "adapter" abstraction layer should NOT be introduced speculatively.

If downstream validation (pilot-project-b) reveals cases where the delivery profile cannot express a needed configuration, then and only then introduce a targeted adapter mechanism. Document what the profile couldn't handle and why.

If adapters are needed, they belong to the consuming repo, not the Flow shared skill. Examples of possible adapter types:

- app/server test harness adapter
- helper import adapter
- fixture mapping adapter
- DOM inspection path adapter

---

## Execution Plan

### Phase 1: Commit the Done Work (Bucket A)

Goal: secure the 10 already-generalized skills that are sitting as untracked files.

Tasks:

1. Quick review of each Bucket A skill for any remaining AA-specific strings.
2. Run `pnpm skills:validate && pnpm skills:register && pnpm harness:verify`.
3. Commit all 10 skills + updated catalog + lock file.
4. Verify Claude Code and OpenCode registration is clean after commit.

Files:

- `tools/flow-install/skills/{api-integration-codegen,browser-integration-codegen,browser-qa,context-sync,issue-flow,spec-to-regression,test-quality-validator,tmux-agent-launcher}/`
- `tools/flow-install/skills/test-quality-validator/scripts/validate-correctness.ts`
- `.jarvis/context/skills/_catalog.md`
- `flow-install.lock.json`

Done when:

- all 10 skills committed
- validation passes
- no untracked skill directories remain

### Phase 2: Validate Bucket A Against pilot-project-b

Goal: get real downstream signal before promoting more skills or designing adapters.

Tasks:

1. Install Flow into pilot-project-b (`node tools/flow-install/index.mjs --yes --target /path/to/pilot-project-b`).
2. Create a minimal `.flow/delivery-profile.json` for pilot-project-b using the template at `.jarvis/context/templates/flow-delivery-profile.json`.
3. Classify each Bucket A skill against pilot-project-b:
   - works as-is
   - works with profile only
   - not suitable for this repo type (expected for browser-first skills)
4. Document findings — these determine whether adapters are ever needed.

Done when:

- each Bucket A skill has a portability classification anchored in pilot-project-b evidence

### Phase 3: Promote the Net-New Generic Skills (Bucket B)

Goal: move the 6 AA-only skills into Flow shared skills.

Priority order (simplest first):

1. `ci-logs` — promoted, pending commit
2. `ci-rerun` — promoted, pending commit
3. `ci-watch` — promoted, pending commit
4. `ci-fix` — promoted, pending commit
5. `local-run` — promoted, pending commit
6. `github-issue-create` — promoted, pending commit

Per-skill process:

1. Copy from AA `.agents/skills/<name>/` into Flow `tools/flow-install/skills/<name>/`.
2. Remove AA branding, repo-specific nouns, hardcoded owners/boards.
3. Use delivery profile fields where configuration is needed.
4. Explicitly scope or disclaim CI provider assumptions (GitHub Actions).
5. Add manifest.yaml, catalog entry, command doc.
6. Run `pnpm skills:validate && pnpm skills:register && pnpm harness:verify`.
7. Commit.

CI provider note: Bucket B skills (ci-logs, ci-rerun, ci-watch, ci-fix) currently assume GitHub Actions. This is acceptable for the initial promotion. If CI provider portability becomes a requirement, it should be addressed as a separate follow-up with a CI provider abstraction layer — not as a blocker for this wave.

Done when:

- all 6 skills exist in Flow, pass validation, and are committed

### Phase 4: Downstream Validation of Bucket B

Goal: prove the CI/workflow skills work outside AA.

Tasks:

1. Reinstall Flow into pilot-project-b to pick up Bucket B skills.
2. Test `ci-logs`, `ci-rerun`, `ci-watch` against pilot-project-b's CI (if applicable).
3. Test `local-run` against pilot-project-b's dev server setup.
4. Document portability notes.

Adapter decision point: if any skill fails purely because the delivery profile cannot express a needed configuration, then and only then introduce a targeted adapter mechanism. Document what the profile couldn't handle and why.

Done when:

- Bucket B skills have downstream portability notes

### Phase 5: Adopt the Flow Shared Versions Back into AA

Goal: stop AA from remaining a parallel source of truth.

Sequencing: AA must install updated Flow to get the shared skills before it can delete local copies.

Tasks:

1. Update AA to latest Flow (`flow-install` re-run).
2. For each skill where Flow is canonical: verify the shared Flow version passes AA's own validation, then delete AA's local full implementation.
3. For skills needing local context: create thin AA wrappers that reference the shared skill.
4. Update AA catalog to reflect shared ownership.
5. Run AA's `pnpm skills:validate && pnpm skills:register && pnpm harness:verify`.

Rollback safety: before deleting any AA local skill, verify the shared Flow version passes AA's own validation. If it does not, keep the local version and file an issue against the shared skill.

Done when:

- AA uses shared Flow skills for everything in Buckets A and B
- only `supabase-workflow` and thin wrappers remain local

### Phase 6: Harden the Regression Artifact Standard

Goal: close the weakest standards gap before the next promotion wave.

The current Regression Artifact Standard (`flow-regression-artifact-standard.md`) describes what fields regression specs "must support" but does not define a file format, schema, or validation mechanism. This makes compliance a convention, not something enforceable.

Tasks:

1. Add concrete format examples (markdown structure with field headers) to `flow-regression-artifact-standard.md`.
2. Add a sample browser regression spec and API regression spec to `.jarvis/context/templates/`.
3. Optionally: add a validation script that checks regression artifacts against the schema.

Done when:

- a new contributor could create a compliant regression artifact from the standard alone, without looking at existing examples in AA

---

## Per-Skill Standardization Outcomes

| Skill | Bucket | Status | Outcome |
|---|---|---|---|
| `build-e2e` | A | Extracted | Flow canonical, ready to commit |
| `tech-spec-review` | A | Extracted | Flow canonical, ready to commit |
| `browser-qa` | A | Extracted | Flow canonical, ready to commit |
| `context-sync` | A | Extracted | Flow canonical, wrapper need TBD by pilot-project-b evidence |
| `issue-flow` | A | Extracted | Flow canonical, wrapper need TBD by pilot-project-b evidence |
| `spec-to-regression` | A | Extracted | Flow canonical, adapter need TBD by pilot-project-b evidence |
| `api-integration-codegen` | A | Extracted | Flow canonical, adapter need TBD by pilot-project-b evidence |
| `browser-integration-codegen` | A | Extracted | Flow canonical, adapter need TBD by pilot-project-b evidence |
| `test-quality-validator` | A | Extracted | Flow canonical, one cosmetic fix needed (`supabase-guard` string) |
| `tmux-agent-launcher` | A | Extracted | Flow canonical, ready to commit |
| `ci-logs` | B | Promoted, pending commit | New shared skill |
| `ci-rerun` | B | Promoted, pending commit | New shared skill |
| `ci-watch` | B | Promoted, pending commit | New shared skill |
| `ci-fix` | B | Promoted, pending commit | New shared skill with explicit GitHub Actions scope |
| `local-run` | B | Promoted, pending commit | New shared skill with reusable templates and verification-first guidance |
| `github-issue-create` | B | Promoted, pending commit | New shared skill with optional project-board placement |
| `supabase-workflow` | C | In AA | Keep local to AA |

---

## Verification Requirements

At minimum, each promotion wave must end with:

- `pnpm skills:validate`
- `pnpm skills:register`
- `pnpm harness:verify`

And for promotion correctness:

- source repo behavior verified in AA
- downstream portability assessed in pilot-project-b
- no hidden AA-specific assumptions left in Flow shared skills

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AA assumptions leak into Flow shared skills | HIGH | Enforce profile/adapter review before promotion |
| Flow shared skills diverge from useful AA wrappers | MEDIUM | Split-core-wrapper pattern instead of full duplication |
| pilot-project-b cannot consume promoted skills | HIGH | Use downstream validation as a hard gate, not a post-hoc note |
| GitHub/Supabase/provider-specific automation becomes too opinionated | MEDIUM | Keep provider-specific or board-specific assumptions optional or local |
| AA remains a parallel source of truth after promotion | MEDIUM | Adopt shared versions back into AA and prune duplicate local implementations |
| Untracked skills rot in the working tree | HIGH | Commit Bucket A skills immediately in Phase 1 — they are at risk of accidental loss |
| Bucket B skills assume GitHub Actions with no CI provider abstraction | MEDIUM | Explicitly scope as GitHub Actions for now; defer CI provider portability to a follow-up |
| Single-maintainer bottleneck slows execution | MEDIUM | Keep phases small and independently shippable; avoid gating everything on one reviewer |
| Regression Artifact Standard is too vague to validate against | MEDIUM | Harden the standard with format examples and sample artifacts (Phase 6) |
| No rollback plan if a promoted skill breaks AA after local deletion | HIGH | Verify shared version passes AA validation before deleting any local skill; keep local version as fallback |
| pilot-project-b lacks `.flow/delivery-profile.json` and is not ready as a validation target | MEDIUM | Budget time to create a minimal pilot-project-b profile in Phase 2 using the existing template |

---

## Deliverables

1. Committed Bucket A skills (10 skills) with clean validation and registration.
2. pilot-project-b portability classification for each Bucket A skill, anchored in evidence.
3. Promoted Bucket B skills (6 skills) in `tools/flow-install/skills/`, committed and validated.
4. pilot-project-b portability notes for each Bucket B skill.
5. AA cleanup: shared versions adopted, local duplicates deleted, thin wrappers where needed.
6. Hardened Regression Artifact Standard with format examples and sample artifacts.
7. Adapter mechanism documented and implemented only if pilot-project-b evidence requires it (may be empty deliverable).

---

## Decision For This Execution Wave

Proceed with full standardization intent:

- standardize everything useful from AA
- abstract where necessary
- keep local-only only when the behavior is fundamentally project- or provider-specific
- use Flow as the canonical distribution layer
- use AA as the proving ground and pilot-project-b as the portability check
- commit Bucket A immediately — do not let extracted work sit as untracked files
- validate downstream before designing adapters — evidence over speculation
- keep phases independently shippable — each phase produces a commit or documented finding
