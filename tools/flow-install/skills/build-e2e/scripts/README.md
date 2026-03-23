# build-e2e Validator

Validate build-e2e artifacts and state before proceeding to the next checkpoint.

## Usage

```bash
${AGENTS_SKILLS_ROOT}/build-e2e/scripts/validate.sh <epic-path-or-epic-name>
```

Spec root resolution order:

1. `BUILD_E2E_SPEC_ROOT`
2. `.jarvis/context/specs`
3. `specs`

## What it checks

- `.build-e2e-state.json` exists and includes a valid `phase`
- If present, each artifact file is non-empty
- **Hard brainstorm evidence enforcement** once phase moves past `BRAINSTORM`:
  - `brainstorm_transcript.md` is required and non-empty
  - `brainstorm.md` is required and non-empty
  - transcript contains at least 3 `Qn:` and 3 `An:` lines
  - transcript includes both `Clarity Check:` and `Answer:`
- **Hard PRD panel review enforcement** once phase reaches `AWAIT_PRD_EVAL` or later:
  - `product_spec.md` is required and non-empty
  - `prd_review_summary.md` is required and non-empty
  - summary must include `## PRD Review Complete` and `All perspectives signed off: ✅`
  - summary must include matching `PRD SHA256: <sha256-of-product_spec.md>` to prevent stale sign-off
- **Hard tech-spec panel review enforcement** once phase reaches `AWAIT_TECHSPEC_EVAL` or later:
  - `technical_spec.md` is required and non-empty
  - `techspec_review_summary.md` is required and non-empty
  - summary must include `## Tech Spec Review Complete` and `All perspectives signed off: ✅`
  - summary must include matching `TECH SPEC SHA256: <sha256-of-technical_spec.md>` to prevent stale sign-off

## Typical flow

Run this after each checkpoint (brainstorm, PRD, tech spec, MVP, QA) before proceeding.
