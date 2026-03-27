---
description: Generate a working UI prototype from design spec and tech spec with dummy data
argument-hint: "[path-to-epic-folder]"
---

# Design Mockup Generator

## Mission

Generate a working, runnable UI prototype from approved `design_spec.md` and `technical_spec.md`. The mockup uses the project's actual framework, renders every screen from the design spec's Screen Inventory, and wires dummy data derived from the tech spec's data models. It is a visual checkpoint — not production code.

## User Input

$ARGUMENTS

If no path is provided, resolve the epic folder from the current working directory using the same spec root resolution as issue-flow:

1. `BUILD_E2E_SPEC_ROOT` if set
2. `./.jarvis/context/specs` if it exists
3. `./specs` if it exists
4. fallback default: `./specs`

Then find the most recently modified epic subfolder containing both `design_spec.md` and `technical_spec.md`.

## Context

- Current directory: !`pwd`
- Git branch: !`git branch --show-current 2>/dev/null || echo "N/A"`

## Prerequisites

Both files must exist in the epic folder:
- `design_spec.md` — approved design specification
- `technical_spec.md` — approved technical specification

If either is missing, stop with an error explaining which file is missing and which skill to run first (`/design-spec` or `/tech-spec`).

## Process

### Phase 1 — Repo Detection

Scan the worktree (not the spec folder) for framework and tooling signals:

**Framework detection** (check in order, use first match):
- `next.config.ts` or `next.config.js` or `next.config.mjs` → Next.js
- `nuxt.config.ts` or `nuxt.config.js` → Nuxt
- `svelte.config.js` → SvelteKit
- `astro.config.mjs` → Astro
- `vite.config.ts` with `@vitejs/plugin-react` → React + Vite
- `package.json` with `react` in dependencies → React (generic)
- No match → default to Next.js

**Component library detection**:
- `components.json` with `"$schema": "https://ui.shadcn.com/schema.json"` → shadcn/ui
- `package.json` with `@mui/material` → MUI
- `package.json` with `@chakra-ui/react` → Chakra UI
- `package.json` with `antd` → Ant Design
- No match → use plain HTML elements with Tailwind classes

**Styling detection**:
- `tailwind.config.*` or `@tailwindcss` in dependencies → Tailwind CSS
- `package.json` with `styled-components` → styled-components
- CSS Modules (`.module.css` files present) → CSS Modules
- No match → default to Tailwind CSS

Report the detected stack to the user before proceeding. Example:
> Detected stack: Next.js (App Router) + shadcn/ui + Tailwind CSS. Generating mockup with this stack.

### Phase 2 — Spec Parsing

Read `design_spec.md` and extract:

1. **Screen Inventory** (Section 3) — table of every screen/view with purpose and key elements
2. **Component Specifications** (Section 5) — reusable components with states (default, hover, active, disabled, loading, error), variants, props, accessibility attributes
3. **Interaction Patterns** (Section 4) — per-screen actions, form behavior, transitions, feedback
4. **User Flows** (Section 2) — Mermaid flowcharts showing navigation between screens
5. **Responsive Behavior** (Section 7) — breakpoint table (mobile, tablet, desktop)
6. **Visual Design References** (Section 9) — design tokens (colors, typography, spacing, icons)
7. **Error States & Edge Cases** (Section 10) — empty states, loading patterns, error messages

Read `technical_spec.md` and extract:

1. **Data Models** (Section 3) — entity definitions with field names, types, and relationships
2. **API Specification** (Section 4) — endpoint response shapes

If a section is missing or marked `[NEEDS INPUT]`, note it and use sensible defaults.

### Phase 3 — Dummy Data Generation

For each entity in the tech spec data models:

1. Map field types to realistic fake values:
   - `string` / `VARCHAR` / `text` → contextual fake (name fields get names, email fields get emails, etc.)
   - `number` / `integer` / `INT` → realistic range (IDs: 1-999, prices: 9.99-299.99, quantities: 1-100)
   - `boolean` → mix of true/false
   - `date` / `timestamp` / `TIMESTAMP` → dates within the last 90 days
   - `uuid` / `UUID` → valid UUID v4 strings
   - `enum` → cycle through defined values
   - Arrays/relations → reference other generated entities by ID

2. Generate per entity:
   - 5-10 records for list views (varied data to show different states)
   - 1 detailed record for detail/edit views
   - Include at least 1 record in each relevant status/state if the entity has a status field

3. Output all data to `mockup/mockData.ts` (or `.js` if the project is JavaScript-only):
   ```typescript
   // Auto-generated dummy data from technical_spec.md
   // DO NOT use in production — this is mockup data only.

   export const users = [ ... ];
   export const orders = [ ... ];
   // etc.
   ```

### Phase 4 — Scaffolding

Create the mockup directory structure inside the epic folder:

```
${SPEC_ROOT}/<epic>/mockup/
├── README.md
├── mockData.ts
├── package.json          (if standalone; or add a script to root package.json)
├── pages/                (or app/ for Next.js App Router)
│   ├── index.tsx         (landing/dashboard — first screen in inventory)
│   └── [screen-slug].tsx (one file per screen from Screen Inventory)
├── components/
│   └── [ComponentName].tsx (one file per component from Component Specs)
└── styles/
    └── tokens.css        (design tokens from Visual Design References)
```

**Standalone vs. integrated decision:**
- If the worktree root has a `package.json` with the detected framework already installed, create the mockup as pages/routes within the existing project structure (e.g., under `app/mockup/` for Next.js App Router). Add a note in README about the mockup route prefix.
- If the worktree root does not have the framework, create a standalone `mockup/` directory with its own `package.json` and minimal deps.

### Phase 5 — Screen and Component Implementation

For each screen in the Screen Inventory:

1. Create a page/route file
2. Import relevant components from `components/`
3. Import dummy data from `mockData.ts`
4. Implement the layout described in the design spec
5. Wire interactive elements:
   - Buttons that navigate to other screens (use router or links)
   - Forms that show validation states (client-side only, no submission)
   - Tabs/accordions that toggle content
   - Loading states shown with a toggle or simulated delay
   - Error states shown with a toggle or alternate data
   - Empty states shown when data array is empty
6. Apply responsive styles at the breakpoints from the design spec
7. Apply design tokens (colors, typography, spacing) from the Visual Design References

For each component in the Component Specifications:

1. Create a component file with all defined variants and states
2. Accept props as defined in the component spec
3. Use the detected component library (shadcn primitives, MUI components, etc.)
4. Include accessibility attributes from the component spec (aria-labels, roles, keyboard handlers)

### Phase 6 — README Generation

Create `mockup/README.md`:

```markdown
# Design Mockup — [Epic Name]

> This is a **visual prototype** generated from the approved design spec and tech spec.
> All data is hardcoded. No real APIs, databases, or authentication.

## How to Run

[Framework-specific instructions, e.g.:]
cd mockup && npm install && npm run dev

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Dashboard | / | ... |
| User Profile | /profile | ... |
[Generated from Screen Inventory]

## Component States

To view different component states (loading, error, empty), [describe toggles or routes].

## Notes

- All data comes from `mockData.ts` — edit it to test different scenarios.
- This mockup is not production code. It will be replaced by the full implementation.
```

## Output

All files in the `mockup/` directory (or under the mockup route prefix if integrated), ready for the issue-flow Artifact Commit-and-Link procedure.

## Behavioral Rules

1. Never connect to real APIs, databases, or authentication providers.
2. Never write tests for mockup code.
3. Never install global dependencies or modify the project's root `package.json` without asking the user.
4. Always use the project's detected framework and styling approach.
5. If no framework is detected, default to a minimal Next.js App Router app with Tailwind CSS.
6. All dummy data must be realistic and typed — no `"test"`, `"foo"`, `"bar"`, `123` placeholders.
7. Every screen from the Screen Inventory must have a corresponding page/route.
8. Every component from the Component Specifications must be implemented with all defined states.
9. Navigation between screens must work (clicking a link goes to the right screen).
10. The mockup must be runnable with a single command after install.

## Hard Stop Conditions

- `design_spec.md` does not exist in the epic folder
- `technical_spec.md` does not exist in the epic folder
- The Screen Inventory section is empty or missing
- The worktree assertion fails (not in the correct issue worktree)
