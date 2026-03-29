---
name: autoflow
description: Autoresearch orchestrator — discovers skills with autoresearch.enabled, runs the experiment loop, and uses a multiplicative composite metric with hard constraint gates.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: "<start|status|pause|resume|metrics|history>"
---

# Autoflow — Autoresearch Orchestrator for Skill Self-Improvement

## Purpose

Discover skills that opt into the autoresearch pattern (via `autoresearch.enabled: true` in their manifest), run experiments autonomously, measure quality via a multiplicative composite metric, and trigger skill self-improvement with strict ratchet mechanics. This is Karpathy's autoresearch applied to software delivery: agents experiment on real tasks, measure results with fixed evaluation infrastructure, and upgrade their own skills — but only when the evidence confirms improvement.

## How It Works

1. **Configure** — human picks an approval checkpoint (trust level) and reviews a strategy-prioritized issue queue
2. **Discover** autoresearch-enabled skills by scanning `manifest.yaml` files for `autoresearch.enabled: true`
3. **Load** `program.md` (human control surface) for thresholds, constraints, and cadence
4. **Prioritize** — deep-inspect eligible issues, evaluate against project strategy context, present ranked queue
5. **Run** experiments: process issues through the target skill with human gates auto-approved below the checkpoint
6. **Measure** with the multiplicative composite score: `S = f^α · p^β · q^γ · (1-r)^δ`
7. **Improve** after every completed issue when thresholds are breached: snapshot → skill-improve → evaluation window → ratchet decide
8. **Keep or revert** — binary decision, no ambiguity, hard constraint gates as vetoes

## Approval Checkpoints

At session start, the human chooses a trust level that controls which human gates auto-approve:

- `after-brainstorm` / `after-design` / `after-spec` / `after-scope` / `after-qa` / `after-pr` / `full-auto` / `all-gates`

Default and max autonomy configured in `program.md`. Quality gates are never bypassed.

## Inputs

- Subcommand: `start`, `status`, `pause`, `resume`, `metrics`, `history`

## Steps

1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/autoflow/commands/autoflow.md` exactly.
2. Always read `program.md` from the repository root before starting any loop iteration.
3. Never modify `program.md`, `_shared/*.py` scripts, or `_shared/autoresearch.md` — these are fixed evaluation infrastructure.
4. Respect all escalation and cadence rules from `program.md`.
5. Log every run and improvement cycle to `.jarvis/context/autoflow/` (per-project state).
6. Use `ratchet.py` for all score computation, gate checking, and keep/revert decisions.

## Output

- Run-by-run execution log with ratchet scores
- Aggregate quality score trend (multiplicative composite)
- Hard constraint gate status
- Improvement history with keep/revert decisions and evidence
- Escalation notifications when thresholds or constraints are breached
- Pool state (when running concurrently)

## The Autoresearch Protocol

See `${AGENTS_SKILLS_ROOT}/_shared/autoresearch.md` for the full protocol specification,
including the three-file contract, metric layers, and adoption checklist.

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
