---
description: Re-trigger a GitHub Actions run, fully or only failed jobs.
---

# CI Rerun Command

## Behavior

1. Verify `gh` is installed and authenticated.
2. Resolve `--run <id>` or fall back to the latest run on the current branch.
3. If the run is already in progress, stop and explain that it cannot be re-run yet.
4. Use:
   - full rerun endpoint by default, or
   - failed-jobs-only endpoint when `--failed-only` is set.
5. Pass `enable_debug_logging=true` when `--with-debug` is requested.
6. Return the run URL and effective mode.
7. When `--watch` is requested, call `ci-watch` for the same run.

## Notes

- This skill is GitHub Actions-specific by design.
