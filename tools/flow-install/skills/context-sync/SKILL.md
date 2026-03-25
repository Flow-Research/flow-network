---
name: context-sync
description: "Safe repo pull/push workflow that targets the repository integration branch, uses deterministic planning, and keeps PRs moving with a bounded autonomous resolution loop."
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Write, Task
argument-hint: "[pull|push|status|plan|sync] [--remote <name>] [--branch <name>] [--dry-run]"
---

# Context Sync

## Purpose
Provide a safe, repeatable, non-technical-friendly way to either:
- pull the latest repository changes from the active integration branch (or a referenced branch), or
- push local repository changes by safely creating/updating a branch, opening or reusing a PR to the integration branch (or a referenced branch), and keeping that PR moving until it resolves successfully or safely escalates.

The command should feel simple for non-technical users while still preserving protected-branch, secret-handling, and conflict-safety rules.

## Inputs
- Optional subcommand: `pull`, `push`, `status`, `plan`, or legacy alias `sync`
- Optional flags: `--remote <name>`, `--branch <name>`, `--dry-run`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/context-sync/`.

## Steps
1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/context-sync/commands/context-sync.md` exactly.
2. Keep `status` and `plan` local-only and deterministic. They must not run `git fetch` or mutate the repository.
3. Default branch targeting must be simple:
   - if the user references a branch, use it
   - if running inside an issue-flow worktree with a matching `.issue-flow-state.json`, default to the issue's base branch (minimizes conflicts by avoiding unrelated work from the integration branch)
   - otherwise prefer the repository integration branch from `.flow/delivery-profile.json`
   - if no integration branch is configured, fall back to `dev`
4. `pull` should fetch only when needed for the selected target branch, then safely rebase local work onto that target branch only.
5. `push` should use a deterministic publish flow: sync the working branch with its remote branch, stage only the eligible change set, verify locally, commit, push, and create or reuse the PR.
6. Prefer pushing from the user's current non-protected working branch when it already exists remotely; first sync that remote working branch locally before attempting the final push.
7. Prevent direct local-change pushes to `main` and `dev` by switching to a deterministic safety branch during write flows.
8. Before the final push, always run full repository verification that mirrors CI as closely as practical, and report the exact commands and outcomes in the summary.
9. If the working tree is dirty before a rebase, protect those changes first with a named temporary stash, then restore them only after the branch-sync step completes.
10. If merge, rebase, or stash-restore conflicts occur, do not leave non-technical users stranded.
   - Explain in plain English what happened.
   - Show which files are in conflict.
   - Offer a safe guided recovery path.
   - For non-technical users, default to pausing the sync and offering an assisted conflict-resolution follow-up instead of expecting manual git expertise.
11. Generate commit messages from the actual staged eligible change set and repository context. When issue-flow is active, append the issue reference (e.g., `(#123)`) to the commit subject.
12. When issue-flow is active and creating a new PR, include `Closes #<issue_number>` in the PR body.
13. When a rebase conflict involves only `.issue-flow-state.json` files, ask the user how to resolve (keep mine / accept theirs / abort) instead of aborting immediately.
14. After `push`, automatically create or reuse the PR for the selected target branch without rebasing onto `dev` as part of the normal push flow.
15. After PR creation or reuse, start or resume a bounded autonomous PR-resolution loop.
16. The PR-resolution loop must keep ownership until the PR reaches a terminal success state or an explicit safe escalation state. No failed PR may be left unattended.
17. Use a persistent run ledger inside `.git/context-sync/` for `push` so retries, watcher restarts, and follow-up fixes remain deterministic.

## Output
- Friendly sync summary including user intent (`pull` or `push`), selected remote/branch, actions performed, commit message used, and final status.
- Include protected-branch guard outcome and any generated safety branch.
- Include whether a PR to the selected target branch was created, updated existing, or why creation could not be completed.
- Include whether the PR-resolution loop finished inline, transferred to a background task, or safely escalated.
- Include issue-flow detection status and any target branch overrides when active.
