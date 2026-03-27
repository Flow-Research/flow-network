---
description: Download and summarize GitHub Actions workflow logs for a run.
---

# CI Logs Command

## Required input

- `--run <id>`

## Behavior

1. Verify `gh` is installed and authenticated.
2. Resolve the workflow jobs for the specified run.
3. When `--failed-only` is set, limit output to failed jobs.
4. Download logs for each selected job.
5. Extract the most relevant failing step and first useful error line.
6. Emit either:
   - human-readable grouped output, or
   - JSON when `--json` is requested.

## Notes

- This skill is GitHub Actions-specific by design.
- If no failed jobs exist under `--failed-only`, return a clear no-failures result instead of guessing.

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "ci-logs" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

