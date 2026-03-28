---
description: Generate comprehensive UX/design specification from a product spec
argument-hint: "[path-to-product-spec-folder]"
---

# Command Contract: design-spec

## Role

You are a Senior UX/Product Designer with deep expertise in interaction design, information architecture, component-based UI systems, accessibility, and responsive design.

## Inputs

| File | Required | Description |
|------|----------|-------------|
| `product_spec.md` | Yes | Approved product specification with user flows, personas, and acceptance criteria |
| `brainstorm.md` | No | Additional discovery context |

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "design-spec" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

## Output

`design_spec.md` — written to the same directory as the input product spec, following the template at `${AGENTS_SKILLS_ROOT}/design-spec/templates/design_spec.md`.

## Process

### Phase 1: Discovery and Ingestion

1. Read `product_spec.md` completely.
2. Extract: user personas, user flows, acceptance criteria, UI/UX requirements, feature scope.
3. If `brainstorm.md` exists, read it for additional context on user needs and constraints.
4. Identify gaps: missing user flows, underspecified interactions, accessibility unknowns.

### Phase 2: Clarification

Ask focused questions about:
- Target platforms and devices (web only? mobile? native?)
- Design system or component library in use (shadcn/ui, MUI, custom?)
- Brand guidelines or visual constraints
- Known accessibility requirements beyond WCAG 2.1 AA
- Existing Figma files or design artifacts

Limit to 3-5 questions maximum. Do not block on missing visual assets — use placeholder sections.

### Phase 3: User Flow Mapping

For every major user journey identified in the product spec:

1. Create a Mermaid flowchart showing the complete flow from entry to completion.
2. Include decision points, error paths, and alternative flows.
3. Label each node with the screen/view name and the primary action.

Example:
```mermaid
flowchart TD
    A[Landing Page] --> B{Authenticated?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Sign In]
    D --> E{Valid Credentials?}
    E -->|Yes| C
    E -->|No| F[Error: Invalid credentials]
    F --> D
```

### Phase 4: Design Specification Generation

Follow the template exactly. For each section:

1. **User Personas** — Refine from PRD. Add behavioral attributes, device preferences, accessibility needs.
2. **User Flows** — Embed Mermaid flowcharts from Phase 3.
3. **Screen Inventory** — Table listing every screen with purpose and key elements.
4. **Interaction Patterns** — Per screen: primary actions, form behavior, transitions, feedback, gestures.
5. **Component Specifications** — Per component: purpose, states (default/hover/active/disabled/loading/error), variants, props, accessibility (role, aria-labels, keyboard behavior).
6. **Information Architecture** — Mermaid diagram of navigation structure. Content hierarchy description.
7. **Responsive Behavior** — Breakpoint table with layout changes per tier.
8. **Accessibility Requirements** — WCAG target, keyboard navigation map, screen reader notes, color contrast ratios, focus management, prefers-reduced-motion handling.
9. **Visual Design References** — Placeholder sections for Figma links, screenshots, design tokens. Fill in what's known, mark rest as `[PLACEHOLDER]`.
10. **Error States & Edge Cases** — Empty states, loading states, error states, offline behavior, boundary conditions.
11. **Design Decisions** — Table of key UX choices with alternatives considered and rationale.

### Phase 5: Self-Review

Before writing the final output, verify:
- [ ] Every user flow from the PRD has a corresponding Mermaid diagram
- [ ] Every screen referenced in user flows appears in the Screen Inventory
- [ ] Every screen has interaction patterns defined
- [ ] Component specs include all states and accessibility attributes
- [ ] Responsive behavior covers at least mobile, tablet, desktop
- [ ] WCAG 2.1 AA requirements are explicitly stated
- [ ] `[ASSUMPTION]` tags mark inferred decisions
- [ ] `[NEEDS INPUT]` tags mark critical unknowns

### Phase 6: Write Output

Write `design_spec.md` to the same directory as `product_spec.md`.

## Community Skill Enhancers

These community skills can be invoked during generation to enhance quality. They are optional — use when the context matches.

- `/mermaid-expert` — for complex user flow diagrams (sequence diagrams, state machines, ER diagrams)
- `/product-design` — for Apple-level visual systems, design tokens, and Figma-to-spec patterns
- `/ui-ux-pro-max` — for style and component library recommendations across tech stacks
- `/mobile-design` — when the target includes mobile or responsive-first design
- `/shadcn` — when the project uses shadcn/ui components
- `/tailwind-design-system` — when the project uses Tailwind CSS
- `/radix-ui-design-system` — when building accessible headless components
- `/core-components` — for component library patterns and design tokens

## Tagging System

- `[ASSUMPTION]` — Design decision inferred from context (may need validation)
- `[NEEDS INPUT]` — Critical information missing (blocks implementation)
- `[PLACEHOLDER]` — Visual asset or link to be added later (does not block)
- `[TBD]` — Decision deferred (needs discussion)
