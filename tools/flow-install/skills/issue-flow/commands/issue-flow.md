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
3. Create or update `${SPEC_ROOT}/<epic>/.issue-flow-state.json`.
4. Seed issue metadata, epic metadata, current phase, mode, and initial next action.

### `continue`

1. Resolve the target epic by one of the following:
   - explicit issue argument if provided
   - existing `.issue-flow-state.json` that matches the active issue
   - most recently modified `.issue-flow-state.json`
2. Read the state file.
3. Reconcile state against GitHub, local artifacts, and git worktree.
4. Update non-controversial fields in `.issue-flow-state.json`.
5. Resume from the highest fully-complete phase whose required gates are passed.

### `status`

1. Resolve the target epic using the same rules as `continue`.
2. Read `${SPEC_ROOT}/<epic>/.issue-flow-state.json`.
3. Reconcile against GitHub and local artifacts.
4. Report current phase, mode, gate status, blockers, artifacts, and next action.

## Reconciliation Rules

On `issue`, `continue`, and `status`, perform a project-state investigation:

1. Verify the epic folder exists.
2. Verify the state file exists, or initialize it if this is a new run.
3. Compare state metadata with the actual GitHub issue and optional project item.
4. Compare state artifact paths with files actually present under `${SPEC_ROOT}/<epic>/`.
5. Compare recorded PR / CI links with actual GitHub state when available.
6. Compare implementation-related progress with the current git branch/worktree.

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
Phase 4 — Tech spec
Phase 5 — Tech spec review
Phase 6 — Execution scope confirmation
Phase 7 — Implementation
Phase 8 — Regression scenario generation
Phase 9 — Test code generation
Phase 10 — Test quality validation
Phase 11 — QA execution
Phase 12 — Simplicity and architecture review
Phase 13 — PR creation and CI resolution
Phase 14 — Final verification and acceptance
Phase 15 — Closeout and GitHub sync

## Phase Rules

### Phase 0 — Intake, readiness check, and clarification recovery
- Load the GitHub issue and any available project metadata.
- Extract problem, goal, scope, non-goals, acceptance criteria, dependencies, blockers, labels, assignee, and project status.
- Classify the issue as either `execution-ready` or `discovery-recovery`.
- If acceptance criteria are missing or not testable, do not fail immediately. Enter `discovery-recovery` mode and route into the mandatory brainstorm clarification path.
- In `discovery-recovery` mode, use brainstorm outputs to derive problem statement, target audience, scope, non-goals, success criteria, and draft testable acceptance criteria.
- After the user approves the synthesized clarification, append the approved update to the existing GitHub issue. Never overwrite existing issue content.
- Refuse execution only if the issue cannot be made testable after bounded clarification attempts or required approval is withheld.
- Locate or create the epic path under `${SPEC_ROOT}`.
- Reconcile local state and GitHub state before proceeding.
- Initialize or update `.issue-flow-state.json` with issue metadata, epic metadata, mode, phase, gate defaults, and artifact pointers.
- Append a `history` event whenever the issue classification or epic association changes.

### Phase 1 — Brainstorm
- Invoke `brainstorm`.
- Treat brainstorming as a two-step phase:
  1. interactive discovery with the user
  2. artifact generation after discovery alignment
- The interactive discovery step is mandatory unless the user explicitly says there are no further clarifications needed.
- During discovery, ask one clarifying question at a time and capture answer evidence.
- Resolve at minimum the problem framing, target decision/user, intended scope, success criteria, and key exclusions/constraints.
- Produce both `brainstorm.md` and transcript evidence (`brainstorm_transcript.md` or `brainstorm_notes.md`).
- When the issue entered `discovery-recovery` mode, use these artifacts to synthesize a proposed issue clarification update that includes draft testable acceptance criteria.
- The proposed issue clarification update must be append-only and must preserve the original issue text.
- Do not mark Phase 1 complete if the artifact was drafted from repo context alone without the required user clarification loop.
- Stop for human approval before PRD starts.
- Update `.issue-flow-state.json` with brainstorm artifact paths, brainstorm gate result, pending human approval state, and next action.
- When the user approves the append-only issue update and the issue is edited successfully, mark `gates.human.issue_append_approval` and `gates.quality.issue_clarification_recovery_gate` accordingly and append a `history` event.

### Phase 2 — PRD
- Invoke `prd`.
- Produce `product_spec.md` with explicit, testable acceptance criteria.
- Update the state file with the PRD artifact path and phase progress.

### Phase 3 — PRD review
- Invoke `prd-spec-review`.
- Resolve all blocking review issues.
- Stop for human approval before tech spec starts.
- Update the state file with PRD review artifacts, `spec_gate` status, human approval status, and `next_action`.

### Phase 4 — Tech spec
- Invoke `tech-spec`.
- Produce `technical_spec.md` that is minimal, coherent, and repo-fit.
- Update the state file with the tech spec artifact path and phase progress.

### Phase 5 — Tech spec review
- Invoke `tech-spec-review`.
- Require the review to include simplicity and architectural fitness as a blocking concern during design review.
- Block advancement if the design is over-engineered, unjustifiably abstract, or poorly aligned with repo architecture.
- Stop for human approval before implementation begins.
- Update the state file with tech-spec review artifacts, `design_simplicity_gate`, human approval status, and `next_action`.

### Phase 6 — Execution scope confirmation
- Confirm the smallest valid implementation slice.
- Record any intentional deferrals as technical debt.
- Stop for human approval before coding starts.
- Update the state file with blockers, scope notes, debt links, execution-scope approval status, and `next_action`.

### Phase 7 — Implementation
- Invoke `engineer`.
- Implement only the approved scope.
- Maintain evidence that maps implementation work to acceptance criteria.
- Update the state file with implementation evidence pointers and relevant git/GitHub references.

### Phase 8 — Regression scenario generation
- Invoke `spec-to-regression`.
- Ensure every relevant criterion maps to browser/API regression scenarios.
- Update the state file with regression artifact paths and `regression_coverage_gate` status.

### Phase 9 — Test code generation
- Invoke `api-integration-codegen` and `browser-integration-codegen`.
- Generate executable tests from the regression specs.
- Update the state file with generated test artifact paths and `generated_test_gate` status.

### Phase 10 — Test quality validation
- Invoke `test-quality-validator --strict`.
- Block advancement if coverage is incomplete or false-green risks remain.
- Update the state file with validation outputs and `test_quality_gate` status.

### Phase 11 — QA execution
- Invoke `qa` only after Phase 8, Phase 9, and Phase 10 are complete.
- QA is the execution phase that runs the relevant tests, validates the built artifact, and produces QA evidence.
- Fix blocking defects and re-run the necessary gates.
- Update the state file with QA outputs, blocker list, rerun notes, and `qa_execution_gate` status.

### Phase 12 — Simplicity and architecture review
- Invoke `code-review` after QA passes.
- Review the actual implementation for simplicity, unnecessary abstraction, requirement compliance, and architecture fit.
- This is distinct from the design-time simplicity gate in Phase 5.
- Update the state file with review evidence and `implementation_simplicity_gate` status.

### Phase 13 — PR creation and CI resolution
- Create or update the PR with clear evidence.
- Monitor and fix CI failures deterministically.
- Update the state file with `github.pr_url`, `github.ci_url`, CI status, and any related blockers.

### Phase 14 — Final verification and acceptance
- Invoke `verification-before-completion`.
- Re-run the exact commands required to justify completion claims.
- Produce acceptance-criteria-to-evidence mapping.
- Update the state file with verification artifacts, `final_verification_gate` status, and final acceptance status when approved.

### Phase 15 — Closeout and GitHub sync
- Update the GitHub issue and any associated project item.
- Record final evidence summary, PR link, CI status, and any follow-up debt/issues.
- Move to Done only after human acceptance is recorded.
- Update `.issue-flow-state.json` with final GitHub sync details, unresolved follow-up links, final phase status, and a closing `history` event.

## Quality Gates

Do not advance a phase without the required evidence.

- `Issue Readiness Check` — issue is classified correctly as `execution-ready` or `discovery-recovery`
- `Issue Clarification Recovery Gate` — if the issue started in `discovery-recovery`, approved brainstorm artifacts exist, draft testable acceptance criteria exist, and the approved clarification has been appended to the existing issue without overwriting prior content
- `Brainstorm Discovery Gate` — interactive clarification happened, key questions were answered or explicitly waived, and transcript evidence exists
- `Spec Gate` — PRD and tech spec reviews have no blocking issues
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
- tech spec approval after review
- execution scope approval before coding
- final acceptance before closeout

Also stop for human input when:

- acceptance criteria are ambiguous
- destructive or production-impacting actions are required
- security or billing posture changes are involved
- conflicting review directions cannot both be satisfied

## Output Contract

For every status update, include:

- Current phase
- Current mode (`execution-ready` or `discovery-recovery`)
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

## Hard Stop Conditions

- issue acceptance criteria remain missing or not testable after bounded brainstorm-based clarification attempts
- state between GitHub and local epic cannot be reconciled safely
- required human review is not approved
- a quality gate fails after bounded repair attempts
- missing credentials or external permissions block progress
- destructive or production-impacting action requires approval

## Definition of Done

The issue is done only when:

- approved brainstorm, PRD, and tech spec artifacts exist
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
