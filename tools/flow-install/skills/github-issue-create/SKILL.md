---
name: github-issue-create
description: "Create a GitHub issue with structured inputs and optional project-board placement. Use when opening an issue in a target repository through the GitHub CLI."
disable-model-invocation: true
allowed-tools: Bash
argument-hint: "<owner>/<repo> \"title\" \"body\" [labels] [assignees] [milestone] [--project-owner <owner>] [--project-number <n>] [--status-field <name>] [--status-value <value>]"
---

# GitHub Issue Create

## Purpose

Create a GitHub issue in a target repository using the `gh` CLI, with explicit validation and optional project-board placement.

## Inputs

- `owner/repo` (required)
- `title` (required)
- `body` (required)
- `labels` (optional, comma-separated)
- `assignees` (optional, comma-separated)
- `milestone` (optional)
- `--project-owner <owner>` (optional)
- `--project-number <n>` (optional)
- `--status-field <name>` (optional; defaults to `Status` when project placement is used)
- `--status-value <value>` (optional; for example `Backlog`)

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/github-issue-create/`.

## Steps

1. Follow the command contract in `${AGENTS_SKILLS_ROOT}/github-issue-create/commands/github-issue-create.md`.
2. Validate required inputs and verify `gh` is installed and authenticated.
3. Confirm repo access before attempting creation.
4. Create the issue with the requested optional labels/assignees/milestone.
5. Only attempt project-board placement when project-owner/number inputs are explicitly supplied.
6. When project placement is requested, optionally set a status field/value if provided.
7. Return the issue URL/number and any project item details that were successfully set.

## Output

- issue URL and number
- optional project item metadata when project placement was requested
