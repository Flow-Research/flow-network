---
name: skill-promote
description: Promote trace-driven improvements from the installed skill copy back to the Flow repo source.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: "<skill-name> [--dry-run] [--all]"
---

# Skill Promote — Sync Improvements to Flow Source

## Purpose

After `/skill-improve` applies changes to the installed copy at `~/.agents/skills/<skill-name>/`, those improvements only exist locally. This skill promotes them back to the Flow repo source at `tools/flow-install/skills/<skill-name>/` so they become permanent and distributable.

## Inputs

- `skill-name` — the skill to promote (or `--all` to check all skills)
- `--dry-run` — show what would change without applying
- `--all` — scan all shared Flow skills for unpromoted improvements

Template paths are resolved from `${AGENTS_SKILLS_ROOT}/skill-promote/`.

## Steps

### 1. Detect unpromoted improvements

Compare the installed and source versions:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/promote_check.py" check \
    --skill "<skill-name>" \
    --installed-root "${AGENTS_SKILLS_ROOT}" \
    --source-root "<flow-repo>/tools/flow-install/skills"
```

The script compares `manifest.yaml` versions at both paths. If installed version > source version, improvements exist that haven't been promoted.

Also read `~/.agents/traces/<skill-name>/improvements.ndjson` to identify which specific improvements are pending.

If no unpromoted improvements exist, report "No unpromoted improvements for `<skill-name>`." and stop.

### 2. Resolve Flow repo path

Find the Flow repo root. Check in order:
1. Current working directory — if it contains `tools/flow-install/skills/`, use it
2. `$FLOW_REPO_ROOT` environment variable
3. `$HOME/.cache/harnessy/` (cached installer source)

If the Flow repo can't be found, report the error and ask the user to cd into it or set `FLOW_REPO_ROOT`.

### 3. Diff installed vs source

For the skill being promoted, diff all files:

```bash
diff -rq "${AGENTS_SKILLS_ROOT}/<skill-name>/" "<flow-repo>/tools/flow-install/skills/<skill-name>/"
```

Present the diff to the user with context from `improvements.ndjson`:

```
Unpromoted improvements for issue-flow (installed: 0.8.3, source: 0.8.0):

  imp_20260410_001 (2026-04-10): Added mobile/responsive requirement to PRD phase
    Evidence: 3 traces, pattern "mobile experience" in 2/3
    File: commands/issue-flow.md, section: Phase 2 — PRD

  imp_20260412_001 (2026-04-12): Enforce measurable acceptance criteria
    Evidence: 2 traces, category UNCLEAR_CRITERIA
    File: commands/issue-flow.md, section: Phase 2 — PRD

Files changed:
  M commands/issue-flow.md
  M manifest.yaml
```

If `--dry-run`, stop here.

### 4. Confirm with user

Ask: "Apply these improvements to the Flow repo source? (yes / no)"

### 5. Apply the promotion

For each changed file, copy from installed to source:

```bash
cp "${AGENTS_SKILLS_ROOT}/<skill-name>/<file>" "<flow-repo>/tools/flow-install/skills/<skill-name>/<file>"
```

### 6. Stage and show the diff

Stage the changes in the Flow repo:

```bash
git add "tools/flow-install/skills/<skill-name>/"
git diff --cached --stat
```

Show the user the staged diff for final review.

### 7. Suggest commit and sync

Do NOT commit automatically. Instead, suggest:

```
Changes staged in the Flow repo. Recommended next steps:

1. Review: git diff --cached
2. Commit:
   git commit -m "improve(<skill-name>): promote trace-driven improvements v<old> → v<new>

   Improvements promoted from installed copy based on decision trace evidence:
   - <imp_id>: <summary>
   - <imp_id>: <summary>

   Trace evidence: <N> traces across <M> runs, patterns: <list>"

3. Push and sync:
   - Push to remote branch
   - Use /context-sync or manual PR for review
```

### 8. Mark improvements as promoted

After the user confirms the commit happened, update `~/.agents/traces/<skill-name>/improvements.ndjson` by appending a promotion record:

```json
{
  "type": "promotion",
  "timestamp": "<ISO 8601>",
  "skill": "<skill-name>",
  "improvements_promoted": ["imp_20260410_001", "imp_20260412_001"],
  "promoted_to_version": "0.8.3",
  "commit_branch": "<branch>"
}
```

## `--all` mode

When invoked with `--all`:

1. Scan every skill directory under `${AGENTS_SKILLS_ROOT}/` that also exists under `<flow-repo>/tools/flow-install/skills/`
2. Compare versions
3. Report a summary table:

```
Skill               Installed  Source  Unpromoted
issue-flow          0.8.3      0.8.0  3 improvements
code-review         0.2.1      0.2.1  —
prd                 0.3.0      0.2.0  1 improvement
```

4. Ask which skills to promote (all / specific names / none)

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "skill-promote" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "skill-promote" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this skill-promote run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

## Output

- Diff summary with improvement evidence
- Staged changes in Flow repo (not committed)
- Suggested commit message with trace evidence
- Promotion record in improvements.ndjson
