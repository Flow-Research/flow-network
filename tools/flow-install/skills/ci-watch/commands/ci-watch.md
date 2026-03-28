---
description: Poll a GitHub Actions workflow run until success, failure, or timeout.
---

# CI Watch Command

## Behavior

1. Verify `gh` is installed and authenticated.
2. Resolve the target run via `--run` or the latest run on the target/current branch.
3. Poll the run API every `--poll` seconds.
4. Exit with:
   - success when the run conclusion is `success`
   - failure when the run conclusion is `failure`
   - timeout when the run never reaches `completed`
5. Emit JSON when requested.

## Notes

- This skill is GitHub Actions-specific by design.

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "ci-watch" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

