---
name: ci-watch
description: "Monitor a GitHub Actions workflow run and report status until completion or timeout. Use when waiting for CI to finish or polling the latest run on a branch."
disable-model-invocation: true
allowed-tools: Bash, Read
argument-hint: "[--run <id>] [--branch <name>] [--poll <seconds>] [--timeout <seconds>] [--json]"
---

# CI Watch

## Purpose

Monitor GitHub Actions workflow runs and report their status without assuming one repository workflow layout.

## Inputs

- `--run <id>`: specific workflow run ID to watch
- `--branch <name>`: watch the latest run on a branch; defaults to the current branch
- `--poll <seconds>`: polling interval, default 10
- `--timeout <seconds>`: max wait time, default 600
- `--json`: emit structured JSON

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/ci-watch/`.

## Steps

1. Resolve the workflow run ID.
2. Use the command contract at `${AGENTS_SKILLS_ROOT}/ci-watch/commands/ci-watch.md`.
3. Poll the GitHub Actions run API at the requested interval.
4. Stop when the run completes or the timeout is reached.
5. Return a final status summary or JSON payload.

## Output

- human-readable status updates and final conclusion
- optional JSON payload with status, conclusion, run ID, URL, and duration
