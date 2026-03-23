# Context Sync Evaluation Process

Use this process whenever the skill changes.

## Evaluation Dimensions

1. Safety
2. Determinism
3. Idempotence
4. Recovery
5. PR lifecycle ownership
6. Observability

## Mechanical Gate

Run:

```bash
node .agents/skills/context-sync/scripts/evaluate-context-sync.mjs
```

This checks for required structures and known forbidden command patterns.

## Scenario Matrix

Run a qualitative review against these scenarios:

### Planning Modes

- `status` on a clean branch
- `status` on a dirty branch with untracked files
- `plan` on a protected branch with local changes
- verify both modes remain local-only

### Pull

- clean branch rebased onto `dev`
- dirty branch requiring a stash
- rebase conflict
- stash-restore conflict

### Push

- feature branch with upstream and clean verification
- feature branch without upstream
- current branch is `dev` and requires a safety branch
- forbidden secret candidate in working tree
- no eligible publishable files and no existing PR
- no eligible publishable files and an existing open PR, resulting in `noop_pr_only`
- verification failure before push
- existing open PR is reused
- PR operations are pinned to the correct repository slug
- PR creation fails due to auth or network

### PR Resolution Loop

- CI passes immediately
- CI fails with a clearly mechanical error and is fixed once
- the same blocker repeats until retry budget exhaustion
- review requests changes with ambiguous product intent
- PR is closed by the user while the loop is active
- merge or auto-merge succeeds

## Acceptance Gate

Do not promote the skill if any of these are false:

- mechanical gate passes
- no forbidden patterns remain
- `status` and `plan` are still local-only
- PR reuse happens before PR creation
- the loop has bounded retries and explicit escalation paths
- terminal states and final summaries are explicit

## Recommended Review Pattern

1. Run the mechanical gate.
2. Re-read `commands/context-sync.md` against `acceptance-contract.md`.
3. Run an independent read-only audit.
4. Only then adjust manifest status or publish broadly.
