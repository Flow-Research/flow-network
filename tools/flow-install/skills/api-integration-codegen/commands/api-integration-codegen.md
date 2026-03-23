---
description: Generate API integration suites from the Flow API regression spec using the delivery profile
argument-hint: "[--suite <X>] [--profile .flow/delivery-profile.json] [--delta]"
---

# API Integration Codegen Command

## Inputs

- API regression spec from the delivery profile
- optional `--suite <X>` to scope generation
- optional `--profile .flow/delivery-profile.json`

## Workflow

1. Load the delivery profile.
2. Resolve the API regression spec and generated suite destination from the profile.
3. Parse the regression spec with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/api-integration-codegen/scripts/parse-api-regression.ts <api-regression-spec> [--suite <X>]
```

4. Generate suite content with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/api-integration-codegen/scripts/generate-api-suite.ts <api-scenarios-json> [--suite <X>] [--profile .flow/delivery-profile.json]
```

5. Write the output into the profile-configured API suites directory.
6. Refine assertions, seeds, and unauthorized coverage where the scaffolder leaves TODOs.

## Completion criteria

- generated suite uses only profile-configured imports and helper modules
- scenario count matches the parsed regression source for the target suite
- unresolved assertions are called out explicitly
