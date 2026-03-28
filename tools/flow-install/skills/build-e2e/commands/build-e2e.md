---
description: End-to-end product development orchestrator with human-in-the-loop reviews
argument-hint: "[continue|status|skip|epic <name>]"
---

# End-to-End Product Builder

Master orchestrator that guides the complete product development lifecycle from idea to running application, with human evaluation checkpoints at critical stages.

## Mission

Guide the user through the complete product development pipeline:
1. **Workspace Setup** - Git, semver, specs folder
2. **Epic Selection** - Create or select an epic (folder under `specs/`)
3. **Brainstorm** - Collaborative idea development
4. **PRD** - Product specification with 5-perspective review
5. **Tech Spec** - Technical specification with 6-perspective review
6. **MVP Spec** - Scoped MVP with prioritized work items
7. **Engineer** - Full implementation with tests
8. **QA** - Quality assurance with fix loop (artifacts stored within epic)
9. **Local Run** - Docker configuration and deployment

## Spec Root Resolution

Resolve the spec root in this order:

1. `BUILD_E2E_SPEC_ROOT` if set
2. `./.jarvis/context/specs` if it exists
3. `./specs` if it exists
4. fallback default: `./specs`

Use `${AGENTS_SKILLS_ROOT}/build-e2e/scripts/resolve-spec-root.sh` for shell resolution.

Treat every `specs/<epic>/...` reference below as `${SPEC_ROOT}/<epic>/...`.

## Integration Branch Resolution

Use the repository integration branch from `.flow/delivery-profile.json` when present.

Fallback order:

1. `.flow/delivery-profile.json` → `workflow.integrationBranch`
2. `dev`

Treat every hardcoded `dev` reference below as the resolved integration branch.

## Epic Structure

Epics are folders within the active spec root using the naming convention: `<NN>_<epic_name>`

**Numbering rule (monotonic):**
- Always use the **next highest** numeric prefix (max existing + 1)
- Do **not** reuse gaps
- Pad to 2 digits for `< 100` (01..99), then use `100`, `101`, ...

```
specs/
├── 01_core_features/
│   ├── brainstorm.md
│   ├── product_spec.md
│   ├── technical_spec.md
│   ├── MVP_technical_spec.md
│   └── qa/                      # QA artifacts for this epic
│       ├── bugs/
│       │   └── bug-report.json
│       ├── test-cases/
│       └── reports/
├── 02_user_auth/
│   ├── brainstorm.md
│   └── ...
└── 03_search_feature/
    └── ...
```

**All artifacts (specs, QA reports, test cases, bugs) are scoped to the current epic.**

## Epic-Based Git Branching

Each epic gets its own git branch for clean isolation and history:

```
main (production)
└── <integration-branch> (developer integration branch)
    ├── epic/01_core_features          ← Completed, merged to integration branch
    ├── epic/02_user_auth              ← In progress
    │   ├── feature/WORK-010-login     ← Work items branch from epic
    │   └── feature/WORK-011-signup
    └── epic/05_ui_search_publishing   ← Active epic
        └── feature/WORK-050-search-ui
```

### Branch Lifecycle

| Phase | Git Action |
|-------|------------|
| Epic selected | Create `epic/<epic_name>` from the integration branch |
| Work item started | Create `feature/<work-id>` from epic branch |
| Work item complete | Merge feature to epic branch, delete feature |
| Epic complete | Squash-merge epic to the integration branch, delete epic branch |

### Benefits

- **Isolation**: Each epic's changes are contained in one branch
- **Clean history**: Squash-merge produces single commit per epic
- **Parallel work**: Multiple epics can be worked on simultaneously
- **Easy rollback**: Revert a single epic commit if needed

## User Input

$ARGUMENTS

## Context

- Current directory: !`pwd`
- Git status: !`git status 2>/dev/null | head -5 || echo "Not a git repo"`
- Spec root: !`bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh" 2>/dev/null || printf '%s\n' specs`
- Specs folder: !`SPEC_ROOT=$(bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh" 2>/dev/null || printf '%s\n' specs); ls "$SPEC_ROOT" 2>/dev/null || echo "No specs folder"`
- Existing epics: !`SPEC_ROOT=$(bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh" 2>/dev/null || printf '%s\n' specs); ls -d "$SPEC_ROOT"/[0-9][0-9]_*/ 2>/dev/null | sed "s|$SPEC_ROOT/||g" | sed 's|/$||g' || echo "No epics found"`
- Epic states: !`SPEC_ROOT=$(bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh" 2>/dev/null || printf '%s\n' specs); for f in "$SPEC_ROOT"/[0-9][0-9]_*/.build-e2e-state.json; do [ -f "$f" ] && echo "$f: $(cat "$f" | jq -r '.phase // "unknown"')"; done 2>/dev/null || echo "No epic states"`

## State File Location

**Each epic has its own state file:**
```
<SPEC_ROOT>/<00>_<epic_name>/.build-e2e-state.json
```

This allows multiple epics to be worked on independently with their own lifecycle tracking.

## Command Router

### No arguments → Start new session

**Opening:**
"I'll guide you through the complete product development lifecycle with checkpoints for your review. Let's start by setting up your workspace and selecting an epic."

### `continue` → Resume from checkpoint

1. Detect active epic (most recently modified `${SPEC_ROOT}/<epic>/.build-e2e-state.json`)
2. Read current state from `${SPEC_ROOT}/<epic>/.build-e2e-state.json`
3. **Checkout the epic's git branch** (if not already on it)
4. Identify current phase
5. Resume execution from that point

**Git branch handling on resume:**
```bash
SPEC_ROOT=$(bash "${HOME}/.agents/skills/build-e2e/scripts/resolve-spec-root.sh")

# Get epic branch from state
EPIC_BRANCH=$(cat "$SPEC_ROOT"/<epic>/.build-e2e-state.json | jq -r '.git.epic_branch // empty')

# Checkout epic branch if defined and not already on it
if [ -n "$EPIC_BRANCH" ]; then
    git checkout "$EPIC_BRANCH" 2>/dev/null || echo "Creating epic branch..."
fi
```

**Or specify epic:** `/build-e2e continue 05_ui_search`

### `status` → Show progress

Display current pipeline status including:
- Current epic
- Current phase
- Completed checkpoints
- Pending phases
- QA metrics if applicable

### `skip` → Skip current phase

1. Mark current checkpoint as skipped
2. Update state
3. Proceed to next phase

### `epic <name>` → Switch to or create epic

1. If epic exists, switch to it
2. If not, create new epic folder with next sequence number
3. Update state with new epic

### `investigate` → Deep project state investigation

Perform a comprehensive investigation of the project state:

1. Compare state file with actual project artifacts
2. Run tests and verify counts match
3. Check for uncommitted changes
4. Identify any discrepancies
5. Offer reconciliation options

This is useful when:
- Resuming after a long break
- Suspecting state file is out of sync
- After manual code changes outside build-e2e
- Before starting a new phase

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    END-TO-END DEVELOPMENT FLOW                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                   │
│  │   SETUP      │  Workspace, Git, Semver, Specs folder             │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │ EPIC SELECT  │  Create/select epic: <SPEC_ROOT>/<00>_<epic_name>/ │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │  BRAINSTORM  │  /brainstorm → <epic>/brainstorm.md               │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ╔══════════════╗                                                   │
│  ║ HUMAN EVAL 1 ║  Review brainstorm.md                             │
│  ╚══════╤═══════╝                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │     PRD      │  /prd → /prd-spec-review                          │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ╔══════════════╗                                                   │
│  ║ HUMAN EVAL 2 ║  Review product_spec.md                           │
│  ╚══════╤═══════╝                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │  TECH SPEC   │  /tech-spec → /tech-spec-review                   │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ╔══════════════╗                                                   │
│  ║ HUMAN EVAL 3 ║  Review technical_spec.md                         │
│  ╚══════╤═══════╝                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │   MVP SPEC   │  /mvp-tech-spec (optional)                        │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ╔══════════════╗                                                   │
│  ║ HUMAN EVAL 4 ║  Review MVP_technical_spec.md                     │
│  ╚══════╤═══════╝                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │   ENGINEER   │  /engineer (full implementation)                  │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │      QA      │  /qa → <epic>/qa/ (artifacts within epic)         │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ╔══════════════╗                                                   │
│  ║ HUMAN EVAL 5 ║  Review QA report, fix bugs if needed             │
│  ╚══════╤═══════╝                                                   │
│         │                                                           │
│         │ ◄──────────────────────────────────────┐                  │
│         │         (loop if bugs need fixing)     │                  │
│         ▼                                        │                  │
│  ┌──────────────┐    bugs found    ┌─────────────┴──┐               │
│  │ USER TEST    │ ◄─── No ───────  │  /engineer fix │               │
│  │   SCRIPT     │  Auto-generate manual E2E checklist              │
│  └──────┬───────┘                  └────────────────┘               │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │  LOCAL RUN   │  Docker configuration and deployment              │
│  └──────┬───────┘                                                   │
│         ▼                                                           │
│  ┌──────────────┐                                                   │
│  │   COMPLETE   │  Application running locally                      │
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Phase 0: Workspace Setup

### 0.1 Confirm Workspace Location

```markdown
Is the current folder your workspace? [Y/N]

Current folder: [pwd output]
```

**If No:** Ask for folder path. Create if doesn't exist.

### 0.2 Git Initialization

**If new project (no .git folder):**

```markdown
This appears to be a new project. Would you like to initialize Git? [Y/N]
```

**If Yes:**
```bash
git init
git checkout -b main
```

### 0.3 Semver Initialization

**If no VERSION file:**

```markdown
Would you like to initialize semantic versioning? [Y/N]
```

**If Yes:** Run `/semver init`

### 0.4 Specs Folder Setup

```markdown
Where would you like to create the specs folder?

Default: resolved spec root

Enter path or press Enter for default:
```

### 0.5 Setup Complete

```markdown
## ✅ Workspace Setup Complete

- **Workspace:** [path]
- **Git:** [Initialized / Existing]
- **Semver:** [Initialized / Skipped]
- **Specs folder:** [path]

Ready to begin brainstorming. Type "continue" to proceed.
```

**Update state:** `PHASE: EPIC_SELECT`

## Phase 0.5: Epic Selection

### 0.5.1 List Existing Epics

```markdown
## Existing Epics

| # | Epic | Status |
|---|------|--------|
| 01 | core_features | Complete |
| 02 | user_auth | In Progress |
| ... | ... | ... |

## Options

[A] Continue with existing epic: [last active or select]
[B] Create new epic

Enter choice or epic number:
```

### 0.5.2 Create New Epic

If creating new:

```markdown
Enter epic name (will be formatted as <next_num>_<name>):
```

**Naming rules:**
- Lowercase, underscores for spaces
- **Monotonic sequence number**: max existing + 1 (never reuse gaps)
- Pad to 2 digits for `< 100`, then use `100`, `101`, ...
- Example: `search_feature` → `03_search_feature`

### 0.5.3 Epic Selection Complete

```markdown
## ✅ Epic Selected

- **Epic:** [00]_[epic_name]
- **Path:** specs/[00]_[epic_name]/
- **Git Branch:** epic/[00]_[epic_name]
- **Status:** [New / Existing]

Ready to begin brainstorming for this epic. Type "continue" to proceed.
```

**Create epic folder if new:**
```bash
mkdir -p specs/[00]_[epic_name]/qa/bugs
mkdir -p specs/[00]_[epic_name]/qa/test-cases
mkdir -p specs/[00]_[epic_name]/qa/reports
```

**Create or checkout epic branch:**
```bash
# Ensure we're on the integration branch first
git checkout <integration-branch>

# Create epic branch if it doesn't exist, or checkout existing
git checkout -b epic/[00]_[epic_name] 2>/dev/null || git checkout epic/[00]_[epic_name]

# Verify we're on the epic branch
git branch --show-current  # Should show: epic/[00]_[epic_name]
```

**Update state:** `PHASE: BRAINSTORM`, `epic: "[00]_[epic_name]"`, `epic_branch: "epic/[00]_[epic_name]"`

## Phase 1: Brainstorm

### Execute

**IMPORTANT: The brainstorm skill is INTERACTIVE. You MUST engage in a back-and-forth conversation with the user. Do NOT auto-generate brainstorm.md without user participation.**

**Evidence Requirement (Non-negotiable):**
- Maintain a transcript file at `${SPEC_ROOT}/<epic>/brainstorm_transcript.md`
- Log **at least 3** Q/A exchanges (one question at a time)
- Include a final “clarity check” question and the user’s confirmation
- Only then generate `brainstorm.md`

1. **Start the brainstorm session** by saying:
   "Let's brainstorm your idea together. I'll ask questions one at a time to help shape it."

2. **Follow the brainstorm skill's question flow** - ask questions ONE AT A TIME and wait for user responses.

3. **Write the transcript** as you go:

```markdown
# Brainstorm Transcript — <epic>

Q1: ...
A1: ...

Q2: ...
A2: ...

Q3: ...
A3: ...

Clarity Check: “Do we have enough clarity to proceed?”
Answer: ...
```

4. **Continue the conversation** until the user confirms alignment with the idea.

5. **Generate brainstorm.md** only after the user confirms the clarity check.

- Input: Epic folder path
- Output: `specs/[epic]/brainstorm.md`

### Human Eval Checkpoint 1

**CRITICAL: This checkpoint MUST use the `question` tool to pause and wait for user input. DO NOT proceed automatically.**

```markdown
════════════════════════════════════════════════════════════════════
📋 CHECKPOINT: BRAINSTORM COMPLETE
════════════════════════════════════════════════════════════════════

## Progress Report

✅ Workspace setup complete
✅ Brainstorm session complete

## Deliverable

📄 **brainstorm.md** created at: [specs-folder]/brainstorm.md

## What's Next

The next phase will:

1. Generate Product Specification (product_spec.md)
2. Review the specification with 5-perspective analysis
════════════════════════════════════════════════════════════════════
```

**Invoke the question tool NOW:**

```typescript
question(questions=[{
  header: "Checkpoint 1",
  question: "📋 CHECKPOINT: Brainstorm complete. Review brainstorm.md at [specs-folder]/brainstorm.md. Ready to proceed?",
  options: [
    {label: "Continue to PRD", description: "Proceed to generate Product Specification"},
    {label: "Edit brainstorm.md", description: "Make changes before proceeding"},
    {label: "Stop", description: "Pause session (resume with /build-e2e continue)"}
  ]
}])
```

**Only proceed to Phase 2 if user selects 'Continue to PRD'.**

**Update state:** `PHASE: AWAIT_BRAINSTORM_EVAL`

**Validation (required before proceeding):**
```bash
${AGENTS_SKILLS_ROOT}/build-e2e/scripts/validate.sh <epic-path-or-epic-name>
```

Validation is a hard gate. If brainstorm evidence is missing or non-interactive (fewer than 3 Q/A pairs, missing clarity check/answer), the run must stop and return to brainstorm.

## Phase 2: Product Specification

### Execute

1. Invoke `/prd` skill
   - Input: `[specs-folder]/brainstorm.md`
   - Output: `[specs-folder]/product_spec.md`

2. Invoke `/prd-spec-review` skill
   - Input: `[specs-folder]/product_spec.md`
   - Output: Updated `product_spec.md`

### Human Eval Checkpoint 2

**CRITICAL: This checkpoint MUST use the `question` tool to pause and wait for user input. DO NOT proceed automatically.**

```markdown
════════════════════════════════════════════════════════════════════
📋 CHECKPOINT: PRD COMPLETE
════════════════════════════════════════════════════════════════════

## Progress Report

✅ Workspace setup complete
✅ Brainstorm complete
✅ Product Specification complete
✅ PRD Review complete (5 perspectives)

## Deliverables

📄 **product_spec.md** at: [specs-folder]/product_spec.md

## Review Summary

- Issues found: [N]
- Issues resolved: [N]
- All perspectives signed off: ✅

## What's Next

The next phase will:

1. Generate Technical Specification (technical_spec.md)
2. Review with 6-perspective engineering analysis
════════════════════════════════════════════════════════════════════
```

**Invoke the question tool NOW:**

```typescript
question(questions=[{
  header: "Checkpoint 2",
  question: "📋 CHECKPOINT: PRD complete. Review product_spec.md at [specs-folder]/product_spec.md. Ready to proceed?",
  options: [
    {label: "Continue to Tech Spec", description: "Proceed to generate Technical Specification"},
    {label: "Edit product_spec.md", description: "Make changes before proceeding"},
    {label: "Stop", description: "Pause session (resume with /build-e2e continue)"}
  ]
}])
```

**Only proceed to Phase 3 if user selects 'Continue to Tech Spec'.**

**Update state:** `PHASE: AWAIT_PRD_EVAL`

**Validation (required before proceeding):**
```bash
${AGENTS_SKILLS_ROOT}/build-e2e/scripts/validate.sh <epic-path-or-epic-name>
```

Validation is a hard gate. If PRD panel review evidence is missing (`prd_review_summary.md` with all-perspectives sign-off), the run must stop and return to PRD review.

The summary must also include a matching PRD fingerprint line:

```text
PRD SHA256: <sha256-of-product_spec.md>
```

If the PRD changes after review, fingerprint mismatch must block progression until review is re-run.

## Phase 3: Technical Specification

### Execute

1. Invoke `/tech-spec` skill
   - Input: `[specs-folder]/product_spec.md`
   - Output: `[specs-folder]/technical_spec.md`

2. Invoke `/tech-spec-review` skill
   - Input: `[specs-folder]/technical_spec.md`
   - Output: Updated `technical_spec.md`

### Human Eval Checkpoint 3

**CRITICAL: This checkpoint MUST use the `question` tool to pause and wait for user input. DO NOT proceed automatically.**

```markdown
════════════════════════════════════════════════════════════════════
📋 CHECKPOINT: TECH SPEC COMPLETE
════════════════════════════════════════════════════════════════════

## Progress Report

✅ Workspace setup complete
✅ Brainstorm complete
✅ Product Specification complete
✅ Technical Specification complete
✅ Tech Spec Review complete (6 perspectives)

## Deliverables

📄 **technical_spec.md** at: [specs-folder]/technical_spec.md

## Review Summary

- Architecture: [Style]
- Core stack: [Technologies]
- All 6 perspectives signed off: ✅

## What's Next

**Option A:** Generate MVP Technical Specification
**Option B:** Skip to Implementation (use full spec)
════════════════════════════════════════════════════════════════════
```

**Invoke the question tool NOW:**

```typescript
question(questions=[{
  header: "Checkpoint 3",
  question: "📋 CHECKPOINT: Tech Spec complete. Review technical_spec.md at [specs-folder]/technical_spec.md. How would you like to proceed?",
  options: [
    {label: "Generate MVP Spec", description: "Distill into focused MVP with prioritized work items"},
    {label: "Skip to Implementation", description: "Use full technical spec for implementation"},
    {label: "Edit technical_spec.md", description: "Make changes before proceeding"}
  ]
}])
```

**If user selects 'Generate MVP Spec' → proceed to Phase 4.**
**If user selects 'Skip to Implementation' → proceed to Phase 5.**

**Update state:** `PHASE: AWAIT_TECHSPEC_EVAL`

**Validation (required before proceeding):**
```bash
${AGENTS_SKILLS_ROOT}/build-e2e/scripts/validate.sh <epic-path-or-epic-name>
```

Validation is a hard gate. If tech-spec panel review evidence is missing (`techspec_review_summary.md` with all-perspectives sign-off), the run must stop and return to tech-spec review.

The summary must also include a matching tech-spec fingerprint line:

```text
TECH SPEC SHA256: <sha256-of-technical_spec.md>
```

If the technical spec changes after review, fingerprint mismatch must block progression until review is re-run.

## Phase 4: MVP Specification (Optional)

### Execute (if user chose Yes)

Invoke `/mvp-tech-spec` skill

- Input: `[specs-folder]/technical_spec.md`
- Output: `[specs-folder]/MVP_technical_spec.md`

### Human Eval Checkpoint 4

**CRITICAL: This checkpoint MUST use the `question` tool to pause and wait for user input. DO NOT proceed automatically.**

```markdown
════════════════════════════════════════════════════════════════════
📋 CHECKPOINT: MVP SPEC COMPLETE
════════════════════════════════════════════════════════════════════

## Progress Report

✅ Workspace setup complete
✅ Brainstorm complete
✅ Product Specification complete
✅ Technical Specification complete
✅ MVP Specification complete

## Deliverables

📄 **MVP_technical_spec.md** at: [specs-folder]/MVP_technical_spec.md

## MVP Summary

- Work items: [N] total
- P0 (Must Have): [N]
- P1 (Should Have): [N]
- P2 (Nice to Have): [N]
- Estimated effort: [X]

## What's Next

The next phase will:

1. Implement ALL work items from the spec
2. Maintain 99%+ test coverage
3. Commit each work item to feature branch
════════════════════════════════════════════════════════════════════
```

**Invoke the question tool NOW:**

```typescript
question(questions=[{
  header: "Checkpoint 4",
  question: "📋 CHECKPOINT: MVP Spec complete. Review MVP_technical_spec.md at [specs-folder]/MVP_technical_spec.md. Ready to proceed?",
  options: [
    {label: "Begin Implementation", description: "Start implementing all work items"},
    {label: "Edit MVP Spec", description: "Modify work items or priorities before proceeding"},
    {label: "Stop", description: "Pause session (resume with /build-e2e continue)"}
  ]
}])
```

**Only proceed to Phase 5 if user selects 'Begin Implementation'.**

**Update state:** `PHASE: AWAIT_MVP_EVAL`

## Phase 5: Implementation

### Pre-Implementation

```markdown
## Implementation Starting

Which spec would you like to implement?

[A] MVP_technical_spec.md (recommended if exists)
[B] technical_spec.md (full spec)
[C] Custom path

Enter choice:
```

### Execute

Invoke `/engineer` skill

- Input: Selected spec file
- Output: Complete implementation with tests

**Engineer will automatically:**
1. **Initialize semver** if VERSION file doesn't exist (`/semver init`)
2. **Set up CI/CD pipeline** if not already configured (GitHub Actions)
3. **Write integration tests with minimal/no mocking** for complete E2E correctness
4. **Use real dependencies** (Testcontainers for databases, MSW for API mocking)

**This phase runs until all work items are complete.**

### Progress Updates

Provide periodic updates:

```markdown
## Implementation Progress

- Work items: [N] / [Total] ([%]%)
- Current: [WORK-XXX] [Title]
- Coverage: [XX]%
- Commits: [N]

[Continue working...]
```

## Phase 5.5: Quality Assurance

### Execute

Invoke `/qa` skill with epic context

- Input: Entire codebase + current epic path
- Output: `specs/[epic]/qa/` folder with reports and bug findings

**QA Output Structure:**
```
specs/[epic]/qa/
├── bugs/
│   └── bug-report.json
├── test-cases/
│   ├── summary.json
│   └── [component]-tests.json
├── reports/
│   ├── summary.json
│   ├── unit/
│   └── integration/
└── logs/
```

**CRITICAL: QA must include runtime boot verification.**

### Mocking Policy Enforcement

During QA, verify that tests follow the mocking policy:

- Database tests use real test database (not mocked)
- Integration tests boot actual services
- Only external APIs (payments, email, SMS) should be mocked
- If tests pass but `npm run dev` fails, this indicates excessive mocking

### Human Eval Checkpoint 5

**CRITICAL: This checkpoint MUST use the `question` tool to pause and wait for user input. DO NOT proceed automatically.**

```markdown
════════════════════════════════════════════════════════════════════
📋 CHECKPOINT: QA COMPLETE [Fix Iteration: N/3]
════════════════════════════════════════════════════════════════════

## Progress Report

✅ Workspace setup complete
✅ Brainstorm complete
✅ Product Specification complete
✅ Technical Specification complete
✅ MVP Specification complete
✅ Implementation complete
✅ Quality Assurance complete

## Test Results

| Component | Tests   | Passed  | Failed  | Coverage  |
| --------- | ------- | ------- | ------- | --------- |
| Backend   | [N]     | [N]     | [N]     | [XX]%     |
| Frontend  | [N]     | [N]     | [N]     | [XX]%     |
| **Total** | **[N]** | **[N]** | **[N]** | **[XX]%** |

## Quality Gates

| Gate          | Target | Actual | Status |
| ------------- | ------ | ------ | ------ |
| Pass Rate     | 100%   | [XX]%  | ✅/❌  |
| Coverage      | 80%    | [XX]%  | ✅/❌  |
| Critical Bugs | 0      | [N]    | ✅/❌  |

## Bugs Summary

| Severity | Found | Fixed | Remaining |
| -------- | ----- | ----- | --------- |
| Critical | [N]   | [N]   | [N]       |
| High     | [N]   | [N]   | [N]       |
| Medium   | [N]   | [N]   | [N]       |
| Low      | [N]   | [N]   | [N]       |

## Deliverables

- `specs/[epic]/qa/reports/summary.json` — Test summary
- `specs/[epic]/qa/bugs/bug-report.json` — Bug details
- `specs/[epic]/qa/test-cases/` — Generated test case specifications
════════════════════════════════════════════════════════════════════
```

**Invoke the question tool NOW:**

```typescript
question(questions=[{
  header: "Checkpoint 5",
  question: "📋 CHECKPOINT: QA complete. Review test results and bug report. How would you like to proceed?",
  options: [
    {label: "Fix Bugs", description: "Fix critical/high bugs (recommended if bugs remain)"},
    {label: "Continue to User Test", description: "Proceed to User Test Script generation"},
    {label: "View Bug Report", description: "Show detailed bug report before deciding"}
  ]
}])
```

**If user selects 'Fix Bugs' → invoke `/engineer fix` and re-run QA.**
**If user selects 'Continue to User Test' → proceed to Phase 5.6.**
**If user selects 'View Bug Report' → display bug report, then re-ask.**

**Update state:** `PHASE: AWAIT_QA_EVAL`

### If User Chooses A (Fix Bugs)

1. **Increment fix counter**: Update `.build-e2e-state.json`
2. **Check iteration limit**: If `fix_iterations >= 3`, show warning
3. **Invoke `/engineer fix`** with bug report as input
4. **Re-run `/qa fix`** to verify fixes
5. **Return to QA checkpoint** with updated metrics
6. **Repeat** until user chooses B or all quality gates pass

### If User Chooses B (Continue)

1. Verify all quality gates pass (or user acknowledges remaining issues)
2. Proceed to User Test Script phase
3. Include any QA warnings in final report

### If User Chooses C (View Details)

1. Display full bug report from `specs/[epic]/qa/bugs/bug-report.json`
2. Return to checkpoint options

## Phase 5.6: User Test Script Generation

**Automatically generate manual E2E test script after all QA issues are resolved.**

### Execute

1. Invoke QA skill's Phase 9 (User Test Script Generation)
2. Analyze product_spec.md and technical_spec.md for features
3. Generate comprehensive manual test checklist
4. Output to `specs/[epic]/qa/user-test-script.md`

### Output

```markdown
════════════════════════════════════════════════════════════════════
✅ USER TEST SCRIPT GENERATED
════════════════════════════════════════════════════════════════════

## Deliverable

📄 **user-test-script.md** at: specs/[epic]/qa/user-test-script.md

You can run this manual test checklist at any time to verify the
application end-to-end before release.

## Ready to proceed?

**Option A:** Continue to Local Run (recommended)
**Option B:** View the test script first

════════════════════════════════════════════════════════════════════

Choose [A/B]:
```

**Update state:** `PHASE: AWAIT_LOCAL_RUN`

## Phase 6: Local Run

### Execute

Invoke `/local-run` skill

- Configure Docker/Docker Compose
- Update README
- Start application
- Verify health

### Epic Branch Completion

After local run verification, offer to complete the epic branch:

```markdown
## Epic Branch Completion

All work items and QA complete. Ready to finalize the epic branch?

**Option A:** Squash-merge epic to the integration branch (recommended)
**Option B:** Keep epic branch open for further work
**Option C:** View epic branch summary first

Choose [A/B/C]:
```

**If user chooses A (squash-merge):**
```bash
# Ensure all changes committed on epic branch
git checkout epic/[00]_[epic_name]
git status  # Verify clean working tree

# Switch to the integration branch and squash-merge
git checkout <integration-branch>
git merge --squash epic/[00]_[epic_name]

# Create a comprehensive commit message
git commit -m "feat: complete epic [00]_[epic_name]

## Work Items Completed
- [WORK-XXX]: [Title]
- [WORK-YYY]: [Title]
...

## QA Summary
- Tests: [N] passing
- Coverage: [XX]%
- Bugs fixed: [N]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Delete the epic branch
git branch -d epic/[00]_[epic_name]
```

**Update state:** Add `git.epic_merged: true`, `git.merge_commit: "[hash]"`

### Final Report

```markdown
════════════════════════════════════════════════════════════════════
🎉 ORCHESTRATION COMPLETE
════════════════════════════════════════════════════════════════════

## Epic: [00]_[epic_name]

## Journey Summary

✅ Phase 0: Workspace Setup
✅ Phase 0.5: Epic Selection
✅ Phase 1: Brainstorm
✅ Phase 2: Product Specification
✅ Phase 3: Technical Specification
✅ Phase 4: MVP Specification
✅ Phase 5: Implementation
✅ Phase 5.5: Quality Assurance
✅ Phase 5.6: User Test Script
✅ Phase 6: Local Run

## Deliverables

### Specifications (in specs/[epic]/)

- 📄 brainstorm.md
- 📄 product_spec.md
- 📄 technical_spec.md
- 📄 MVP_technical_spec.md

### Implementation

- 📁 Source code with [N] files
- 🧪 [N] tests (99%+ coverage)
- 📝 [N] commits on feature branch

### Quality Assurance (in specs/[epic]/qa/)

- 📊 QA Reports: specs/[epic]/qa/reports/
- 📋 Test Cases: specs/[epic]/qa/test-cases/
- 📝 User Test Script: specs/[epic]/qa/user-test-script.md
- 🐛 Bugs Found: [N] (Critical: [N], High: [N], Medium: [N], Low: [N])
- ✅ Bugs Fixed: [N]
- ⏭️ Bugs Skipped: [N]
- 🔄 Fix Iterations: [N]
- 📈 Coverage: [XX]% (Target: 80%)

### Git Summary

- 🌿 **Epic Branch:** epic/[00]_[epic_name]
- 🔀 **Merged to:** dev
- 📝 **Merge Commit:** [hash]
- 🗑️ **Epic Branch Status:** [Deleted / Kept open]

### Running Application

- 🌐 Application: http://localhost:3000
- 📚 API Docs: http://localhost:3000/docs

## Commands

```bash
docker-compose up -d        # Start
docker-compose down         # Stop
docker-compose logs -f app  # Logs
```

════════════════════════════════════════════════════════════════════

Congratulations! Your product is now running locally.

**Git History:** The entire epic has been squash-merged as a single commit to dev for a clean history.
```

## State Management

Track progress in `${SPEC_ROOT}/<epic>/.build-e2e-state.json` (within the epic folder):

```json
{
  "phase": "AWAIT_PRD_EVAL",
  "workspace": "/path/to/workspace",
  "specs_folder": "/path/to/workspace/specs",
  "epic": "05_ui_search_publishing",
  "epic_path": "specs/05_ui_search_publishing",
  "git_initialized": true,
  "semver_initialized": true,
  "git": {
    "base_branch": "<integration-branch>",
    "epic_branch": "epic/05_ui_search_publishing",
    "epic_merged": false,
    "merge_commit": null,
    "feature_branches_merged": 0
  },
  "checkpoints": {
    "setup": "complete",
    "epic_select": "complete",
    "brainstorm": "complete",
    "prd": "awaiting_eval",
    "tech_spec": "pending",
    "mvp_spec": "pending",
    "engineer": "pending",
    "qa": "pending",
    "local_run": "pending"
  },
  "files": {
    "brainstorm": "specs/05_ui_search_publishing/brainstorm.md",
    "product_spec": "specs/05_ui_search_publishing/product_spec.md",
    "technical_spec": null,
    "mvp_spec": null,
    "qa_summary": "specs/05_ui_search_publishing/qa/reports/summary.json",
    "bug_report": "specs/05_ui_search_publishing/qa/bugs/bug-report.json",
    "user_test_script": "specs/05_ui_search_publishing/qa/user-test-script.md"
  },
  "qa": {
    "status": "pending",
    "fix_iterations": 0,
    "output_folder": "specs/05_ui_search_publishing/qa",
    "test_results": {
      "unit": { "passed": 0, "failed": 0, "skipped": 0 },
      "integration": { "passed": 0, "failed": 0, "skipped": 0 }
    },
    "coverage": {
      "average": null,
      "by_component": {}
    },
    "bugs": {
      "total": 0,
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "fixed": 0,
      "skipped": 0
    },
    "quality_gates": {
      "pass_rate": { "target": 100, "actual": null, "passed": false },
      "coverage": { "target": 80, "actual": null, "passed": false },
      "critical_bugs": { "target": 0, "actual": null, "passed": false }
    }
  }
}
```

**Key epic-related fields:**
- `epic`: Epic name (e.g., `05_ui_search_publishing`)
- `epic_path`: Full path to epic folder
- `files.*`: All file paths are relative to the epic folder
- `qa.output_folder`: QA artifacts go to `<epic>/qa/`

**Git branching fields:**
- `git.base_branch`: The branch to merge back to (usually the configured integration branch)
- `git.epic_branch`: The epic's dedicated branch (e.g., `epic/05_ui_search_publishing`)
- `git.epic_merged`: Whether the epic branch has been squash-merged
- `git.merge_commit`: The commit hash of the squash-merge (after completion)
- `git.feature_branches_merged`: Count of work item branches merged to epic

## QA Checkpoint States

| State                 | Description                          | Next Action             |
| --------------------- | ------------------------------------ | ----------------------- |
| `pending`             | QA not yet started                   | Run `/qa`               |
| `running`             | QA in progress                       | Wait for completion     |
| `awaiting_eval`       | QA complete, waiting for user choice | Present [A/B/C] options |
| `fix_pending`         | User chose to fix bugs               | Invoke `/engineer fix`  |
| `verification`        | Re-running `/qa fix` to verify       | Wait for verification   |
| `complete`            | All quality gates passed             | Proceed to local-run    |
| `complete_with_skips` | User skipped remaining bugs          | Proceed with warning    |

## Human Eval Checkpoints

At each checkpoint:

1. **Report progress** - What's been completed
2. **Show deliverables** - Files created/updated
3. **Explain next steps** - What will happen next
4. **Offer options:**
   - Review files
   - Make edits
   - Continue to next phase
   - Stop and resume later
5. **Wait for user input** - Don't proceed automatically

**Key phrases to listen for:**

- "continue" → Proceed to next phase
- "stop" → Save state, end session
- "skip" → Skip current phase
- "status" → Show current progress
- Other input → Treat as feedback/changes

## Behavioral Rules

| Rule                       | Application                              |
| -------------------------- | ---------------------------------------- |
| **Always checkpoint**      | Never skip human eval points             |
| **Wait for user**          | Don't auto-proceed past checkpoints      |
| **Track state**            | Always update `.build-e2e-state.json`    |
| **Report clearly**         | User always knows current status         |
| **Handle interrupts**      | Save state, allow resume                 |
| **Invoke skills properly** | Use each skill as designed               |
| **Verify runtime boots**   | QA MUST verify app actually starts       |
| **Minimal/no mocking**     | Integration tests use real dependencies  |
| **Semver required**        | Engineer must init semver if not present |
| **CI/CD required**         | Engineer must setup CI/CD pipeline       |

## Mocking Policy (CRITICAL)

**Tests that pass while `npm run dev` fails are worthless.**

### Acceptable Mocks

- External payment gateways (Stripe, PayPal)
- Email/SMS services (SendGrid, Twilio)
- Third-party OAuth providers (Google, Facebook)
- Time-sensitive operations (for deterministic tests)

### NEVER Mock

- Database operations → Use real test database
- Internal service calls → Boot actual services
- Module imports → Use real modules
- Application startup → Boot real application
- Shared packages → Use real compiled packages

## Project State Investigation

When resuming a session with `continue`, perform a **project state investigation** to ensure the build-e2e state file accurately reflects the actual project state. This is critical for sessions that may have been interrupted or where manual changes were made.

### Investigation Checklist

**When to Investigate:**
- At the start of any `continue` command
- After any phase completion before updating state
- When state file appears stale (last modified > 1 hour ago)

**What to Check:**

1. **Git Status Alignment**
   ```bash
   git status --short
   git log --oneline -5
   ```
   - Are there uncommitted changes not reflected in state?
   - Are there commits since last state update?

2. **Spec File Existence**
   ```bash
   ls <SPEC_ROOT>/<epic>/*.md
   ```
   - Does the state show files as created that don't exist?
   - Are there files that exist but aren't tracked in state?

3. **Implementation Progress**
   - For ENGINEER phase: Check if source files exist
   - Run tests to verify: `npm test` or `cargo test`
   - Check test pass/fail counts match state

4. **QA Artifacts**
   ```bash
   ls <SPEC_ROOT>/<epic>/qa/{bugs,test-cases,reports}
   ```
   - Do QA folders exist if state shows QA complete?
   - Do bug reports exist if bugs are tracked?

### State Reconciliation

**If state is behind actual progress:**
1. Inform user: "The project appears more advanced than the state file indicates"
2. List discrepancies found
3. Offer options:
   - [A] Update state to match actual project (recommended)
   - [B] Investigate specific discrepancies
   - [C] Reset state and re-run phase

**If state is ahead of actual progress:**
1. Inform user: "Some artifacts tracked in state are missing"
2. List missing items
3. Offer options:
   - [A] Re-run the incomplete phase
   - [B] Mark phase as pending and restart
   - [C] Manually create missing artifacts

**If state needs user clarification:**
1. Ask specific questions about intended state
2. Document user's answers
3. Update state accordingly

### State Investigation Output Format

```markdown
## Project State Investigation

### State File
- **Path:** <SPEC_ROOT>/<epic>/.build-e2e-state.json
- **Last Modified:** [timestamp]
- **Current Phase:** [phase]

### Verification Results

| Check | State | Actual | Status |
|-------|-------|--------|--------|
| Epic folder exists | ✓ | ✓ | ✅ |
| brainstorm.md | exists | exists | ✅ |
| product_spec.md | exists | exists | ✅ |
| technical_spec.md | null | null | ✅ |
| Tests passing | 317 | 317 | ✅ |
| Coverage | 67.73% | 67.73% | ✅ |

### Discrepancies Found
[List any discrepancies or "None found"]

### Recommendation
[Auto-proceed / Ask user / Update state]
```

### Auto-Update Triggers

The state can be auto-updated without user prompt when:
- Test counts change (automatically update test results)
- Coverage changes (automatically update coverage metrics)
- New commits are detected (note in state for reference)
- QA artifacts are created/updated (update file paths)

**Always ask user before:**
- Changing the current phase
- Marking a checkpoint complete
- Skipping or resetting a phase

## Example Session

```
User: /build-e2e

Agent: I'll guide you through the complete product development lifecycle.
       Is the current folder your workspace? [Y/N]

User: Y

Agent: Would you like to initialize Git? [Y/N]

User: Y

Agent: [Initializes git, semver]
       Specs folder path? (default: ./specs)

User: [Enter]

Agent: ✅ Workspace Setup Complete
       Ready to begin brainstorming. Type "continue" to proceed.

User: continue

Agent: [Runs /brainstorm]
       ...
       📋 CHECKPOINT: BRAINSTORM COMPLETE
       Type "continue" when ready.

User: continue

Agent: [Runs /prd, /prd-spec-review]
       ...
       📋 CHECKPOINT: PRD COMPLETE
       Type "continue" when ready.

... continues through all phases ...

Agent: 🎉 ORCHESTRATION COMPLETE
       Application running at http://localhost:3000
```

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "build-e2e" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "build-e2e" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this build-e2e run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

