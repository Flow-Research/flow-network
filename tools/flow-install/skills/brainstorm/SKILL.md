---
name: brainstorm
description: "Collaborative brainstorming facilitator that develops raw ideas into well-defined concepts."
disable-model-invocation: true
allowed-tools: Read, Write, ApplyPatch, Grep, Glob, WebSearch
argument-hint: "[resume] or start fresh"
---

# Brainstorm

## Purpose
Develop raw ideas into well-defined concepts through thoughtful questioning and structured exploration, including explicit strategic fit when a standard `docs/strategy/` folder or business thesis exists.

## Inputs
- Optional argument: `resume` to continue an existing brainstorm
- Otherwise, start a new session from the user’s idea

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/brainstorm/`.

## Steps
1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/brainstorm/commands/brainstorm.md` exactly.
2. Use `templates/brainstorm.md` as the output template when generating `brainstorm.md`.
3. Write output files to the user-specified location.

## Output
- `brainstorm.md` created in the target folder using the template.
