---
name: skill-validate
description: Validate a skill's manifest, catalog entry, and blast-radius gates. Use before publishing any skill.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
argument-hint: "[skill-name]"
---

# Skill Validate — Governance Gate

## Purpose
Verify that a skill complies with the manifest schema, catalog requirements, and blast-radius gates.

## Inputs
- Skill name

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/skill-validate/`.

## Steps
1. **Locate skill** in `.agents/skills`, `.agents/OpenClaw`, or `.agents/n8n`.
2. **Read `manifest.yaml`** and validate required fields:
   - `name`, `type`, `version`, `owner`, `status`, `blast_radius`, `description`, `permissions`, `data_categories`, `egress`, `invoke`, `location`
3. **Confirm catalog entry** exists in `.jarvis/context/skills/_catalog.md`.
4. **Blast-radius gates**
   - **Low**: self-test evidence required
   - **Medium**: self-test + peer spot-check evidence required
   - **High**: self-test + staging proof + explicit approval required
5. **Traces infrastructure check** (if `traces:` block exists in manifest):
   - Verify `_shared/trace_capture.py` exists at `${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py`
   - Verify `_shared/trace_query.py` exists at `${AGENTS_SKILLS_ROOT}/_shared/trace_query.py`
   - If `traces.gates` declares gate names, verify the SKILL.md or commands/*.md contains the "Decision Trace Protocol" or "Feedback Capture" section
   - If traces is enabled but no protocol section exists, warn: "traces enabled but no capture/consultation directives in skill docs"
6. **Return a pass/fail** with a remediation list.

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "skill-validate" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "skill-validate" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this skill-validate run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

## Output
- Status: PASS or FAIL
- Missing fields or mismatches
- Required next actions (tests, approvals)
