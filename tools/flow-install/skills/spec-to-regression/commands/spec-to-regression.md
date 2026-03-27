---
description: Generate browser and API regression scenarios from approved specs using the Flow delivery profile
argument-hint: "--epic <epic_name> | --spec-dir <path> [--profile .flow/delivery-profile.json]"
---

# Spec to Regression Command

## Inputs

- target epic via `--epic <name>` or direct spec directory via `--spec-dir <path>`
- optional `--profile .flow/delivery-profile.json`

## Workflow

1. Resolve the spec directory:
   - `--spec-dir` if provided
   - otherwise resolve the active spec root and append `--epic`
2. Load the delivery profile if provided; otherwise use safe generic defaults.
3. Read, in full:
   - `product_spec.md`
   - `technical_spec.md`
4. Resolve regression artifact targets from the delivery profile:
   - browser regression spec
   - API regression spec
   - coverage matrix
5. Parse acceptance criteria with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/spec-to-regression/scripts/extract-criteria.ts <product-spec-path>
```

6. Generate structured scenario JSON with:

```bash
pnpm exec tsx ${AGENTS_SKILLS_ROOT}/spec-to-regression/scripts/generate-scenarios.ts <criteria-json> [--functions-file <functions-json>] [--profile .flow/delivery-profile.json]
```

7. Use the generated scenario JSON plus full-spec reasoning to append or update:
   - browser regression scenarios
   - API regression scenarios
   - coverage matrix entries

## Minimum scenario expectations

For each relevant mutation or workflow:

- at least one positive scenario
- at least one meaningful negative scenario
- unauthorized scenarios for blocked roles
- data-isolation scenarios when the profile or spec requires them
- implicit scenarios when the spec leaves important behavior unstated but implementation requires it

## Completion criteria

- every approved acceptance criterion maps to at least one regression scenario
- browser/API cross-references are stable
- coverage matrix is updated
- any unresolved ambiguity is surfaced in the summary rather than guessed silently

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "spec-to-regression" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "spec-to-regression" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this spec-to-regression run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

