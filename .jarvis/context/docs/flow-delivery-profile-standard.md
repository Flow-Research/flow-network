# Flow Delivery Profile Standard

This document defines the repo-agnostic contract required for Flow's standardized delivery workflow.

## Purpose

Flow delivery skills must not hardcode repository structure, app names, regression file names, role models, or test-helper imports. A project opts into the full delivery model by providing a machine-readable delivery profile.

Canonical path:

```text
.flow/delivery-profile.json
```

## Required Capabilities

The delivery profile supplies the minimum configuration needed by:

- `build-e2e`
- `issue-flow`
- `spec-to-regression`
- `api-integration-codegen`
- `browser-integration-codegen`
- `test-quality-validator`
- `browser-qa`
- `qa`

## Contract

### Root

- `version` — profile schema version
- `project` — project identifier for logs and reports
- `specRoot` — canonical epic/spec root

### Regression artifacts

- `regression.browserSpec`
- `regression.apiSpec`
- `regression.coverageMatrix`

### Roles

- `roles.all` — complete role inventory used for authorization/unauthorized coverage generation
- `roles.browserFixtures` — optional mapping from role to Playwright fixture and extra fixtures

### Browser codegen

- `browser.inspectionDir` — DOM inspection artifact root
- `browser.suitesDir` — generated browser suite destination
- `browser.suiteNames` — optional map from suite ID to friendly suite name
- `browser.supportImports.testFixtureModule`
- `browser.supportImports.snapshotModule`
- `browser.supportImports.dbAssertionsModule`
- `browser.dbHelperRules` — optional keyword-to-helper mapping for import generation

### API codegen

- `api.suitesDir` — generated API suite destination
- `api.suiteMeta` — suite ID to file/name/description mapping
- `api.supportImports.apiUtilsModule`
- `api.supportImports.testDatabaseModule`
- `api.supportImports.fixturesModule`
- `api.apiUtilImports`
- `api.rlsApiUtilImports`
- `api.testDatabaseImports`
- `api.defaultFixtureImports`
- `api.fixtureSeedRules` — optional seed-keyword to fixture-import mapping

### Validator rules

- `validators.api.backendGuardFunction` — optional required backend guard helper
- `validators.api.requiresClearAuth` — whether `clearAuth` enforcement applies
- `validators.browser.requireGuardReadOnly` — whether browser suites must use read-only guarding
- `validators.browser.disallowedPatterns` — selector or assertion patterns to flag

### Workflow conventions

- `workflow.integrationBranch` — preferred branch for epic/PR workflows
- `workflow.protectedBranches` — protected branch list
- `workflow.verificationCommand` — repo verification command used by orchestration skills

## Rules

1. Flow shared skills must prefer the delivery profile over repo-specific defaults.
2. If a field is missing, skills may fall back to safe generic behavior, but they must not silently assume project-specific paths or helper names.
3. Project-specific adapters belong in the delivery profile, not in shared skill source.
4. A skill that cannot operate correctly without profile data must fail clearly and explain the missing keys.

## Verification

- Shared skill docs must point to this contract when they require project configuration.
- Downstream repos such as `pilot-project-b` should be able to adopt the Flow delivery model by creating `.flow/delivery-profile.json` without editing shared skills.
