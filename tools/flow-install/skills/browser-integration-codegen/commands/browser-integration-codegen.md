---
description: Generate browser integration suites from the Flow browser regression spec using the delivery profile
argument-hint: "[--suite <NN>] [--profile .flow/delivery-profile.json] [--delta] [--inspect-first]"
---

# Browser Integration Codegen Command

## Inputs

- browser regression spec from the delivery profile
- optional `--suite <NN>` to scope generation
- optional `--profile .flow/delivery-profile.json`

## Workflow

1. Load the delivery profile.
2. Resolve the browser regression spec, optional DOM inspection path, and generated suite destination.
3. Parse the regression spec with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/browser-integration-codegen/scripts/parse-regression.ts <browser-regression-spec> [--suite <NN>]
```

4. If DOM inspection artifacts exist, resolve selector inventories with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/browser-integration-codegen/scripts/resolve-selectors.ts <inspection-dir>
```

5. Read the real page or component source for the routes under test.
6. Generate suite content with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/browser-integration-codegen/scripts/generate-suite.ts <scenarios-json> [--suite <NN>] [--profile .flow/delivery-profile.json]
```

7. Write the generated suite into the profile-configured browser suites directory.

## Completion criteria

- generated suite uses only profile-configured imports and fixture mappings
- selector strategy is source-verified or explicitly marked with TODOs
- destructive/read-only gating matches the regression spec semantics
