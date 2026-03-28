---
name: skill-improve
description: Analyze decision traces and propose skill mutations based on accumulated feedback patterns.
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Grep, Glob
argument-hint: "<skill-name>"
---

# Skill Improve — Evidence-Driven Skill Evolution

## Purpose

Analyze accumulated decision traces for a skill and propose concrete, evidence-backed edits to SKILL.md, command docs, or scripts. This is the long loop of the skill evolution system.

The short loop (trace consultation during execution) gives immediate benefit by reading past feedback. This skill creates *durable improvement* by changing the skill's instructions so future runs don't repeat the same mistakes.

## Inputs

- `skill-name` — the skill to improve

Template paths are resolved from `${AGENTS_SKILLS_ROOT}/skill-improve/`.

## Steps

### 1. Load and analyze traces

Run the trace analysis:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" stats --skill "<skill-name>"
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" patterns --skill "<skill-name>"
```

If no traces exist, report "No decision traces found for `<skill-name>`. Run the skill with trace capture enabled to accumulate feedback before improving." and stop.

If traces exist but all gates have avg refinement_loops < 0.5, report "Traces exist but feedback signal is weak — most gates pass on first try. No improvements needed yet." and stop.

### 2. Identify improvement targets

From the stats and patterns output, identify:

- **High-friction gates**: gates with avg refinement_loops > 1.0
- **Recurring feedback categories**: categories appearing in 3+ traces
- **Recurring unstructured patterns**: themes appearing across multiple traces
- **Ad-hoc and retrospective feedback**: traces with `gate.type: "retrospective"`

Rank by impact: gates with more traces and higher avg loops get priority.

### 3. Read the current skill

Read the skill's SKILL.md, command docs (`commands/*.md`), and any script files that the feedback targets. Understand the current rules, constraints, and phase logic.

The skill files live at:
- `${AGENTS_SKILLS_ROOT}/<skill-name>/SKILL.md`
- `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/*.md`
- `${AGENTS_SKILLS_ROOT}/<skill-name>/scripts/*`

### 4. Generate improvement proposals

For each high-friction gate or recurring pattern, propose a **specific, minimal edit** to the skill:

- **New constraint**: add a rule or checklist item to the phase that feeds the problematic gate
- **Modified criteria**: tighten or clarify a review criterion that's causing ambiguous rejections
- **New quality check**: add a pre-gate validation step that catches the recurring issue earlier
- **Template change**: modify a template that consistently produces output needing refinement
- **Script change**: modify deterministic logic that contributes to the pattern

Each proposal must:
- State which traces motivate it (trace IDs or summary)
- Show the exact text diff (old → new)
- Explain the expected impact

### 5. Present proposals to the user

Present each proposal as a numbered list with:

```
Proposal 1: [title]
Evidence: [N] traces show [pattern] at gate [gate_name] (avg [X] refinement loops)
File: [path]
Change:
  OLD: [exact text being replaced]
  NEW: [exact replacement text]
Expected impact: [what changes for future runs]
```

Ask the user: "Which proposals do you want to apply? (all / numbers / none)"

### 6. Apply accepted proposals

Improvements are applied to the **installed copy** at `${AGENTS_SKILLS_ROOT}/<skill-name>/` (`~/.agents/skills/<skill-name>/`). This is the copy agents read at runtime, so improvements take effect immediately.

The source of truth in the Flow repo (`tools/flow-install/skills/<skill-name>/`) is NOT modified. When the improvement is proven stable, promote it back to Flow via the normal contribution path (PR to `Flow-Research/harnessy`).

For each accepted proposal:

1. Apply the edit to the target file under `${AGENTS_SKILLS_ROOT}/<skill-name>/`.
2. Bump the skill's patch version in `manifest.yaml` (e.g., 0.8.0 → 0.8.1).
3. Record the improvement in `~/.agents/traces/<skill-name>/improvements.ndjson`:
   ```json
   {
     "improvement_id": "imp_<YYYYMMDD>_<NNN>",
     "timestamp": "<ISO 8601>",
     "skill": "<skill-name>",
     "from_version": "<old>",
     "to_version": "<new>",
     "trace_ids_consumed": ["<trace_id>", ...],
     "changes": [
       {
         "file": "<relative path>",
         "section": "<section name>",
         "type": "<added_constraint|modified_criteria|new_check|template_change|script_change>",
         "summary": "<one-line description>"
       }
     ],
     "accepted_by": "<user>"
   }
   ```

### 7. Regenerate trace index

After applying improvements:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" summarize --skill "<skill-name>"
```

### 8. Check promotion status

After applying improvements, check if the skill has unpromoted improvements relative to the Flow repo source:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/promote_check.py" check \
    --skill "<skill-name>" \
    --installed-root "${AGENTS_SKILLS_ROOT}" \
    --source-root "<flow-repo>/tools/flow-install/skills"
```

Use the Flow repo root from the current working directory if `tools/flow-install/skills/` exists, otherwise fall back to `$HOME/.cache/harnessy/tools/flow-install/skills`.

### 9. Report

Summarize:
- Number of proposals applied
- New skill version
- Trace IDs consumed
- Next steps: "Run `/skill-validate <skill-name>` to verify the updated skill"
- If unpromoted improvements exist: "This skill now has N unpromoted improvements (installed v<X> vs source v<Y>). Run `/skill-promote <skill-name>` to push them to the Flow repo source."

## When to run this skill

- **On demand**: when you notice repeated friction with a skill
- **Suggested by the system**: after a skill run where total refinement loops across all gates exceeds 5, the skill may suggest running `/skill-improve`
- **Never automatic**: skill mutations are always human-reviewed

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "skill-improve" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "skill-improve" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this skill-improve run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

## Output

- Numbered improvement proposals with evidence and diffs
- Applied changes with version bump
- Improvement record in `improvements.ndjson`
- Updated `index.md` summary
