---
description: Manage semantic versioning with VERSION file + CHANGELOG.md for any codebase
argument-hint: "[init|status|log|release|bump] [args]"
---

# Semantic Versioning Manager

Manage semantic versioning with VERSION file + CHANGELOG.md for any codebase.

## Files Managed

| File | Purpose |
|------|---------|
| `VERSION` | Single line containing current version (e.g., `1.2.3`) |
| `CHANGELOG.md` | Human-readable change history following Keep a Changelog format |

## User Input

$ARGUMENTS

## Context

- Current date: !`date +%Y-%m-%d`
- VERSION file: !`cat VERSION 2>/dev/null || echo "Not found"`
- CHANGELOG preview: !`head -30 CHANGELOG.md 2>/dev/null || echo "Not found"`

## Command Router

Based on the first argument, execute the appropriate action:

### `init` - Initialize semantic versioning

1. Check if VERSION or CHANGELOG.md already exist
2. If VERSION exists, read current version; otherwise create with `0.1.0`
3. If CHANGELOG.md exists, preserve it; otherwise create with template
4. Report what was created/found

**VERSION template:**
```
0.1.0
```

**CHANGELOG.md template:**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

### `status` - Show current version and pending changes

1. Read VERSION file (error if not found - suggest `/semver init`)
2. Parse CHANGELOG.md for [Unreleased] section content
3. Display:
   - Current version
   - Unreleased changes (or "No unreleased changes")
   - Suggested bump type based on change categories

**Bump suggestion logic:**
- If Unreleased has "Removed" or contains "BREAKING" → suggest MAJOR
- If Unreleased has "Added" or "Changed" or "Deprecated" → suggest MINOR
- If Unreleased has only "Fixed" or "Security" → suggest PATCH
- If Unreleased is empty → "No changes to release"

### `log <type> <message>` - Add changelog entry

**Types:** `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`

1. Read CHANGELOG.md (error if not found - suggest `/semver init`)
2. Find [Unreleased] section
3. Find or create ### <Type> subsection (capitalize first letter)
4. Append `- <message>` under that subsection
5. Write updated CHANGELOG.md
6. Confirm: "Logged under [Type]: <message>"

**Examples:**
```
/semver log added User authentication with OAuth2
/semver log fixed Memory leak in dashboard component
```

### `release <major|minor|patch> [--tag]` - Create a new release

1. Read VERSION file (error if not found)
2. Read CHANGELOG.md and extract [Unreleased] content
3. If Unreleased is empty, abort: "Nothing to release. Add changes with `/semver log`"
4. Calculate new version:
   - major: X.0.0 (increment major, reset minor and patch)
   - minor: x.Y.0 (increment minor, reset patch)
   - patch: x.y.Z (increment patch)
5. Update CHANGELOG.md:
   - Clear [Unreleased] section (keep header and subsection headers empty)
   - Insert new version section below [Unreleased] with today's date
   - Move all unreleased content to new version section
6. Update VERSION file with new version
7. If `--tag` flag: create git tag `v<version>`
8. Report:
   - Previous version → New version
   - Changes included
   - Files modified
   - Tag created (if applicable)

### `bump <major|minor|patch>` - Bump version without changelog

Bump version WITHOUT requiring unreleased changes. For manual version control.

1. Read VERSION file
2. Calculate and write new version
3. Do NOT modify CHANGELOG.md
4. Report: "Bumped <old> → <new>"

## Validation Rules

1. **VERSION file format:** Must contain only a valid semver string (X.Y.Z), optionally with newline
2. **CHANGELOG.md format:** Must have `## [Unreleased]` section
3. **No duplicate entries:** Warn if identical entry already exists in Unreleased
4. **Git check:** If in git repo and there are uncommitted changes to VERSION/CHANGELOG.md, warn user

## Error Handling

| Error | Response |
|-------|----------|
| VERSION not found | "VERSION file not found. Run `/semver init` first." |
| CHANGELOG.md not found | "CHANGELOG.md not found. Run `/semver init` first." |
| Invalid version in VERSION | "Invalid version format in VERSION. Expected X.Y.Z" |
| No [Unreleased] section | "CHANGELOG.md missing [Unreleased] section. Add it manually or run `/semver init`" |
| Empty release | "Nothing to release. Add changes with `/semver log` first." |
| Invalid bump type | "Invalid bump type. Use: major, minor, or patch" |
| Invalid log type | "Invalid change type. Use: added, changed, deprecated, removed, fixed, security" |

## No Arguments

If no arguments provided, show:
1. Current version (if VERSION exists)
2. Unreleased changes summary
3. Available commands with examples

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "semver" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

