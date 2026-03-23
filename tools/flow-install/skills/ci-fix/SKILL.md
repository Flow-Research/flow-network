---
name: ci-fix
description: "Iteratively diagnose and fix failing GitHub Actions runs until CI passes or a safe escalation point is reached. Use when a branch has failing CI and an automated fix loop is acceptable."
disable-model-invocation: true
allowed-tools: Bash, Read, Write, ApplyPatch, Grep, Glob
argument-hint: "[--max-attempts N] [--dry-run] [--classify-only] [--no-push]"
---

# CI Fix

## Purpose

Automatically diagnose and fix GitHub Actions CI failures in a bounded loop until tests pass or the workflow must safely escalate to a human.

## Inputs

- `--max-attempts N`: maximum fix attempts, default 3
- `--dry-run`: show what would be done without making changes
- `--classify-only`: classify failures without attempting fixes
- `--no-push`: allow local fixes/commits without pushing

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/ci-fix/`.

## Steps

1. Resolve the current failing run on the active branch, or stop if CI is already green.
2. Use `${AGENTS_SKILLS_ROOT}/ci-logs/commands/ci-logs.md` behavior to gather structured failure details.
3. Classify failures into lint, type, test, build, dependency, config, or infrastructure buckets.
4. Apply only bounded, explainable fixes. Retry infrastructure/transient failures instead of inventing code changes.
5. If `--classify-only` is set, return the taxonomy and suggested next action without editing files.
6. If changes are made, stage the eligible change set, create a descriptive `fix(ci): ...` commit, and push unless `--no-push` is set.
7. Use `ci-watch` to wait for the rerun result.
8. Stop when CI passes, the attempt budget is exhausted, or the failure is unsafe to automate.

## Output

- attempt-by-attempt summary of failures, fixes, reruns, and outcomes
- final status: fixed, escalated, or classify-only
- commit hash and run URL when applicable
