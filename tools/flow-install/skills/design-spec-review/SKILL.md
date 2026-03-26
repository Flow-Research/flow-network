---
name: design-spec-review
description: "Multi-perspective UX/design review for design_spec.md with 5 expert lenses: UX research, interaction design, accessibility, visual/brand, and frontend engineering."
disable-model-invocation: true
allowed-tools: Read, Write, Grep, Glob
argument-hint: "[path-to-design-spec-folder]"
---

# Design Spec Review

## Purpose

Conduct a rigorous, multi-perspective review of a `design_spec.md` to ensure UX completeness, interaction coverage, accessibility compliance, design system alignment, and frontend implementability.

## Inputs

- `design_spec.md` (required) — the design specification to review
- `product_spec.md` (required) — the approved PRD for cross-reference

## Steps

1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/design-spec-review/commands/design-spec-review.md` exactly.
2. Review through all 5 expert lenses.
3. Flag issues as Critical (blocks), Major (should fix), or Minor (nice to have).
4. Resolve all Critical and Major issues before signing off.
5. Produce a review summary with sign-off status per lens.

## Output

- Updated `design_spec.md` with issues resolved.
- Review summary printed to the user.
