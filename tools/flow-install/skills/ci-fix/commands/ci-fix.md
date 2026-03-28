---
description: Diagnose and fix GitHub Actions failures in a bounded retry loop.
---

# CI Fix Command

## Behavior

1. Verify `gh` is installed and authenticated.
2. Resolve the latest failing run on the active branch unless a future version adds explicit run selection.
3. Use `ci-logs` to gather failed jobs and primary errors.
4. Classify the failure category.
5. Fix only categories that are safe to automate:
   - formatting/lint
   - obvious dependency lockfile issues
   - contained test/build/type issues after reading the affected files
6. Do not guess through infrastructure or ambiguous failures.
7. Commit and optionally push only when actual file changes were made.
8. Watch the rerun and either loop, succeed, or escalate.

## Notes

- This skill is GitHub Actions-specific by design.
- Never amend unrelated changes or push directly to protected branches.

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "ci-fix" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "ci-fix" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this ci-fix run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

