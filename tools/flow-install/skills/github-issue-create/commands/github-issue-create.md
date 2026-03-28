---
description: Create a GitHub issue and optionally attach it to a GitHub Project item.
---

# GitHub Issue Create Command

## Behavior

1. Validate `owner/repo`, title, and body.
2. Verify `gh` is installed and authenticated.
3. Verify repo access with `gh repo view`.
4. Normalize labels and assignees.
5. Create the issue with `gh issue create`.
6. If `--project-owner` and `--project-number` are both supplied:
   - add the issue to that project
   - optionally set a field/value when `--status-field` and `--status-value` are supplied
7. Return the created issue URL/number and any project item details.

## Notes

- Project-board placement is optional, not implicit.
- Do not assume a repo-specific board title or a required `Backlog` column.

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "github-issue-create" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```
