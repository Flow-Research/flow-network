---
description: Safe repository sync with deterministic planning, guarded writes, and bounded PR resolution
argument-hint: "[pull|push|status|plan|sync] [--remote <name>] [--branch <name>] [--dry-run]"
---

# Context Sync Command

Provide a deterministic repository sync flow for both technical and non-technical users.

Primary user intents:
1) `pull`: safely update the current branch from a selected remote branch.
2) `push`: safely publish local changes, create or reuse a PR, and keep working until the PR reaches a terminal success state or an explicit safe escalation state.

Default target branch is the repository integration branch from `.flow/delivery-profile.json` when present; otherwise fall back to `dev`.

When running inside an issue-flow worktree, context-sync auto-detects the issue context and adjusts defaults — pulling/pushing against the issue's base branch instead of the integration branch, enriching commit messages with the issue reference, and handling state file conflicts interactively.

Legacy compatibility:
- `sync` remains supported as an alias for `push`.
- Prefer `pull` and `push` in summaries, examples, and help text.

## User Request

$ARGUMENTS

## Safety Invariants

These rules are mandatory.

1. Never force push.
2. Never push local work directly to protected branches such as `main` or the active integration branch.
3. Never use destructive cleanup commands such as `git reset --hard`, `git checkout --`, or `git clean -fd`.
4. Never auto-stage everything with `git add -A`.
5. Never auto-commit secret candidates, ignored files, unknown binaries, or files outside the eligible change set.
6. Never continue if Git is already in the middle of a merge, rebase, cherry-pick, revert, or bisect.
7. Never silently discard local changes. If a stash is created, report it and either restore it or stop with recovery guidance.
8. Never leave a failed PR unattended after `push`. Either the autonomous PR-resolution loop starts successfully, or the command ends in an explicit safe escalation state.
9. Never claim success without fresh verification evidence.

## Mode Semantics

- `status`: local-only analysis. Do not run `git fetch`. Do not write to the working tree, index, refs, or `.git/context-sync/`.
- `plan`: local-only planning. Do not run `git fetch`. Do not write to the working tree, index, refs, or `.git/context-sync/`.
- `pull`: write-capable sync. Network and git-history changes are allowed only after preflight passes.
- `push`: write-capable publish flow. Network, branch creation, commit creation, PR creation, and the bounded PR-resolution loop are allowed only after preflight passes.
- `sync`: treat as `push`.

If no subcommand is provided:
- default to `pull`
- report that default explicitly in the summary

## Persistent Run Ledger

`push` creates or resumes a deterministic run ledger inside:

```text
.git/context-sync/runs/<sanitized-push-branch>.json
```

Sanitize the branch name deterministically before using it as a filename:
- lowercase the branch name
- replace `/` with `__`
- replace any remaining non `[a-z0-9._-]` characters with `_`
- append `.json`

Example:

```text
feat/api/refactor-auth -> .git/context-sync/runs/feat__api__refactor-auth.json
```

The ledger must capture at minimum:
- `run_id`
- `intent`
- `target_remote`
- `target_branch`
- `push_remote`
- `push_branch`
- `protected_branch_guard`
- `created_safety_branch`
- `pr_number`
- `pr_url`
- `loop_state`
- `last_blocker`
- `last_ci_run_id`
- `autonomous_attempts`
- `last_fix_commit`
- `terminal_status`
- `terminal_reason`

Determinism rules:
- Reuse the existing ledger when the same branch already has an active non-terminal run.
- Reuse the existing PR when the same `head` and `base` already map to an open PR.
- Reuse the same safety branch if the ledger already created one for the current run.

`status` and `plan` must not create or mutate the ledger.

## Branch And Remote Resolution

Resolve the target in this order:

1. If the user passed `--remote` and `--branch`, use them.
2. Else if the user referenced a branch in natural language or command arguments, use that branch with `origin` unless a remote was explicitly provided.
3. Else default to:

```text
TARGET_REMOTE=origin
TARGET_BRANCH=<integration-branch>
```

Resolve the current branch:

```bash
git rev-parse --abbrev-ref HEAD
```

If the result is `HEAD`, abort with guidance to check out a branch first.

Resolve the push source branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name "@{u}"
```

If upstream exists:
- `PUSH_REMOTE` and `PUSH_BRANCH` come from upstream.

Resolve the GitHub PR repository for `push` operations in this order:
1. If upstream exists, use the upstream remote URL.
2. Else use `TARGET_REMOTE`.
3. Normalize that remote to a GitHub repo slug and store it as `PR_REPO=<owner>/<repo>`.

All `gh pr *` commands in `push` and the PR-resolution loop must pass:

```text
-R "$PR_REPO"
```

If upstream does not exist:
- `PUSH_REMOTE=origin`
- `PUSH_BRANCH=<current-branch>`
- allow upstream creation later during `push`

Protected branch guard:
- Protected branches are `main` and `dev`.
- If `push` or `sync` is invoked while `PUSH_BRANCH` is protected and local work would be published, create or reuse a deterministic safety branch:

```text
SAFE_BRANCH=sync/<current-branch>
```

- Prefer reusing `SAFE_BRANCH` if it already exists locally or in the run ledger.
- Never generate timestamp-only branch names for the same logical run unless the prior safety branch is unusable and that reason is recorded in the ledger.

## Issue-Flow Context Detection

After resolving the branch and remote, detect whether this checkout is an active issue-flow worktree. This is a non-blocking enrichment step — issue-flow absence is never a blocker.

### Detection steps

1. Check if this is a linked worktree:

```bash
COMMON_DIR=$(git rev-parse --git-common-dir)
GIT_DIR=$(git rev-parse --git-dir)
```

If `COMMON_DIR != GIT_DIR`, set `IS_WORKTREE=true`.

2. Search for a matching `.issue-flow-state.json`. Resolve the spec root in this order:
   - `BUILD_E2E_SPEC_ROOT` environment variable (if set)
   - `.jarvis/context/specs/` (if exists)
   - `specs/` (if exists)

   Search all subdirectories of the spec root for `.issue-flow-state.json` files. For each found file, read the JSON and check if `git.branch` matches the current branch name.

3. If no state file matched but the current branch matches the pattern `<digits>_<slug>` (e.g., `113_program-team-selection`), set as a soft signal. This adjusts the target branch default to `main` but does not activate full issue-flow awareness (no issue number, no commit enrichment).

4. Store the result as `ISSUE_FLOW_CONTEXT`:

```text
active: <true if state file found and matched, false otherwise>
issue_number: <from state.issue.number, or null>
issue_url: <from state.issue.url, or null>
base_branch: <from state.git.base_branch, or "main" for soft signal>
phase_id: <from state.phase.id, or null>
phase_name: <from state.phase.name, or null>
state_file_path: <relative path to matched state file, or null>
is_worktree: <true if linked worktree>
```

Read only these fields from the state file: `issue.number`, `issue.url`, `git.branch`, `git.base_branch`, `phase.id`, `phase.name`. Do not depend on other fields.

### Target branch override

When `ISSUE_FLOW_CONTEXT.active` is true (or soft signal matched) and the user did NOT pass an explicit `--branch`:
- Override `TARGET_BRANCH` to `ISSUE_FLOW_CONTEXT.base_branch`
- Log: `"Issue-flow detected (#<number>, Phase <id>). Target branch: <base_branch>"`
- For soft signal: `"Issue-flow branch pattern detected. Target branch: main"`

This override applies to both `pull` and `push` flows. It ensures the issue branch rebases from and targets its actual base branch, not the integration branch — minimizing conflicts from unrelated work.

The user can always override with `--branch <name>`.

## Preflight Blockers

Abort before any write operation when any of the following is true:
- not a git repository
- detached HEAD
- missing remote
- missing target branch for `pull`
- ongoing merge, rebase, cherry-pick, revert, or bisect
- unmerged entries in the index
- missing `gh` CLI for `push`
- missing GitHub authentication for PR operations in `push`
- missing local verification tooling required by the configured verification profile

Suggested Git checks:

```bash
git rev-parse --show-toplevel
git rev-parse --git-common-dir
git rev-parse --git-dir
git status --porcelain -uall
git ls-files -u
git rev-parse --git-path MERGE_HEAD
git rev-parse --git-path CHERRY_PICK_HEAD
git rev-parse --git-path REVERT_HEAD
git rev-parse --git-path rebase-merge
git rev-parse --git-path rebase-apply
git rev-parse --git-path BISECT_LOG
git remote get-url "$TARGET_REMOTE"
gh auth status
```

If any blocker is present, stop with:
- `status=aborted`
- `failed_step=preflight`
- `abort_reason=<specific reason>`
- 1-3 recovery commands

## Eligible Change Set

Build the eligible publish set deterministically.

Tracked changes:

```bash
git diff --name-only
git diff --cached --name-only
```

Untracked non-ignored files:

```bash
git ls-files --others --exclude-standard
```

Never auto-stage files matching secret or credential patterns, including:
- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `*.p12`
- `*.pfx`
- `id_rsa`
- `id_ed25519`
- `credentials.json`
- files whose basename contains `secret`, `token`, `credential`, or `private`

Never auto-stage ignored files.

Never auto-stage binary files. Determine binary status with a deterministic check, for example by requiring the file to be UTF-8 decodable text or to match the allowed-text-extension list below.

If any forbidden candidate exists in the working tree, abort before staging and report the exact files.

Eligible untracked files may be auto-staged only if they match this allowlist exactly:
- `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`
- `*.py`, `*.rb`, `*.go`, `*.rs`, `*.java`, `*.kt`, `*.swift`, `*.php`
- `*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.md`, `*.txt`, `*.sh`

If the untracked set contains anything else, abort with a safe-review message instead of guessing.

## Verification Profile

Use the repository verification profile before any publish attempt.

Default profile for this repository:

```bash
pnpm skills:validate && pnpm turbo lint && pnpm turbo test && pnpm turbo build --filter='!coach'
```

Rules:
- Run verification after the branch-sync step and before any push.
- If verification fails, stop before push.
- If the PR-resolution loop makes an autonomous fix, rerun the full profile before the next push.
- Record every verification command and outcome in the ledger and final summary.

## Status Flow

Run local-only analysis and report:
- current branch
- target remote and branch
- push remote and branch
- whether a safety branch would be required
- whether a ledger already exists for this branch
- eligible tracked change count
- eligible untracked change count
- forbidden candidate count
- whether the branch has an upstream
- whether local blockers exist
- issue-flow context status:
  - if active: issue number, phase, base branch, target override
  - if worktree detected but no state file: `inactive`
  - if neither: `not_detected`

Do not run `git fetch`.
Do not create or modify the ledger.

## Plan Flow

Run the same local-only analysis as `status`, then print the exact ordered command plan that `pull` or `push` would execute from the current local state.

Rules:
- Base the plan on local refs only.
- If remote freshness is unknown, say so explicitly instead of fetching.
- Do not create or modify the ledger.

## Pull Flow

Use this flow when the user wants the latest remote changes locally.

1. Run preflight.
2. Resolve the remote branch exists:

```bash
git ls-remote --heads "$TARGET_REMOTE" "$TARGET_BRANCH"
```

3. If the working tree is dirty, create a named temporary stash that includes untracked files:

```bash
STASH_NAME="context-sync-autostash"
git stash push -u -m "$STASH_NAME"
```

4. Rebase only onto the selected target branch. Do not rebase through `main -> dev -> target` chains by default.

```bash
git fetch "$TARGET_REMOTE" "$TARGET_BRANCH"
git rebase "$TARGET_REMOTE/$TARGET_BRANCH"
```

5. If a stash was created, restore it only after the rebase succeeds:

```bash
git stash pop "stash^{/$STASH_NAME}"
```

6. On rebase conflict:
   a. Check which files are in conflict:

   ```bash
   git diff --name-only --diff-filter=U
   ```

   b. If `ISSUE_FLOW_CONTEXT.active` is true and ALL conflicting files match `**/.issue-flow-state.json` (no other files in conflict):
      - Pause and present the user with a choice:

      ```text
      Rebase conflict in .issue-flow-state.json

      This is the issue-flow state file — it tracks your issue's progress.
      The remote branch has a different version. How would you like to resolve?

        1. Keep mine (recommended) — Keep your local state. Issue-flow will
           reconcile automatically on its next run.
        2. Accept theirs — Use the remote version. Your local progress
           markers may need re-verification.
        3. Abort rebase — Cancel the pull entirely. No changes made.
      ```

      - After user chooses:
        - Option 1: `git checkout --ours <files> && git add <files> && git rebase --continue`
        - Option 2: `git checkout --theirs <files> && git add <files> && git rebase --continue`
        - Option 3: `git rebase --abort`, restore stash if applicable, stop

   c. If ANY non-state-file is also in conflict, or if issue-flow context is not active: run `git rebase --abort`, preserve the stash, and stop with recovery guidance.

7. On stash-restore conflict, keep the rebased branch intact, report conflicting files, and stop.

Return a concise summary with:
- pulled from `<TARGET_REMOTE>/<TARGET_BRANCH>`
- whether local work remains dirty
- whether a stash was created and restored

## Push Flow

Use this flow when the user wants to publish local changes and keep the PR moving until it resolves or safely escalates.

### Step 1: Run preflight and create or resume the ledger

- Run preflight.
- Resolve or create the deterministic ledger for this branch.
- If a safety branch is required, switch to it before any publish action and update the ledger.

### Step 2: Protect local changes if needed

If the working tree is dirty before branch sync, create a deterministic temporary stash:

```bash
STASH_NAME="context-sync-autostash"
git stash push -u -m "$STASH_NAME"
```

### Step 3: Sync with the current working branch remote

First check if the push branch exists remotely:

```bash
git ls-remote --heads "$PUSH_REMOTE" "$PUSH_BRANCH"
```

If the push branch exists remotely and is not protected:

```bash
git pull --rebase "$PUSH_REMOTE" "$PUSH_BRANCH"
```

If the push branch does not exist remotely (e.g., it was deleted after a PR merge), skip this step entirely and continue. The branch will be created fresh on push with `-u`.

If the branch-sync step conflicts:
- run `git rebase --abort`
- **immediately restore the stash** if one was created (do not leave changes stuck in stash)
- stop before staging or pushing

**Safety rule**: Steps 2 (stash), 3 (sync), and 4 (restore) must each be executed as separate operations. Never chain them in a single command — if sync fails after stashing, the stash must be restored before reporting the error.

### Step 4: Restore the stash if one was created

Restore it only after the branch-sync step succeeds:

```bash
git stash pop "stash^{/$STASH_NAME}"
```

If stash restore conflicts, stop before staging or pushing.

### Step 5: Compute and stage only the eligible change set

Never use `git add -A`.

Stage tracked changes with:

```bash
git add -u -- <eligible-tracked-files>
```

Stage eligible untracked text files with:

```bash
git add -- <eligible-untracked-files>
```

If no eligible staged changes remain after filtering:
- if an open PR already exists for this branch, set `PUBLISH_MODE=noop_pr_only`, skip commit creation, skip `git push`, and continue directly to PR management for the existing PR
- otherwise stop with `status=aborted`, `failed_step=staging`, and `abort_reason=no_eligible_publishable_changes`

### Step 6: Verify locally

Run the configured verification profile.

If verification fails:
- stop before commit and push
- record the blocker in the ledger
- return `status=aborted`

### Step 7: Create the commit if needed

Collect staged metadata:

```bash
git diff --cached --name-only
git diff --cached --numstat -M
git diff --cached --name-status -M
git diff --cached --shortstat
```

Build a conventional commit message with fixed type and scope:

```text
chore(sync): <deterministic subject>
```

Subject algorithm:
- if every staged file is under `.agents/skills/context-sync/`, use `chore(sync): update context-sync workflow`
- else if every staged file is docs-like (`*.md`, `*.txt`), use `chore(sync): update repository documentation`
- else if every staged file is config-like (`*.json`, `*.yaml`, `*.yml`, `*.toml`, `package.json`, `pnpm-lock.yaml`, `turbo.json`), use `chore(sync): update repository configuration`
- else use `chore(sync): update repository changes`

Do not invent a more specific subject unless the staged-file pattern matches one of the rules above exactly.

Issue reference: when `ISSUE_FLOW_CONTEXT.active` is true and `issue_number` is available, append `(#<issue_number>)` to the subject. Example: `chore(sync): update repository changes (#123)`. This creates a GitHub auto-link to the issue.

Create the commit only when staged changes exist:

```bash
git commit -m "<subject>" -m "<body>"
```

### Step 8: Push the branch

If `PUBLISH_MODE=noop_pr_only`, skip branch push entirely and record `push=skipped`.

If upstream already exists:

```bash
git push "$PUSH_REMOTE" "$PUSH_BRANCH"
```

If upstream does not exist:

```bash
git push -u "$PUSH_REMOTE" "$PUSH_BRANCH"
```

Do not rerun the entire push flow automatically just to confirm upstream. Upstream creation is complete once `git push -u` succeeds.

### Step 9: Create or reuse the PR deterministically

Let:
- `PR_BASE=$TARGET_BRANCH`
- `PR_HEAD=$PUSH_BRANCH`

If `PR_HEAD == PR_BASE`, skip PR creation and stop with `pr=skipped_already_on_target`.

Look for an existing open PR first:

```bash
gh pr list -R "$PR_REPO" --state open --head "$PR_HEAD" --base "$PR_BASE" --json number,url,state,isDraft
```

If an open PR exists for the same `head` and `base`:
- reuse it
- record `pr=updated_existing`

If no open PR exists, create one:

```bash
gh pr create -R "$PR_REPO" --base "$PR_BASE" --head "$PR_HEAD" --fill
```

When creating a new PR and `ISSUE_FLOW_CONTEXT.active` is true with `issue_number` available, append `Closes #<issue_number>` to the PR body using `--body` or by amending after `--fill`. Do not add this when reusing an existing PR.

If PR creation fails, stop with `pr=creation_failed` and keep the branch pushed.

## PR Resolution Loop

After `push` creates or reuses a PR, the workflow must attach a bounded autonomous PR-resolution loop.

This loop may run inline if resolution is immediate, or as a durable background task if the PR requires waiting on CI or review.

### Loop Contract

The loop owns the branch and PR until one of these terminal states occurs:
- `merged`
- `auto_merge_armed_and_green`
- `closed_by_user`
- `escalated_manual_review`
- `retry_budget_exhausted`
- `auth_or_permission_lost`
- `unsafe_change_required`

If the loop cannot start successfully, `push` is not complete. Report that as an escalation, not a success.

### Autonomous Scope

The loop may handle only clearly mechanical blockers by default:
- failed lint
- failed format or generated-file drift
- deterministic CI config issues
- deterministic test failures that can be fixed confidently and verified locally
- stale branch that needs a safe rebase with no conflicts

The loop must escalate instead of guessing when it encounters:
- requested changes with ambiguous product intent
- security-sensitive diffs
- large refactors
- merge conflicts requiring judgment
- contradictory review comments
- repeated non-deterministic failures

### Retry Budget

Use bounded retries:

```text
MAX_AUTONOMOUS_ATTEMPTS=5
MAX_REPEATED_BLOCKER_ATTEMPTS=3
```

Rules:
- increment `autonomous_attempts` only when the loop creates a new fix commit or a new rebase/push attempt
- if the same blocker signature repeats 3 times, escalate
- if total autonomous attempts reaches 5 without terminal success, escalate

### Loop Steps

1. Observe PR state and latest checks:

```bash
gh pr view -R "$PR_REPO" <number> --json number,url,state,mergeStateStatus,reviewDecision,statusCheckRollup,isDraft
```

2. Classify the current blocker as one of:
- `waiting_for_ci`
- `mechanical_ci_failure`
- `waiting_for_review`
- `requested_changes_ambiguous`
- `merge_conflict`
- `ready_to_merge`
- `closed`

3. Act by blocker class:
- `waiting_for_ci`: keep watching
- `mechanical_ci_failure`: create or resume a fix task, apply the fix, rerun full local verification, push, then loop
- `waiting_for_review`: keep watching until review changes state or an SLA threshold is hit; do not spam commits
- `requested_changes_ambiguous`: escalate safely
- `merge_conflict`: attempt a safe rebase only if the conflict is absent; otherwise escalate
- `ready_to_merge`: merge or arm auto-merge if allowed
- `closed`: stop and mark `closed_by_user`

4. Merge path:
- prefer enabling auto-merge when the repository supports it and all required checks are green
- otherwise merge only when branch protection requirements are satisfied

Suggested commands:

```bash
gh pr merge -R "$PR_REPO" <number> --auto --squash
gh pr merge -R "$PR_REPO" <number> --squash
```

Only use one merge command that matches the repository policy and current PR state.

### Durable Background Task

If the PR is not immediately terminal, start a durable background task that keeps the loop active.

Preferred implementation:
- use `Task`
- point it at the same branch, PR number, ledger path, and retry budget
- record the background task id in the ledger and final summary

The summary must clearly say whether responsibility was transferred to the background loop.

## Evaluation Contract

The skill is only acceptable if all of the following stay true:
- `status` and `plan` stay local-only
- no forbidden git commands are used
- no blanket staging commands are used
- PR reuse happens before PR creation
- the bounded PR-resolution loop has explicit terminal states and retry budgets
- every abort path reports a specific reason and recovery commands

Use the companion references in `references/` and the mechanical evaluator in `scripts/evaluate-context-sync.mjs` to validate regressions.

## Final Summary Format

Always end with a concise machine-readable block:

```text
status: <success|aborted|conflict|escalated>
intent: <pull|push>
target: <TARGET_REMOTE>/<TARGET_BRANCH>
push_target: <PUSH_REMOTE>/<PUSH_BRANCH>
protected_branch_guard: <none|created_safety_branch|reused_safety_branch|would_create_safety_branch>
ledger: <created|resumed|none>
commit: <created|none>
push: <completed|skipped>
pr: <created|updated_existing|creation_failed|skipped_already_on_target|not_attempted>
pr_loop: <inline_terminal|background_started|failed_to_start|not_started>
pr_terminal: <merged|auto_merge_armed_and_green|closed_by_user|escalated_manual_review|retry_budget_exhausted|auth_or_permission_lost|unsafe_change_required|not_terminal>
working_tree: <clean|dirty>
issue_flow: <active|inactive|not_detected>
issue_flow_issue: <#number|none>
issue_flow_target_override: <branch|none>
```

If the flow aborts or escalates, include:
- `failed_step`
- `abort_reason` or `escalation_reason`
- `recovery_commands`
