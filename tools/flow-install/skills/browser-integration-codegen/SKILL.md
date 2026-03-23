---
name: browser-integration-codegen
description: "Generate browser integration suites from Flow regression artifacts using profile-driven routes, fixtures, and helper imports."
disable-model-invocation: false
allowed-tools: Read, Write, Grep, Glob, Bash, ApplyPatch
argument-hint: "[--suite <NN>] [--profile .flow/delivery-profile.json] [--delta] [--inspect-first]"
---

# Browser Integration Codegen

## Purpose

Generate Playwright-style browser integration suites from structured browser regression scenarios while keeping selector discovery and project adapters explicit and portable.

## Required contract

- browser regression artifact path from `.flow/delivery-profile.json`
- browser suite names, fixture mappings, and support imports from `.flow/delivery-profile.json`
- optional DOM inspection path from `.flow/delivery-profile.json`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/browser-integration-codegen/`.

## Steps

1. Follow `${AGENTS_SKILLS_ROOT}/browser-integration-codegen/commands/browser-integration-codegen.md` exactly.
2. Parse the browser regression spec into structured scenarios.
3. Read the relevant source components and optional DOM inspection artifacts to verify selectors.
4. Generate suite files using profile-driven fixtures, suite names, and helper imports.
5. Leave explicit TODOs instead of guessing selectors or DB assertions.

## Output

- generated `.spec.ts` suite content or files in the profile-configured browser suites directory
- summary of selector certainty, unresolved TODOs, and suite/scenario counts
