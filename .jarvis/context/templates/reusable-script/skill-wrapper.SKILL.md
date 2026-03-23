---
name: <skill-name>
description: "Wrap a deterministic script for agent targeting."
disable-model-invocation: true
allowed-tools: Read, Bash
argument-hint: "[args]"
---

# <Skill Name>

## Purpose

Call the deterministic script at `<script-path>` without re-implementing its business logic.

## Inputs

- Script arguments

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/<skill-name>/`.

## Steps

1. Read the command contract at `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/<file-name>.md`.
2. Validate that the requested operation maps to the documented script behavior.
3. Execute the script at `<script-path>` with the appropriate arguments.
4. Prefer `--json` when machine-readable output is needed.
5. Return the script output without duplicating decision-making in the skill.

## Deterministic Logic (Scripts)

- Source of truth: `<script-path>`
- Input contract: documented in the command contract
- Output contract: human mode and `--json`

## Output

- The underlying script's stdout/stderr and exit semantics.
