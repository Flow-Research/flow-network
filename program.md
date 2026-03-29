# Flow Research Program

> The human-editable control surface for autonomous issue-flow execution.
> Agents read this file to understand objectives, constraints, and escalation rules.
> Modify this file to steer the autonomous loop. Everything else is agent-driven.

## Optimization Metric

The ratchet metric is a layered multiplicative composite that captures genuine
capability improvement. Weakness in any dimension drags the entire score down —
no variable can compensate for another.

### Primary Score (Layer 1)

```
S = f^0.35 · p^0.25 · q^0.25 · (1-r)^0.15
```

Where:
- **f** = final success rate (completed / total runs)
- **p** = first-pass success rate (gates with 0 refinement loops / total gates)
- **q** = output quality (test pass rate from QA phase)
- **r** = normalized refinement burden (avg_loops / 5.0, capped at 1)

Range: 0.0–1.0. Higher is better.

### Layer 2 (activate after 10+ runs with human gate data)

```
S = f^0.35 · p^0.20 · q^0.20 · (1-r)^0.10 · (1-h)^0.10 · (1-c)^0.05
```

Adds **h** (human intervention rate) and **c** (normalized cost).

### Hard Constraints (vetoes — reject improvement if violated)

These are disqualifying, not "a little bad." Any violation rejects the
candidate regardless of score.

- **Catastrophic failure rate**: must be 0 (data loss, worktree corruption, security violations)
- **Regression rate**: must be ≤ 0.1 (max 10% of previously-passing task categories fail)
- **Human intervention ceiling**: ≤ 0.5 (max 50% of runs need human rescue)

### Significance Threshold

```
ΔS > 0.02  → KEEP (improvement confirmed)
ΔS < -0.02 → REVERT (regression confirmed)
|ΔS| ≤ 0.02 → KEEP (within noise, no regression)
```

### Diagnostics (monitored, not scored)

- Duration per phase
- Token cost per run
- Per-gate refinement breakdown
- Failure mode distribution
- Variance across task types

### Legacy Score (deprecated, display only)

The old weighted-sum quality_score remains available for comparison:
```
quality_score = (first_pass_rate * 0.5) + ((1 - normalized_avg_loops) * 0.3) + ((1 - normalized_duration) * 0.2)
```

## Approval Checkpoint

Default: **after-spec** (autonomous through specs, human reviews at tech spec approval)

Presets: `after-brainstorm` | `after-design` | `after-spec` | `after-scope` | `after-qa` | `after-pr` | `full-auto` | `all-gates`

Maximum autonomy level: **after-pr** (prevents `full-auto` unless changed here)

Override per-session via `/autoflow start` prompt.

## Time Budgets

- Max time per issue-flow run: **1800s** (30 min)
- Max time per improvement cycle: **300s** (5 min)
- Runs exceeding budget: mark as `timed_out`, capture partial metrics

## Issue Source

Process issues labeled `autoflow` in this repository.
Skip issues labeled `blocked`, `wontfix`, or `duplicate`.
Prioritization: deep-inspect issue content, evaluate against project strategy context, present ranked queue for human approval at session start.

## Constraints

- Only modify skills under `tools/flow-install/skills/` (installed copies at `~/.agents/skills/`)
- Never modify `_shared/` scripts (`trace_capture.py`, `trace_query.py`, `run_metrics.py`, `ratchet.py` are evaluation infrastructure)
- Never modify `issue_flow_state.py` or `issue_flow_validate_transition.py` (state machine is fixed)
- Never modify this file (`program.md`) — this is the human control surface
- Maximum blast_radius for auto-improvement: `medium` (high requires human approval)
- All changes must be committed with evidence linking to trace IDs

## Quality Standards

- Max avg refinement loops per gate: **1.5** (trigger improvement above this)
- Min first-pass gate approval rate: **70%** (escalate below this)
- Max consecutive failures before escalation: **2**
- Min traces required before improvement: **3** (don't improve from sparse evidence)

## Skill Improvement Rules

- Auto-accept improvements when:
  - 3+ traces agree on the same feedback pattern
  - AND the proposed change is additive (new constraint, not removal)
  - AND the skill's blast_radius is `low` or `medium`
- Require human review when:
  - Change removes or weakens existing constraints
  - Skill has blast_radius `high`
  - Confidence is below 3 agreeing traces
- After improvement: run **3 issues** to measure impact before the next improvement cycle
- Keep/discard logic (via `ratchet.py`):
  - If any hard constraint gate fails → **revert** immediately
  - If ΔS > 0.02 → **keep** (improvement confirmed)
  - If ΔS < -0.02 → **revert** (regression confirmed)
  - If |ΔS| ≤ 0.02 → **keep** (within noise, no regression)
  - No "pending_evaluation" state — decision is always binary

## Escalation Policy

- If an issue fails 2 consecutive phases: **pause** and comment on the GitHub issue
- If skill improvement degrades metrics across 3 runs: **revert** and notify
- If no eligible issues remain: **pause** the loop and report summary
- If a phase requires human approval (human gate at a pause point): **pause** and wait
- Never force-approve a human gate — always wait for explicit human instruction

## Loop Cadence

- Maximum concurrent issues: **1** (increase to 2-3 when pool protocol is tested)
- No cooldown between issues
- Improvement evaluation after **every completed issue** (triggers cycle when any gate exceeds the refinement threshold)
- Maximum **20 issues per autonomous session** before mandatory human check-in
- Improvement cycles are always serial (no concurrent skill edits)

## Reporting

After each issue completion, append a run record to `~/.agents/traces/autoflow/runs.ndjson`:

```json
{
  "run_id": "run_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "issue_number": 123,
  "issue_title": "...",
  "outcome": "completed|failed|escalated|timed_out",
  "phases_completed": 17,
  "total_refinement_loops": 3,
  "first_pass_gates": 15,
  "total_gates": 19,
  "duration_seconds": 1800,
  "skill_version": "0.8.1",
  "improvement_triggered": false,
  "human_gates_triggered": 2,
  "human_gates_total": 7,
  "tests_passed": 15,
  "tests_total": 18,
  "regression_detected": false,
  "catastrophic_failure": false
}
```

After each improvement cycle, append to `~/.agents/traces/autoflow/improvements.ndjson`:

```json
{
  "cycle_id": "cycle_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "skill": "issue-flow",
  "runs_since_last_improvement": 5,
  "metrics_before": { "score": 0.72, "f": 0.8, "p": 0.7, "q": 0.75, "r": 0.3 },
  "metrics_after": { "score": 0.76, "f": 0.85, "p": 0.75, "q": 0.78, "r": 0.25 },
  "delta": 0.04,
  "decision": "keep|revert",
  "reason": "<from ratchet.py>",
  "improvements_proposed": 2,
  "improvements_accepted": 1,
  "gates_passed": true
}
```
