---
description: Multi-perspective UX/design review for design specifications
argument-hint: "[path-to-design-spec-folder]"
---

# Command Contract: design-spec-review

## Purpose

Review `design_spec.md` through 5 expert lenses to ensure completeness, feasibility, and quality before the design is handed off to technical specification.

## Inputs

| File | Required | Description |
|------|----------|-------------|
| `design_spec.md` | Yes | Design specification to review |
| `product_spec.md` | Yes | Approved PRD for cross-reference |

## Review Lenses

### Lens 1: UX Researcher
- Are all user personas well-defined with behavioral attributes?
- Do user flows cover all journeys described in the PRD?
- Are edge cases and error paths included in flows?
- Do interaction patterns match user expectations for the target audience?
- Are assumptions tagged and reasonable?

### Lens 2: Interaction Designer
- Are all screens in the inventory reachable via defined user flows?
- Do interaction patterns cover all states (default, loading, error, empty)?
- Are transitions and feedback mechanisms specified?
- Is the information architecture coherent and navigable?
- Are gesture/input patterns appropriate for target devices?

### Lens 3: Accessibility Expert
- Does the spec target WCAG 2.1 AA (or higher)?
- Are keyboard navigation paths defined for all interactive elements?
- Are ARIA roles, labels, and live regions specified in component specs?
- Are color contrast requirements explicit?
- Is focus management defined for modals, dropdowns, and dynamic content?
- Does the spec respect `prefers-reduced-motion`?

### Lens 4: Visual/Brand Designer
- Are design tokens, color palette, and typography defined (or marked as placeholder)?
- Is there consistency in spacing, iconography, and layout patterns?
- Do the visual references section have enough to guide implementation?
- Are responsive breakpoints reasonable and well-defined?

### Lens 5: Frontend Engineer
- Are component specs implementable? (realistic states, props, variants)
- Can the responsive behavior be achieved with standard CSS/framework patterns?
- Are there components that require custom implementation vs. library components?
- Is the screen inventory complete enough to estimate implementation scope?
- Are loading/error states practical to implement?

## Issue Classification

| Severity | Definition | Action |
|----------|-----------|--------|
| Critical | Blocks implementation or creates UX risk | Must fix before approval |
| Major | Significant gap or inconsistency | Should fix before approval |
| Minor | Nice to have, polish item | Can defer to implementation |

## Process

1. Read `design_spec.md` and `product_spec.md`.
2. Apply each lens sequentially, noting issues with severity.
3. For Critical and Major issues: propose a fix and apply it.
4. For unresolvable issues: add `[NEEDS INPUT]` tag.
5. Re-read the updated spec to verify internal consistency.
6. Produce the review summary.

## Exit Criteria

All of these must be true:
- No Critical issues remain
- No Major issues remain
- All `[NEEDS INPUT]` flags are either resolved or explicitly acknowledged
- All 5 lenses sign off
- User flows in design spec match the PRD's acceptance criteria
- Mermaid diagrams render correctly

## Community Skill Enhancers

Invoke these during the corresponding review lens for deeper analysis:

- **Accessibility Expert lens**: `/wcag-audit-patterns` or `/accessibility-compliance-accessibility-audit` for WCAG 2.2 verification
- **Visual/Brand Designer lens**: `/ui-visual-validator` for design system compliance, `/baseline-ui` for animation/typography validation
- **Frontend Engineer lens**: `/react-ui-patterns` (React projects) or `/angular-ui-patterns` (Angular) for implementation feasibility
- **Component validation**: `/shadcn` (shadcn/ui projects), `/radix-ui-design-system` (Radix headless components)
- **Design system alignment**: `/tailwind-design-system` (Tailwind projects), `/core-components` for design token patterns

## Output Format

```markdown
## Design Spec Review Complete

### Document
- **Location:** [path]
- **Status:** Ready for technical specification

### Review Summary
- Issues found: [N]
- Issues resolved: [N]
- All lenses signed off: [yes/no]

### Lens Sign-Off
| Lens | Status | Notes |
|------|--------|-------|
| UX Researcher | [pass/fail] | [Summary] |
| Interaction Designer | [pass/fail] | [Summary] |
| Accessibility Expert | [pass/fail] | [Summary] |
| Visual/Brand Designer | [pass/fail] | [Summary] |
| Frontend Engineer | [pass/fail] | [Summary] |

### Key Changes Made
1. [Change 1]
2. [Change 2]
```
