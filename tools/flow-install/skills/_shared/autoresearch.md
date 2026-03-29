# Autoresearch Protocol for Skill Self-Improvement

> A reusable pattern for autonomous skill evolution.
> Based on Karpathy's autoresearch applied to software delivery.

## Core Principle

The ratchet guarantees monotonic improvement: run experiments, measure with a
fixed metric, keep or revert, repeat. The system can only get better or stay
the same — never silently degrade.

## The Three-File Contract

Any skill adopting autoresearch must maintain strict separation between three
categories of files. This separation is what makes the ratchet trustworthy.

### 1. Editable Files (the "train.py")

These are the files the autoresearch loop is allowed to modify:
- Skill `SKILL.md` — instructions, constraints, decision guidance
- Skill `commands/*.md` — command specifications, phase logic
- Skill templates — output templates, checklists

**Rule**: Only these files change during improvement cycles. Everything else
is fixed.

### 2. Fixed Evaluation Infrastructure (the "prepare.py")

These files measure quality and are never modified by agents:
- `_shared/run_metrics.py` — computes raw metrics from traces
- `_shared/ratchet.py` — multiplicative composite score + hard gates + ratchet mechanics
- `_shared/trace_capture.py` — records decision traces
- `_shared/trace_query.py` — queries accumulated traces
- `_shared/promote_check.py` — checks for unpromoted improvements

**Rule**: If agents could modify the evaluation, the ratchet would be
meaningless. These files are immutable within the autoresearch loop.

### 3. Human Control Surface (the "program.md")

The `program.md` file at the repository root is the human steering mechanism:
- Optimization metric configuration (layer, exponents)
- Hard constraint thresholds
- Time budgets
- Issue source and filtering
- Quality standards
- Improvement rules (auto-accept criteria)
- Escalation policy
- Loop cadence

**Rule**: Only humans modify `program.md`. Agents read it at the start of
every loop iteration to pick up any changes.

## The Experiment Loop

```
1. LOAD    — Read program.md (human may have changed thresholds)
2. SELECT  — Find the next eligible experiment (issue, task, etc.)
3. RUN     — Execute the skill on the experiment (with time budget)
4. MEASURE — Capture metrics via fixed evaluation infrastructure
5. EVALUATE — Compare against thresholds, check if improvement needed
6. IMPROVE — If needed: snapshot → improve skill → evaluation window → ratchet decide
7. LOOP    — Return to step 1
```

## The Ratchet Contract

Every improvement cycle follows this strict sequence:

### Snapshot
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" snapshot --skill <name>
```
Creates a git tag at the current skill state. Records baseline score.

### Improve
Run `/skill-improve <name>` with auto-accept rules from program.md.

### Evaluate
Run N experiments (evaluation window from manifest) with the improved skill.
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" evaluate --skill <name> --window <N>
```

### Decide
Binary keep/revert — no "pending" state allowed.
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" decide --skill <name>
```

Decision logic:
1. Hard constraint gate fails → **REVERT**
2. ΔS > ε → **KEEP**
3. ΔS < -ε → **REVERT**
4. |ΔS| ≤ ε → **KEEP** (no regression)

## The Metric

### Layer 1 (default — start here)

```
S = f^0.35 · p^0.25 · q^0.25 · (1-r)^0.15
```

| Variable | Meaning | Range |
|----------|---------|-------|
| f | Final success rate | [0, 1] |
| p | First-pass success rate | [0, 1] |
| q | Output quality score | [0, 1] |
| r | Normalized refinement burden | [0, 1] |

**Multiplicative**: weakness in any dimension drags the entire score.
No variable can compensate for another.

### Layer 2 (activate after 10+ runs)

```
S = f^0.35 · p^0.20 · q^0.20 · (1-r)^0.10 · (1-h)^0.10 · (1-c)^0.05
```

Adds human intervention rate (h) and normalized cost (c).

### Hard Constraint Gates

| Constraint | Threshold | Action |
|------------|-----------|--------|
| Catastrophic failure | > 0 | Immediate revert |
| Regression rate | > max_regression_rate | Revert |
| Human dependence | > max_human_intervention | Revert |

Gates are vetoes — they reject regardless of score.

## Adopting Autoresearch for a Skill

### Step 1: Add manifest section

Add to your skill's `manifest.yaml`:

```yaml
autoresearch:
  enabled: true
  metric_layer: 1
  time_budget_seconds: 1800
  evaluation_window: 3
  constraints:
    max_regression_rate: 0.1
    max_human_intervention: 0.5
```

### Step 2: Ensure trace instrumentation

Your skill's command spec must include the Decision Trace Protocol:
- Query traces before gates (short loop)
- Capture traces after gates (audit trail)

### Step 3: Define quality measurement

Your skill must produce measurable output that `ratchet.py` can score:
- `tests_passed` / `tests_total` in run records (for `q` variable)
- Clear success/failure outcomes (for `f` variable)
- Refinement loop counts at each gate (for `r` variable)

### Step 4: Register with autoflow

Autoflow discovers all skills with `autoresearch.enabled: true` in their
manifest and orchestrates the loop. No additional wiring needed.

## Design Principles

1. **The metric must be fixed** — if the system can influence how it's
   measured, the ratchet is meaningless.

2. **Hard constraints are not soft penalties** — catastrophic failures and
   regressions are disqualifying, not "a little bad."

3. **Multiplicative over weighted sum** — a system that fails on quality
   cannot compensate with speed.

4. **Binary decisions, no pending states** — every ratchet cycle ends with
   keep or revert. Ambiguity allows drift.

5. **Time budgets prevent runaway** — experiments that exceed their budget
   are timed out, not allowed to run indefinitely.

6. **Human control via program.md** — the system optimizes within the
   boundaries humans set, and re-reads those boundaries every iteration.

7. **Layered adoption** — start with 4 variables (Layer 1), add complexity
   only after sufficient data supports it.
