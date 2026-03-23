---
name: ci-logs
description: "Download and parse GitHub Actions logs to identify failures. Use when diagnosing a failed GitHub Actions workflow run or extracting failing job/step details."
disable-model-invocation: true
allowed-tools: Bash, Read, Write
argument-hint: "[--run <id>] [--job <name>] [--failed-only] [--output <path>] [--json]"
---

# CI Logs

## Purpose

Download GitHub Actions workflow logs and extract failure information without assuming a repository-specific workflow layout.

## Inputs

- `--run <id>`: workflow run ID (required)
- `--job <name>`: filter to a specific job name
- `--failed-only`: only show failed jobs/steps
- `--output <path>`: save logs to file instead of stdout
- `--json`: emit structured JSON

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/ci-logs/`.

## Steps

1. Validate that `--run` is provided.
2. Use the command contract at `${AGENTS_SKILLS_ROOT}/ci-logs/commands/ci-logs.md`.
3. List jobs for the run via `gh api` and optionally filter to failures.
4. Download the relevant job logs with `gh run view --log`.
5. Parse the logs to identify failed step names, primary error messages, and file/line references when available.
6. Return a concise summary or structured JSON.

## Output

- human-readable failure summary by job/step
- optional JSON payload with run ID, failed jobs, and extracted error metadata
