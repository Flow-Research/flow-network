# Flow Delivery Verification Standard

This document defines how Flow maintainers evaluate whether delivery-model changes are correct.

## Principle

No skill promotion, merge, or standardization claim is complete without fresh verification evidence.

## Verification layers

### 1. Static portability audit

Check for:

- hardcoded source-repo paths
- source-repo app names
- source-repo domain nouns used as assumptions
- branch defaults that are not profile-driven
- artifact paths not resolved through contracts

### 2. Contract compliance

Check that shared skills consume only:

- the spec root contract
- the regression artifact contract
- the delivery profile contract
- optional validator and adapter settings

### 3. Source-repo behavior

Verify that the standardized Flow version still supports the reference repo workflow in `Accelerate Africa`.

### 4. Downstream portability

Verify that a different Flow repo such as `Awadoc` can consume the standardized skill set using only configuration and project-local adapters.

### 5. Artifact correctness

For generated outputs, verify:

- acceptance criteria are covered
- positive, negative, and unauthorized scenarios are represented where required
- browser/API cross-references are valid
- generated tests match the intended suites and helper imports
- validator outputs correctly identify missing coverage and false-green risks

### 6. Regression safety

Verify that:

- `pnpm skills:validate` passes
- `pnpm skills:register` succeeds
- `pnpm harness:verify` passes
- previously working Flow shared skills still register and resolve correctly

## Required evidence for promotion work

Every wave of standardization should produce:

- changed-skill list
- portability issues found and resolved
- commands run
- command outputs or summary of pass/fail counts
- downstream repo tested
- known limitations or deferred items

## Pass criteria

A promoted or standardized Flow delivery skill is considered correct only when it is:

- structurally valid
- behaviorally correct
- portable beyond the source repo
- decoupled from hidden source-repo assumptions
- non-regressive for existing Flow installs
