---
name: ci-rerun
description: "Re-run GitHub Actions workflow runs, either fully or only failed jobs. Use when retrying flaky CI or re-triggering a run after a fix."
disable-model-invocation: true
allowed-tools: Bash
argument-hint: "[--run <id>] [--failed-only] [--with-debug] [--watch]"
---

# CI Rerun

## Purpose

Re-run GitHub Actions workflows safely, either entirely or just failed jobs, without baking in repository-specific assumptions.

## Inputs

- `--run <id>`: workflow run ID to re-run; defaults to the latest run on the current branch
- `--failed-only`: only re-run failed jobs
- `--with-debug`: enable debug logging for the re-run
- `--watch`: watch the re-run after triggering it

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/ci-rerun/`.

## Steps

1. Resolve the target run ID.
2. Use the command contract at `${AGENTS_SKILLS_ROOT}/ci-rerun/commands/ci-rerun.md`.
3. Re-run the full workflow or only failed jobs through the GitHub Actions API.
4. Confirm the new run is queued or in progress.
5. If `--watch` is set, hand off to `ci-watch`.

## Output

- re-run confirmation with mode, run ID, and URL
- clear error when the run is already active or cannot be re-triggered
