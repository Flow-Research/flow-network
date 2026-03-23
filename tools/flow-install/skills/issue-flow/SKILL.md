---
name: issue-flow
description: "Use when a GitHub issue should be driven through clarification recovery, spec-build-test-QA-acceptance, and enforced human review gates with quality gates."
disable-model-invocation: true
allowed-tools: Read, Write, ApplyPatch, Grep, Glob, Bash, Question
argument-hint: "[continue|status|issue <number-or-url>]"
---

# Issue Flow

## Purpose
Drive one GitHub issue through the full Flow delivery lifecycle using the repository's existing skills, mandatory evaluation gates, and explicit human review checkpoints. GitHub Project metadata is optional enrichment, not a required intake dependency.

## Inputs
- Optional arguments: `continue`, `status`, or `issue <number-or-url>`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/issue-flow/`.

## Steps
1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/issue-flow/commands/issue-flow.md` exactly.
2. Use existing child skills rather than replacing them.
3. Persist and reconcile progress through `${SPEC_ROOT}/<epic>/.issue-flow-state.json`.
4. Do not advance phases when a required quality gate or human gate is unresolved.

## Output
- A phase-by-phase issue delivery run with artifacts, evidence, gate results, and GitHub status updates.
