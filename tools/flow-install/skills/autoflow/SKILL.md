---
name: autoflow
description: Autonomous issue-flow runner with self-improving skill evolution loop.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: "<start|status|pause|resume|metrics|history>"
---

# Autoflow — Autonomous Research Loop for Software Delivery

## Purpose

Run issue-flow autonomously on GitHub issues, measure quality via decision trace metrics, and trigger skill self-improvement when quality thresholds are breached. This is Karpathy's autoresearch pattern applied to software delivery: agents experiment on real issues, measure results, and upgrade their own skills.

## Inputs

- Subcommand: `start`, `status`, `pause`, `resume`, `metrics`, `history`

## Steps

1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/autoflow/commands/autoflow.md` exactly.
2. Always read `program.md` from the repository root before starting any loop iteration.
3. Never modify `program.md`, `_shared/*.py` scripts, or the state machine scripts — these are fixed evaluation infrastructure.
4. Respect all escalation and cadence rules from `program.md`.
5. Log every run and improvement cycle to `~/.agents/traces/autoflow/`.

## Output

- Run-by-run execution log with metrics
- Aggregate quality score trend
- Improvement history with keep/discard decisions
- Escalation notifications when thresholds are breached

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "autoflow" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "autoflow" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this autoflow run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".
