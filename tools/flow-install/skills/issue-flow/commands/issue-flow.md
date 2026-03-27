---
description: GitHub issue orchestration across specs, implementation, regression, QA, and acceptance
argument-hint: "[continue|status|issue <number-or-url>]"
---

# Issue Flow Orchestrator

## Mission

Take exactly one GitHub issue, optionally enriched by GitHub Project metadata, and drive it through the full delivery lifecycle with enforced quality gates, explicit human review gates, and fresh verification evidence.

Core rule: do not optimize for "code changed". Optimize for "Definition of Done proven with evidence."

## User Input

$ARGUMENTS

## Spec Root Resolution

Resolve the spec root in this order:

1. `BUILD_E2E_SPEC_ROOT` if set
2. `./.jarvis/context/specs` if it exists
3. `./specs` if it exists
4. fallback default: `./specs`

Use `${AGENTS_SKILLS_ROOT}/build-e2e/scripts/resolve-spec-root.sh` when shell resolution is needed.

Treat every epic path in this workflow as `${SPEC_ROOT}/<epic>/...`.

## Context

- Current directory: !`pwd`
- Git branch: !`git branch --show-current 2>/dev/null || echo "N/A"`
- Spec root: !`bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh" 2>/dev/null || printf '%s\n' specs`

## Canonical Worktree Strategy

Issue-flow uses a standardized sibling worktree root outside the project folder:

```text
../<project-folder-name>-worktrees/<issue_id>_<friendly_name>
```

Examples:

- repo root: `/code/Accelerate Africa`
- worktree root: `/code/Accelerate Africa-worktrees`
- issue worktree: `/code/Accelerate Africa-worktrees/113_program-team-selection`
- if invoked from `/code/Accelerate Africa-worktrees/112_program-team-sourcing`, the canonical worktree root still remains `/code/Accelerate Africa-worktrees`

Derive this path at runtime using `${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_git.py`.

The canonical worktree root is always derived from the canonical repository root, never from the current worktree checkout directory. If `issue-flow` is invoked from an existing worktree, it must still target the sibling root based on the parent repository name rather than appending `-worktrees` to the current issue folder name.

Rules:

- Never store machine-specific absolute worktree paths in `.issue-flow-state.json`.
- Store only portable git metadata (`branch`, `worktree_dirname`, strategy).
- New issue-flow runs must create or reuse the canonical sibling worktree immediately.
- Legacy runs without git metadata remain supported; migrate them lazily when the issue next enters active execution.

## Worktree Scope Enforcement

Once an issue worktree is created, ALL file operations for that issue — spec generation, artifact writes, implementation, test generation, commits, pushes — MUST happen from inside the worktree directory. Writing files to the main checkout or any other worktree is a hard error.

### Enforcement rules

1. Before invoking any child skill that produces files (`prd`, `design-spec`, `tech-spec`, `engineer`, `spec-to-regression`, `api-integration-codegen`, `browser-integration-codegen`, `test-quality-validator`, `qa`, `code-review`), run the worktree assertion:
   ```bash
   python3 "${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_git.py" assert-cwd \
       --branch "<git.branch from state>"
   ```
   If exit code is non-zero, HARD STOP. Report the expected worktree path and current directory to the user.

2. Never write spec artifacts, implementation code, tests, or review outputs to the main checkout.

3. Never copy files from the main checkout to the worktree after the fact — this masks the root cause. Re-run the phase from the correct directory.

4. The spec root (`${SPEC_ROOT}`) must be resolved relative to the worktree checkout, not the main repository.

5. If the agent's working directory drifts (e.g., after a tool invocation resets cwd), re-derive the worktree path from state and cd back before continuing.

## State File Location

Each issue-flow epic has its own resumable checkpoint file:

```
${SPEC_ROOT}/<epic>/.issue-flow-state.json
```

Use `${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_state.py` to initialize, merge, and inspect state.

The state file is a checkpoint, not the only source of truth.

Precedence for recovery and reconciliation:

1. GitHub issue / optional GitHub Project item / PR / CI status
2. Local delivery artifacts under `${SPEC_ROOT}/<epic>/`
3. Git branch and worktree state
4. `.issue-flow-state.json`

If these disagree, do not silently advance phases. Reconcile and either auto-update the state file, ask the user, or block.

## State Contract

The state file must track at minimum:

- `version`
- `updated_at`
- `issue.number`, `issue.url`, `issue.title`
- `epic.name`, `epic.path`, `epic.spec_root`
- `phase.id`, `phase.name`, `phase.status`, `phase.started_at`, `phase.updated_at`
- `mode` (`execution-ready` or `discovery-recovery`)
- `git.branch`, `git.base_branch`, `git.worktree_strategy`, `git.worktree_dirname`
- `github.issue_state`, `github.project_status`, `github.project_title`, `github.pr_url`, `github.ci_url`, `github.last_sync_at`
- `gates.quality.*`
- `gates.human.*`
- `artifacts.*` for issue intake, brainstorm, PRD, reviews, tech spec, regression, tests, QA, and verification outputs
- `reconciliation.last_checked_at`, `reconciliation.status`, `reconciliation.discrepancies`, `reconciliation.resolution_notes`
- `blockers`
- `next_action`
- `history[]` as an append-only transition log

## Command Router

### `issue <number-or-url>`

1. Load the GitHub issue.
2. Resolve or create the epic folder under `${SPEC_ROOT}`.
3. Derive the canonical issue branch name as `<issue_id>_<friendly_name>`. Use the epic slug unless a repo-specific branch convention overrides it.
4. Create or reuse the canonical sibling worktree for that branch using `${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_git.py create ...`.
5. Create or update `${SPEC_ROOT}/<epic>/.issue-flow-state.json` from inside that worktree.
6. Seed issue metadata, epic metadata, portable git metadata, current phase, mode, and initial next action.

### `continue`

1. Resolve the target epic by one of the following:
   - explicit issue argument if provided
   - existing `.issue-flow-state.json` that matches the active issue
   - most recently modified `.issue-flow-state.json`
2. Resolve the canonical sibling worktree root and search there first for matching `.issue-flow-state.json` files.
3. Read the state file.
4. Reconcile state against GitHub, local artifacts, and git worktree.
5. Update non-controversial fields in `.issue-flow-state.json`.
6. Resume from the highest fully-complete phase whose required gates are passed, running inside the resolved issue worktree.

### `status`

1. Resolve the target epic using the same rules as `continue`.
2. Read `${SPEC_ROOT}/<epic>/.issue-flow-state.json`.
3. Reconcile against GitHub, local artifacts, and canonical worktree state.
4. Report current phase, mode, gate status, blockers, artifacts, next action, branch name, worktree strategy, and the runtime-derived canonical worktree path.

## Reconciliation Rules

On `issue`, `continue`, and `status`, perform a project-state investigation:

1. Verify the epic folder exists.
2. Verify the state file exists, or initialize it if this is a new run.
3. Compare state metadata with the actual GitHub issue and optional project item.
4. Compare state artifact paths with files actually present under `${SPEC_ROOT}/<epic>/`.
5. Compare stored portable git metadata with the derived canonical branch/worktree model.
6. Compare recorded PR / CI links with actual GitHub state when available.
7. Compare implementation-related progress with the current git branch/worktree.

Canonical worktree reconciliation rules:

- Derive the canonical worktree root from the current repository using `${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_git.py info`.
- If `git.branch` exists in state, derive the canonical worktree path from `git.worktree_dirname` or `git.branch`.
- If a matching branch is attached in `git worktree list --porcelain`, treat that attachment as authoritative runtime location.
- If the canonical worktree directory is missing but the branch exists, recreate the worktree at the canonical location.
- If state has no `git.*` block, treat it as a legacy run and derive the portable branch metadata from the epic name before implementation begins.
- Never write runtime absolute paths back into tracked state.

If state is behind actual progress:

- auto-update the state file for metadata, artifact pointers, timestamps, and non-controversial gate fields
- append a `history` event describing the reconciliation

If state is ahead of actual progress or evidence conflicts:

- record the discrepancy in `reconciliation.discrepancies`
- do not advance the phase automatically
- ask the user if the resolution changes delivery intent

If there is no safe reconciliation path:

- hard stop

## Primary Objective

Deliver quality against the issue's acceptance criteria and approved specs.

## Mandatory Child Skills

- `build-e2e`
- `brainstorm`
- `prd`
- `prd-spec-review`
- `design-spec`
- `design-spec-review`
- `tech-spec`
- `tech-spec-review`
- `engineer`
- `spec-to-regression`
- `api-integration-codegen`
- `browser-integration-codegen`
- `test-quality-validator`
- `qa`
- `code-review`
- `verification-before-completion`

## Lifecycle

Phase 0 — Intake, readiness check, and clarification recovery
Phase 1 — Brainstorm
Phase 2 — PRD
Phase 3 — PRD review
Phase 4 — Design specification
Phase 5 — Design review
Phase 6 — Tech spec
Phase 7 — Tech spec review
Phase 8 — Execution scope confirmation
Phase 9 — Implementation
Phase 10 — Regression scenario generation
Phase 11 — Test code generation
Phase 12 — Test quality validation
Phase 13 — QA execution
Phase 14 — Simplicity and architecture review
Phase 15 — PR creation and CI resolution
Phase 16 — Final verification and acceptance
Phase 17 — Closeout and GitHub sync

## Phase Transition Validation

Before advancing to any new phase, the orchestrator MUST validate the transition:

### Validation Command

```bash
python3 "${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_validate_transition.py" check \
    --state-path "${SPEC_ROOT}/<epic>/.issue-flow-state.json" \
    --target-phase <N>
```

If the command exits non-zero, the transition is BLOCKED. Read the JSON output for the specific blocking reasons and resolve them before retrying.

### Transition Table

| From | To | Quality Gates Required | Human Gates Required | Artifact Commits Required | Pause Before Advance |
|------|-----|----------------------|---------------------|--------------------------|---------------------|
| 0 | 1 | issue_readiness_check | — | — | No |
| 1 | 2 | brainstorm_discovery_gate | brainstorm_approval | — | No |
| 2 | 3 | — | — | — | No |
| **3** | **4** | **spec_gate** | **prd_approval** | **product_spec** | **YES — "start design spec"** |
| 4 | 5 | — | — | — | No |
| **5** | **6** | **design_completeness_gate** | **design_approval** | **design_spec** | **YES — "start tech spec"** |
| 6 | 7 | — | — | — | No |
| **7** | **8** | **design_simplicity_gate** | **tech_spec_approval** | **technical_spec** | **YES — "start implementation"** |
| 8 | 9 | — | execution_scope_approval | — | No |
| 9 | 10 | — | — | — | No |
| 10 | 11 | regression_coverage_gate | — | regression_spec | No |
| 11 | 12 | generated_test_gate | — | — | No |
| 12 | 13 | test_quality_gate | — | — | No |
| 13 | 14 | qa_execution_gate | — | — | No |
| 14 | 15 | implementation_simplicity_gate | — | — | No |
| 15 | 16 | — | — | — | No |
| **16** | **17** | **final_verification_gate** | **final_acceptance** | — | **YES — "close out"** |

### Pause Protocol

When a transition rule has `pause_after=true`:

1. Complete all gate and artifact requirements for the current phase.
2. Set phase status to `paused_awaiting_instruction`:
   ```bash
   python3 "${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_state.py" pause \
       --state-path <path> \
       --next-action "Await explicit user instruction to start tech spec"
   ```
3. Report the pause to the user with the exact trigger needed.
4. DO NOT advance until the user explicitly provides the trigger instruction.

### Hard Invariants

1. Never advance phase while required human gates are pending.
2. Never start tech-spec while `prd_approval != passed`.
3. Never start tech-spec before PRD artifact commit-and-link is complete.
4. Never auto-start any phase marked with `pause_after` — always wait for explicit user instruction.
5. After artifact commit-and-link at a pause point, set `next_action` to describe what the user must say.
6. Before any phase that creates, modifies, or commits files (Phases 2–15), verify the current working directory is inside the resolved issue worktree by running `issue_flow_git.py assert-cwd --branch <git.branch>`. If this check fails, HARD STOP. Do not write any files. Report the mismatch to the user and cd into the correct worktree before retrying. Never copy files from the main checkout to the worktree as a workaround — re-run the phase from the correct directory.

## Phase Rules

### Phase 0 — Intake, readiness check, and clarification recovery
- **Dependency check**: Run the shared dependency validator before proceeding:
  ```bash
  bash "${AGENTS_SKILLS_ROOT}/_shared/check-dependencies.sh" \
      --manifest "${AGENTS_SKILLS_ROOT}/issue-flow/manifest.yaml"
  ```
  If any required dependency is missing, report the missing tools and their install commands to the user. Ask permission before installing. If the user declines `gh` installation, warn that GitHub operations will be unavailable and set `github.gh_available` to `false` in the state file. If `gh` is present but not authenticated (`auth_ok: false` in output), instruct the user to run `! gh auth login`.
- Load the GitHub issue and any available project metadata.
- Detect whether a standard strategy folder exists for the repo. Prefer `.jarvis/context/docs/strategy/`; if that is unavailable, check `docs/strategy/`.
- When a strategy folder exists, read `docs/strategy/README.md` first and then the most relevant linked strategy docs before finalizing intake classification.
- Extract problem, goal, scope, non-goals, acceptance criteria, dependencies, blockers, labels, assignee, and project status.
- Record strategy evidence in `issue_intake.md` using these sections when a strategy folder exists:
  - `Strategy Sources Consulted`
  - `Strategic Context`
  - `Strategic Alignment Hypothesis`
  - `Strategy Gaps / Questions`
- If no strategy folder exists, explicitly record that strategy context was unavailable rather than silently skipping it.
- Classify the issue as either `execution-ready` or `discovery-recovery`.
- If acceptance criteria are missing or not testable, do not fail immediately. Enter `discovery-recovery` mode and route into the mandatory brainstorm clarification path.
- If the issue materially changes product direction, workflow design, prioritization, or business-facing behavior, do not finalize `execution-ready` classification until strategy context has been checked or explicitly marked unavailable.
- In `discovery-recovery` mode, use brainstorm outputs to derive problem statement, target audience, scope, non-goals, success criteria, and draft testable acceptance criteria.
- After the user approves the synthesized clarification, append the approved update to the existing GitHub issue. Never overwrite existing issue content.
- Refuse execution only if the issue cannot be made testable after bounded clarification attempts or required approval is withheld.
- Locate or create the epic path under `${SPEC_ROOT}`.
- Create or reuse the canonical sibling worktree for the issue branch immediately and continue the issue-flow cycle from there.
- Reconcile local state and GitHub state before proceeding.
- Initialize or update `.issue-flow-state.json` with issue metadata, epic metadata, portable git metadata, mode, phase, gate defaults, and artifact pointers.
- Append a `history` event whenever the issue classification or epic association changes.

### Phase 1 — Brainstorm
- Invoke `brainstorm`.
- Treat brainstorming as a two-step phase:
  1. interactive discovery with the user
  2. artifact generation after discovery alignment
- The interactive discovery step is mandatory unless the user explicitly says there are no further clarifications needed.
- During discovery, ask one clarifying question at a time and capture answer evidence.
- Resolve at minimum the problem framing, target decision/user, intended scope, success criteria, strategy alignment, and key exclusions/constraints.
- Produce both `brainstorm.md` and transcript evidence (`brainstorm_transcript.md` or `brainstorm_notes.md`).
- When a strategy folder exists, the brainstorm artifact must capture the strategy sources consulted, the relevant strategic fit, and any strategy-derived non-goals or open questions.
- When the issue entered `discovery-recovery` mode, use these artifacts to synthesize a proposed issue clarification update that includes draft testable acceptance criteria.
- The proposed issue clarification update must be append-only and must preserve the original issue text.
- Do not mark Phase 1 complete if the artifact was drafted from repo context alone without the required user clarification loop.
- Stop for human approval before PRD starts.
- Update `.issue-flow-state.json` with brainstorm artifact paths, brainstorm gate result, pending human approval state, and next action.
- When the user approves the append-only issue update and the issue is edited successfully, mark `gates.human.issue_append_approval` and `gates.quality.issue_clarification_recovery_gate` accordingly and append a `history` event.

### Phase 2 — PRD
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `prd`.
- Produce `product_spec.md` with explicit, testable acceptance criteria.
- Carry forward the strategy-derived goals, non-goals, and workflow constraints from intake and brainstorm instead of rediscovering them ad hoc.
- Update the state file with the PRD artifact path and phase progress.

### Phase 3 — PRD review
- Invoke `prd-spec-review`.
- Resolve all blocking review issues.
- Human approval should confirm both delivery clarity and strategic fit for product- or workflow-shaping issues.
- Stop for human approval before design spec starts.
- After the user approves `prd_approval`, execute the **Artifact Commit-and-Link** procedure for `product_spec.md` (artifact_key=`product_spec`, artifact_label="Product Spec (PRD)").
- After artifact commit-and-link completes, run the **Pause Protocol**: set `phase.status` to `paused_awaiting_instruction` with `next_action` = "Await explicit user instruction to start design spec." Report the pause and stop. Do NOT proceed to Phase 4 until the user explicitly says to start design spec.
- Update the state file with PRD review artifacts, `spec_gate` status, human approval status, artifact commit-and-link results, `github.pr_url`, and `next_action`.

### Phase 4 — Design specification
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `design-spec`.
- Read `product_spec.md` as primary input. Carry forward personas, user flows, and UI requirements from the PRD.
- Produce `design_spec.md` with Mermaid user flow diagrams, screen inventory, component specifications, interaction patterns, accessibility requirements, responsive behavior, and placeholder sections for Figma/screenshot links.
- Update the state file with the design spec artifact path and phase progress.

### Phase 5 — Design review
- Invoke `design-spec-review`.
- Review through 5 expert lenses: UX researcher, interaction designer, accessibility expert, visual/brand designer, frontend engineer.
- Block advancement if critical user flows are missing, accessibility requirements are incomplete, or component specs are not implementable.
- Stop for human approval before tech spec starts.
- After the user approves `design_approval`, execute the **Artifact Commit-and-Link** procedure for `design_spec.md` (artifact_key=`design_spec`, artifact_label="Design Spec").
- After artifact commit-and-link completes, run the **Pause Protocol**: set `phase.status` to `paused_awaiting_instruction` with `next_action` = "Await explicit user instruction to start tech spec." Report the pause and stop. Do NOT proceed to Phase 6 until the user explicitly says to start tech spec.
- Update the state file with design review artifacts, `design_completeness_gate` status, human approval status, artifact commit-and-link results, `github.pr_url`, and `next_action`.

### Phase 6 — Tech spec
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `tech-spec`.
- Require `design_spec.md` as mandatory input (not optional). If missing, stop with error: "Run /design-spec first."
- Produce `technical_spec.md` that is minimal, coherent, and repo-fit.
- Preserve only the strategy-derived constraints that materially affect architecture, sequencing, or implementation boundaries.
- Update the state file with the tech spec artifact path and phase progress.

### Phase 7 — Tech spec review
- Invoke `tech-spec-review`.
- Require the review to include simplicity and architectural fitness as a blocking concern during design review.
- Block advancement if the design is over-engineered, unjustifiably abstract, or poorly aligned with repo architecture.
- Stop for human approval before implementation begins.
- After the user approves `tech_spec_approval`, execute the **Artifact Commit-and-Link** procedure for `technical_spec.md` (artifact_key=`technical_spec`, artifact_label="Technical Spec").
- After artifact commit-and-link completes, run the **Pause Protocol**: set `phase.status` to `paused_awaiting_instruction` with `next_action` = "Await explicit user instruction to start implementation planning." Report the pause and stop. Do NOT proceed to Phase 6 until the user explicitly says to start.
- Update the state file with tech-spec review artifacts, `design_simplicity_gate`, human approval status, artifact commit-and-link results, `github.pr_url`, and `next_action`.

### Phase 8 — Execution scope confirmation
- Confirm the smallest valid implementation slice.
- Record any intentional deferrals as technical debt.
- Stop for human approval before coding starts.
- If this issue is a legacy run without `git.*` metadata, derive the branch/worktree metadata now and migrate execution into the canonical sibling worktree before Phase 7 starts.
- Update the state file with blockers, scope notes, debt links, execution-scope approval status, and `next_action`.

### Phase 9 — Implementation
- **Worktree assertion (mandatory first step)**: Verify the current working directory is the resolved issue worktree before invoking any child skill:
  ```bash
  python3 "${AGENTS_SKILLS_ROOT}/issue-flow/scripts/issue_flow_git.py" assert-cwd \
      --branch "<git.branch from state>"
  ```
  If this fails, resolve the correct worktree path from `git.worktree_dirname` in state, cd into it, and re-run the assertion before proceeding. Do NOT invoke `engineer` from the main checkout.
- Invoke `engineer`.
- Implement only the approved scope.
- Maintain evidence that maps implementation work to acceptance criteria.
- Update the state file with implementation evidence pointers and relevant git/GitHub references.

### Phase 10 — Regression scenario generation
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `spec-to-regression`.
- Ensure every relevant criterion maps to browser/API regression scenarios.
- After generation completes, execute the **Artifact Commit-and-Link** procedure for the regression spec (artifact_key=`regression_spec`, artifact_label="Regression Spec").
- Update the state file with regression artifact paths, `regression_coverage_gate` status, artifact commit-and-link results, and `github.pr_url`.

### Phase 11 — Test code generation
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `api-integration-codegen` and `browser-integration-codegen`.
- Generate executable tests from the regression specs.
- Update the state file with generated test artifact paths and `generated_test_gate` status.

### Phase 12 — Test quality validation
- Invoke `test-quality-validator --strict`.
- Block advancement if coverage is incomplete or false-green risks remain.
- Update the state file with validation outputs and `test_quality_gate` status.

### Phase 13 — QA execution
- **Worktree assertion**: Run `issue_flow_git.py assert-cwd --branch <git.branch>` before proceeding. Hard stop on failure.
- Invoke `qa` only after Phase 10, Phase 11, and Phase 12 are complete.
- QA is the execution phase that runs the relevant tests, validates the built artifact, and produces QA evidence.
- Fix blocking defects and re-run the necessary gates.
- Update the state file with QA outputs, blocker list, rerun notes, and `qa_execution_gate` status.

### Phase 14 — Simplicity and architecture review
- Invoke `code-review` after QA passes.
- Review the actual implementation for simplicity, unnecessary abstraction, requirement compliance, and architecture fit.
- This is distinct from the design-time simplicity gate in Phase 7.
- Update the state file with review evidence and `implementation_simplicity_gate` status.

### Phase 15 — PR creation and CI resolution
- Check if `github.pr_url` is already set in the state file (from earlier artifact commit-and-link).
- If a PR already exists:
  - Verify it is still open: `gh pr view <number> --json state -q '.state'`.
  - If open, update the PR body with full implementation evidence, test results, QA summary, and code review results from prior phases. Replace the spec-only body with a comprehensive delivery summary while preserving the spec checklist and `Closes #<issue_number>`.
  - If closed or merged, create a new PR using the same base branch resolution and format as the Artifact Commit-and-Link procedure.
- If no PR exists yet:
  - Resolve the base branch: read `git.base_branch` from state; if unset or missing on remote, check for `dev` then fall back to `main`.
  - Create the PR: `gh pr create --base <PR_BASE> --head <branch> --title "feat(#<issue_number>): <issue_title>" --body <body>` with full delivery evidence.
- After the PR exists, monitor and fix CI failures deterministically.
- Update the state file with `github.pr_url`, `github.ci_url`, CI status, and any related blockers.

### Phase 16 — Final verification and acceptance
- Invoke `verification-before-completion`.
- Re-run the exact commands required to justify completion claims.
- Produce acceptance-criteria-to-evidence mapping.
- Update the state file with verification artifacts, `final_verification_gate` status, and final acceptance status when approved.

### Phase 17 — Closeout and GitHub sync
- Update the GitHub issue and any associated project item.
- Record final evidence summary, PR link, CI status, and any follow-up debt/issues.
- Move to Done only after human acceptance is recorded.
- Keep the worktree through PR and acceptance by default; remove it only after final acceptance or an explicit cleanup policy decision.
- Update `.issue-flow-state.json` with final GitHub sync details, unresolved follow-up links, final phase status, and a closing `history` event.

## Quality Gates

Do not advance a phase without the required evidence.

- `Issue Readiness Check` — issue is classified correctly as `execution-ready` or `discovery-recovery`
- `Strategy Context Check` — relevant strategy docs were consulted and cited when available, or strategy unavailability was explicitly recorded
- `Issue Clarification Recovery Gate` — if the issue started in `discovery-recovery`, approved brainstorm artifacts exist, draft testable acceptance criteria exist, and the approved clarification has been appended to the existing issue without overwriting prior content
- `Brainstorm Discovery Gate` — interactive clarification happened, key questions were answered or explicitly waived, transcript evidence exists, and strategy fit was captured when strategy docs were available
- `Spec Gate` — PRD and tech spec reviews have no blocking issues
- `Design Completeness Gate` — design spec covers all user flows from PRD, accessibility requirements are specified, component specs are feasible
- `Design Simplicity Gate` — tech spec is simple, justified, and repo-fit
- `Regression Coverage Gate` — criteria map to regression scenarios
- `Generated Test Gate` — code-generated tests exist and align with specs
- `Test Quality Gate` — `test-quality-validator --strict` passes
- `QA Execution Gate` — QA actually runs the relevant suites and validates behavior
- `Implementation Simplicity Gate` — post-QA code review has no blocking over-engineering findings
- `Final Verification Gate` — completion claims are backed by fresh commands and evidence

## Human Review Gates

Always stop for human confirmation on:

- brainstorm approval
- issue clarification approval before any GitHub issue update in `discovery-recovery` mode
- PRD approval after review
- design approval after design review
- tech spec approval after review
- execution scope approval before coding
- final acceptance before closeout

Also stop for human input when:

- acceptance criteria are ambiguous
- destructive or production-impacting actions are required
- security or billing posture changes are involved
- conflicting review directions cannot both be satisfied

## Artifact Commit-and-Link Procedure

A reusable procedure for committing an approved artifact to the issue branch and posting a link on the GitHub issue. Execute this procedure whenever a phase above calls for it.

### Inputs

| Input | Description |
|---|---|
| `artifact_key` | The key in `artifacts.*` (e.g., `product_spec`, `technical_spec`, `regression_spec`) |
| `artifact_label` | Human-readable name (e.g., "Product Spec (PRD)", "Technical Spec", "Regression Spec") |
| `artifact_path` | Relative path from worktree root to the file (from `artifacts.<artifact_key>`) |

### Steps

1. **Ask the user**: "Would you like to commit the `<artifact_label>` and post a link on the GitHub issue?"

2. **If the user declines**: set `artifact_commits.<artifact_key>.skipped` to `true`, append a history event with `event: "artifact_commit_skipped"`, and proceed to the next phase.

3. **If the user accepts**:

   a. **Stage the artifact**:
   ```bash
   git add <artifact_path>
   ```

   b. **Commit** with the message:
   ```
   docs(<epic-slug>): add approved <artifact_label>

   Approved <artifact_label> for #<issue_number>.
   ```

   c. **Push** to the remote branch:
   ```bash
   git push origin <branch>
   ```

   d. **Construct the file URL**:
   ```bash
   REPO_URL=$(gh repo view --json url -q '.url')
   FILE_URL="${REPO_URL}/blob/<branch>/<artifact_path>"
   ```

   e. **Post a GitHub comment**:
   ```bash
   gh issue comment <issue_number> --body "**<artifact_label> committed** — [View on branch \`<branch>\`](<FILE_URL>)"
   ```

   f. **Resolve PR base branch**:
   - Read `git.base_branch` from the state file. If it is set and the branch exists on the remote, use it as `PR_BASE`.
   - Otherwise, check if `dev` exists on the remote:
     ```bash
     git ls-remote --heads origin dev | grep -q dev
     ```
     If yes, set `PR_BASE=dev`. Otherwise, set `PR_BASE=main`.

   g. **Create or update PR**:
   - If `github.pr_url` is already set in state, extract the PR number and verify it is still open:
     ```bash
     gh pr view <number> --json state -q '.state'
     ```
     If the PR is `OPEN`, update its body (see body format below). If it is `CLOSED` or `MERGED`, treat as no existing PR and create a new one.
   - If no PR URL is in state, check for an existing open PR matching the branch:
     ```bash
     gh pr list --state open --head "<branch>" --json number,url -q '.[0]'
     ```
   - If an open PR is found, update its body. If none is found, create a new PR:
     ```bash
     gh pr create --base "$PR_BASE" --head "<branch>" \
       --title "feat(#<issue_number>): <issue_title>" \
       --body "$PR_BODY"
     ```
     To create a draft PR instead, add `--draft` to the command above.

   **PR body format** — build a spec progress checklist from `artifact_commits.*` in state. For each artifact key (`product_spec`, `design_spec`, `technical_spec`, `regression_spec`):
   - `committed: true` → `- [x] <label>`
   - `skipped: true` → `- [~] <label> (skipped)`
   - otherwise → `- [ ] <label>`

   ```markdown
   ## #<issue_number>: <issue_title>

   ### Spec Progress
   - [x] Product Spec (PRD)
   - [ ] Design Spec
   - [ ] Technical Spec
   - [ ] Regression Spec

   ---
   _This PR is managed by issue-flow. Specs are committed as they are approved._

   Closes #<issue_number>
   ```

   On subsequent artifact commits, rewrite the full PR body with the updated checklist via `gh pr edit <number> --body "$UPDATED_PR_BODY"`.

   h. **Update state** by merging into `artifact_commits.<artifact_key>`:
   ```json
   {
     "committed": true,
     "commit_sha": "<sha>",
     "pushed": true,
     "github_comment_posted": true,
     "pr_created": true,
     "skipped": false,
     "timestamp": "<ISO 8601>"
   }
   ```
   Also merge the PR URL into state:
   ```json
   {
     "github": {
       "pr_url": "<PR_URL>"
     }
   }
   ```

   i. **Append history events**:
   - `event: "artifact_committed_and_linked"` for the artifact commit.
   - `event: "pr_created_or_updated"` with `details: "PR <created|updated> at <PR_URL> after <artifact_label> commit"`.

### Failure Handling

- If the commit or push fails, report the error to the user and do not post the GitHub comment or create a PR. Record `error` in `artifact_commits.<artifact_key>`.
- If the GitHub comment fails, record the commit SHA in state anyway and note the comment failure. The artifact is still committed; the link can be posted manually.
- If PR creation or update fails, log the error and record `pr_error` in `artifact_commits.<artifact_key>`. Set `pr_created` to `false`. The PR can be created manually or will be retried at the next artifact commit or at Phase 15.
- Never block phase advancement on a comment-posting or PR failure. The commit is the important part.

## Output Contract

For every status update, include:

- Current phase
- Current mode (`execution-ready` or `discovery-recovery`)
- Strategy sources consulted (or explicit note that none were available)
- Skills used
- Artifacts produced
- Quality gate result
- Human gate result
- Evidence collected
- Proposed issue append content when clarification is pending approval
- Open risks
- Next action
- Exact pause reason if blocked
- For brainstorm specifically: questions asked, answers received, unresolved questions, and whether the user explicitly confirmed alignment
- State file path
- Reconciliation result and whether the state file was updated from external evidence
- Branch name, worktree strategy, and runtime-derived canonical worktree path

## Hard Stop Conditions

- issue acceptance criteria remain missing or not testable after bounded brainstorm-based clarification attempts
- a product- or workflow-shaping issue cannot be aligned to strategy and the missing strategic basis would materially change delivery intent
- state between GitHub and local epic cannot be reconciled safely
- required human review is not approved
- a quality gate fails after bounded repair attempts
- missing credentials or external permissions block progress
- destructive or production-impacting action requires approval

## Definition of Done

The issue is done only when:

- approved brainstorm, PRD, and tech spec artifacts exist
- the intake and brainstorm artifacts record strategy sources consulted when available, or explicitly note strategy unavailability
- if the issue started underspecified, an approved append-only clarification update has been added to the existing GitHub issue and preserved the original issue content
- implementation matches approved specs
- regression scenarios exist
- generated tests exist
- test-quality validation passes
- QA has run the relevant tests and passed
- post-QA simplicity and architecture review passes
- CI is green
- each acceptance criterion has fresh evidence
- human acceptance is recorded
- GitHub issue and associated project state are updated accordingly
