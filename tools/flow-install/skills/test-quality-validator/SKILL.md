---
name: test-quality-validator
description: "Validate generated or hand-written tests for coverage completeness, correctness, and false-green risks using Flow regression artifacts and the delivery profile."
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Write
argument-hint: "[--epic <epic_name>] [--suite <X>] [--api-only] [--browser-only] [--profile .flow/delivery-profile.json]"
---

# Test Quality Validator

## Purpose

Validate that generated or maintained tests are complete, trustworthy, and aligned with approved specs and regression artifacts.

## Required contract

- spec root from the active spec-root contract
- regression artifact paths from `.flow/delivery-profile.json`
- role inventory and validator rules from `.flow/delivery-profile.json`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/test-quality-validator/`.

## Checks

1. Coverage completeness against acceptance criteria and regression scenarios.
2. False-green risk detection in generated or hand-written suites.
3. Pattern adherence against delivery-profile-configured validator rules.
4. Role and authorization coverage.

## Steps

1. Parse criteria with `${AGENTS_SKILLS_ROOT}/spec-to-regression/scripts/extract-criteria.ts`.
2. Parse API regression scenarios with `${AGENTS_SKILLS_ROOT}/api-integration-codegen/scripts/parse-api-regression.ts`.
3. Run `${AGENTS_SKILLS_ROOT}/test-quality-validator/scripts/validate-coverage.ts` with the optional delivery profile.
4. Run `${AGENTS_SKILLS_ROOT}/test-quality-validator/scripts/validate-correctness.ts` against the project's browser/API suites with the optional delivery profile.
5. Synthesize the results into a single quality report.

## Output

- quality report with coverage %, false-green risks, pattern violations, and role coverage gaps
- explicit failures and warnings suitable for PR review or CI gating
