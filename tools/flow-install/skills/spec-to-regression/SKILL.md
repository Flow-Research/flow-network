---
name: spec-to-regression
description: "Generate browser and API regression scenarios from approved product and technical specs using the Flow delivery profile and regression artifact contract."
disable-model-invocation: false
allowed-tools: Read, Write, Grep, Glob, Bash
argument-hint: "--epic <epic_name> | --spec-dir <path> [--profile .flow/delivery-profile.json]"
---

# Spec to Regression

## Purpose

Translate approved specs into structured browser and API regression scenarios without hardcoding repository shape, app names, or auth models.

## Required contract

- spec root from the active Flow spec-root contract
- regression artifact paths from `.flow/delivery-profile.json`
- role inventory from `.flow/delivery-profile.json`

See:

- `.jarvis/context/docs/flow-delivery-profile-standard.md`
- `.jarvis/context/docs/flow-regression-artifact-standard.md`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/spec-to-regression/`.

## Steps

1. Follow `${AGENTS_SKILLS_ROOT}/spec-to-regression/commands/spec-to-regression.md` exactly.
2. Read the full `product_spec.md` and `technical_spec.md` for the target epic.
3. Infer positive, negative, unauthorized, isolation, and implicit scenarios from the specs.
4. Use the helper scripts only for parsing and formatting; the model is responsible for understanding coverage and behavior.
5. Update browser regression spec, API regression spec, and coverage matrix using paths from the delivery profile.

## Output

- updated browser regression spec
- updated API regression spec
- updated coverage matrix
- scenario generation summary with uncovered or ambiguous requirements called out explicitly
