# Context Sync Acceptance Contract

This skill is acceptable only when all of the following remain true.

## Safety

- `status` and `plan` are local-only and do not mutate the working tree, index, refs, or `.git/context-sync/`.
- `pull` and `push` never use force push.
- `push` never publishes directly to `main` or `dev`.
- `push` never uses blanket staging commands.
- `push` never auto-commits secret candidates, ignored files, or unknown binary files.
- every abort path preserves user work and explains recovery.

## Determinism

- branch, remote, PR, and safety-branch resolution follow a fixed precedence order.
- `push` reuses a single sanitized ledger path per managed branch.
- `push` reuses an existing open PR before creating a new one.
- rerunning the same logical flow from the same branch reuses the same safety branch and PR whenever possible.
- PR operations are pinned to a deterministic `PR_REPO`.
- commit subject generation follows an explicit fixed algorithm.

## PR Resolution Loop

- the loop has explicit terminal states.
- the loop has explicit retry budgets.
- the loop escalates instead of guessing when product intent or review guidance is ambiguous.
- a failed PR is either still owned by the loop or explicitly escalated with a reason and handoff.

## Required Terminal States

- `merged`
- `auto_merge_armed_and_green`
- `closed_by_user`
- `escalated_manual_review`
- `retry_budget_exhausted`
- `auth_or_permission_lost`
- `unsafe_change_required`

## Forbidden Patterns

- `git add -A`
- `gh pr view --base`
- `git push --force`
- `git reset --hard`
- `git checkout --`
