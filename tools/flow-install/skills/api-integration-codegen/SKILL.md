---
name: api-integration-codegen
description: "Generate API integration test suites from Flow regression artifacts using a delivery-profile-driven adapter layer."
disable-model-invocation: false
allowed-tools: Read, Write, Grep, Glob, Bash, ApplyPatch
argument-hint: "[--suite <X>] [--profile .flow/delivery-profile.json] [--delta]"
---

# API Integration Codegen

## Purpose

Generate API integration test suites from the project's API regression spec without assuming one repository layout, helper module path, or fixture naming scheme.

## Required contract

- regression artifact paths from `.flow/delivery-profile.json`
- API suite metadata and helper imports from `.flow/delivery-profile.json`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/api-integration-codegen/`.

## Steps

1. Follow `${AGENTS_SKILLS_ROOT}/api-integration-codegen/commands/api-integration-codegen.md` exactly.
2. Parse the API regression spec into structured scenarios.
3. Generate the suite file using the delivery profile for suite metadata, helper imports, fixture imports, and optional DB helper rules.
4. Refine the generated suite when business logic requires stronger assertions than the scaffolder can infer automatically.

## Output

- generated `.api.test.ts` suite content or files in the profile-configured API suites directory
- generation summary with suite/scenario counts and any unresolved adapter gaps
