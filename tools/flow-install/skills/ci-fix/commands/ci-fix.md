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
