# Flow Research Program

> The human-editable control surface for autonomous issue-flow execution.
> Agents read this file to understand objectives, constraints, and escalation rules.
> Modify this file to steer the autonomous loop. Everything else is agent-driven.

## Objective

Minimize average refinement loops across all issue-flow gates while maintaining
100% gate pass rate. Secondary: minimize time-to-completion.

The composite quality score is:

```
quality_score = (first_pass_rate * 0.5) + ((1 - normalized_avg_loops) * 0.3) + ((1 - normalized_duration) * 0.2)
```

Higher is better. Range: 0.0–1.0.

## Issue Source

Process issues labeled `autoflow` in this repository.
Skip issues labeled `blocked`, `wontfix`, or `duplicate`.
Process in order: oldest first (FIFO).

## Constraints

- Only modify skills under `tools/flow-install/skills/` (installed copies at `~/.agents/skills/`)
- Never modify `_shared/` scripts (`trace_capture.py`, `trace_query.py`, `run_metrics.py` are evaluation infrastructure)
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
- Keep/discard logic:
  - If `avg_refinement_loops` decreased or `first_pass_rate` increased → **keep**
  - If metrics stayed the same → **keep** (no regression)
  - If metrics degraded → **revert** and capture a trace explaining the reversion

## Escalation Policy

- If an issue fails 2 consecutive phases: **pause** and comment on the GitHub issue
- If skill improvement degrades metrics across 3 runs: **revert** and notify
- If no eligible issues remain: **pause** the loop and report summary
- If a phase requires human approval (human gate at a pause point): **pause** and wait
- Never force-approve a human gate — always wait for explicit human instruction

## Loop Cadence

- Process **1 issue at a time** (sequential for v1)
- No cooldown between issues
- Improvement cycle every **5 completed issues** (or when any gate exceeds the refinement threshold)
- Maximum **20 issues per autonomous session** before mandatory human check-in

## Reporting

After each issue completion, append a run record to `~/.agents/traces/autoflow/runs.ndjson`:

```json
{
  "run_id": "run_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "issue_number": 123,
  "issue_title": "...",
  "outcome": "completed|failed|escalated",
  "phases_completed": 17,
  "total_refinement_loops": 3,
  "first_pass_gates": 15,
  "total_gates": 19,
  "duration_seconds": 1800,
  "skill_version": "0.8.1",
  "improvement_triggered": false
}
```

After each improvement cycle, append to `~/.agents/traces/autoflow/improvements.ndjson`:

```json
{
  "cycle_id": "cycle_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "skill": "issue-flow",
  "runs_since_last_improvement": 5,
  "metrics_before": { "avg_loops": 1.8, "first_pass_rate": 0.65 },
  "improvements_proposed": 2,
  "improvements_accepted": 1,
  "decision": "keep|revert|pending_evaluation"
}
```
