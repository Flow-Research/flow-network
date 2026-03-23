# Flow Regression Artifact Standard

This document defines the artifact contract for Flow's spec-to-test workflow.

## Purpose

The shared delivery skills need stable, portable locations and structures for regression artifacts. These artifacts are generated from approved specs and then consumed by codegen and validation skills.

## Canonical artifact paths

Projects declare these in `.flow/delivery-profile.json`:

- `regression.browserSpec`
- `regression.apiSpec`
- `regression.coverageMatrix`

## Browser regression requirements

The browser regression spec must support:

- suite headers
- scenario IDs
- role
- route
- mode (`read-only` or `destructive`)
- type (`positive` or `negative`)
- prerequisites
- ordered steps
- expected outcome

### Recommended browser format

Use a stable markdown structure that can be parsed and reviewed by humans:

```md
# Browser Regression Spec

# SUITE 01: AUTHENTICATION

## 1.1 Login succeeds with valid credentials

Role: unauthenticated
Route: /login
Mode: read-only
Type: positive
Prerequisites: seeded user exists

- Navigate to `/login`.
- Fill valid credentials.
- Submit the form.

Expected: User lands on the dashboard and no auth error is shown.
```

Template reference:

- `.jarvis/context/templates/browser-regression-spec.template.md`

## API regression requirements

The API regression spec must support:

- suite headers
- scenario IDs
- function name
- module path
- role
- type (`positive`, `negative`, `unauthorized`)
- seed requirements
- input summary
- DB assertions
- expected outcome
- browser cross-reference

### Recommended API format

Use a stable markdown structure that clearly separates callable behavior from evidence:

```md
# API Regression Spec

# SUITE A: AUTHENTICATION

## A.1 loginAction accepts valid credentials

Function: loginAction
Module: @/lib/auth
Role: unauthenticated
Type: positive
Seed: seedTestUser(valid-user)
Input: { email: "user@example.com", password: "secret" }
DB Assert: session row created
Expected: No error thrown
Browser Ref: 1.1
```

Template reference:

- `.jarvis/context/templates/api-regression-spec.template.md`

## Coverage matrix requirements

The coverage matrix must be able to show, at minimum:

- approved acceptance criteria
- mapped browser scenarios
- mapped API scenarios
- authorization coverage
- negative-case coverage
- isolation/RLS-like coverage where applicable

### Recommended coverage format

Use a markdown table keyed by acceptance criterion or mutation name:

```md
# Coverage Matrix

| Feature | Browser | API | Authorization | Negative | Notes |
|---------|---------|-----|---------------|----------|-------|
| loginAction | 1.1 | A.1 | A.3 | A.2 | Happy path and rejection cases covered |
```

Template reference:

- `.jarvis/context/templates/coverage-matrix.template.md`

## Rules

1. Shared skills must consume artifact paths from the delivery profile.
2. Scenario numbering and suite naming must be profile-compatible, not app-name-specific.
3. Browser/API cross-references must be deterministic and stable across regenerations.
4. Coverage updates must be additive and traceable back to source specs.
5. New repos should be able to create compliant artifacts from the templates alone, without copying AA-specific examples.

## Templates

Flow ships starter templates for each artifact type:

- `.jarvis/context/templates/browser-regression-spec.template.md`
- `.jarvis/context/templates/api-regression-spec.template.md`
- `.jarvis/context/templates/coverage-matrix.template.md`
