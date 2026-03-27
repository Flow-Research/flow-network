---
name: skill-publish
description: Publish a skill after validation and approvals; updates the catalog and logs the publish event.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, ApplyPatch, Write
argument-hint: "[skill-name]"
---

# Skill Publish — Controlled Release

## Purpose
Publish a validated skill with proper approvals, then update catalog metadata and log the publish event.

## Inputs
- Skill name
- Evidence of test gates
- Explicit approver (required for high blast radius)

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/skill-publish/`.

## Steps
1. **Run `/skill-validate <skill-name>`** and confirm PASS.
2. **Enforce approval gate**
   - If `blast_radius: high`, require explicit approval (Julian or Sayo). If missing, STOP.
3. **Update catalog entry**
   - Increment version if needed
   - Update `updated` date
4. **Write publish log** to `.jarvis/context/skills/publish-log.md` with:
   - Skill name, version, owner, blast radius
   - Approver (if required)
   - Date and summary
5. **Return confirmation**

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "skill-publish" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "skill-publish" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this skill-publish run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

## Output
- Confirmation message
- Link to catalog entry + publish log
