---
description: Autonomous issue-flow runner with self-improving skill evolution loop
argument-hint: "<start|status|pause|resume|metrics|history>"
---

# Autoflow Command Specification

## Mission

Autonomously process GitHub issues through issue-flow, measure quality via decision traces, and improve skills when quality thresholds are breached. This is the experiment loop: run → measure → improve → repeat.

## User Input

$ARGUMENTS

## Context

- Current directory: !`pwd`
- Git branch: !`git branch --show-current 2>/dev/null || echo "N/A"`
- Program file: !`cat program.md 2>/dev/null | head -5 || echo "No program.md found"`

## Command Router

### `start`

Begin the autonomous loop. Read `program.md`, query for eligible issues, process them sequentially.

### `status`

Show current loop state: active issue (if any), issues processed, current metrics, improvement history, next action.

### `pause`

Set the loop to pause after the current issue completes. Does not interrupt an active issue-flow run.

### `resume`

Resume from where the loop was paused. Re-read `program.md` for any updated configuration.

### `metrics`

Show aggregate quality metrics across all completed runs:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compute --skill issue-flow
```

### `history`

Show the run log from `~/.agents/traces/autoflow/runs.ndjson`.

## The Experiment Loop

This is the core loop that `start` executes. Each iteration is one "experiment."

### Step 1: Load Program

Read `program.md` from the repository root. Parse:
- `Issue Source` section → label filter, skip labels, ordering
- `Quality Standards` section → thresholds for refinement loops, first-pass rate, max failures
- `Skill Improvement Rules` section → auto-accept criteria, human review triggers, evaluation window
- `Escalation Policy` section → failure limits, revert triggers, pause conditions
- `Loop Cadence` section → concurrency, cooldown, improvement frequency, max issues per session

If `program.md` is missing, HARD STOP: "No program.md found. Create one at the repository root to configure the autonomous loop."

### Step 2: Query for Next Issue

```bash
gh issue list --label "<label from program.md>" --state open --json number,title,labels,createdAt \
    --jq '[.[] | select(.labels | map(.name) | all(. != "blocked" and . != "wontfix" and . != "duplicate"))] | sort_by(.createdAt) | .[0]'
```

If no eligible issues remain, check the `Escalation Policy`:
- If policy says "pause loop and report" → pause and report summary
- Otherwise wait and re-check after a cooldown

### Step 3: Check Session Limits

Read `~/.agents/traces/autoflow/runs.ndjson` to count issues processed in the current session.
If count >= `max issues per session` from program.md → pause for mandatory human check-in.

### Step 4: Check Improvement Cycle

Count completed runs since the last improvement cycle. If count >= `improvement frequency` from program.md:
- Run Step 8 (Improvement Cycle) BEFORE processing the next issue
- This ensures improvements are applied before they're tested

### Step 5: Run Issue-Flow

Invoke issue-flow on the selected issue:

```
/issue-flow issue <number>
```

This runs the full 18-phase delivery lifecycle with all gates. Issue-flow captures its own decision traces automatically (via the Decision Trace Protocol instrumented in its command doc).

**Monitor for completion**: issue-flow will either:
- Complete through Phase 17 (closeout) → success
- Pause at a human gate → wait for human (this is expected, not a failure)
- Fail at a quality gate after bounded retries → failure

**Human gate handling**: When issue-flow pauses at a human gate:
- If running in attended mode: wait for user input (normal issue-flow behavior)
- If running in autonomous mode (GitHub Actions): comment on the GitHub issue asking for review, then move to the next issue

### Step 6: Capture Run Metrics

After issue-flow completes (or fails), compute metrics for this run:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compute \
    --skill issue-flow --last <number_of_traces_from_this_run>
```

Record the run:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "autoflow" \
    --gate "run_completion" --gate-type "quality" \
    --outcome "<completed|failed|escalated>" \
    --issue-number <N> --project <project>
```

Append to `~/.agents/traces/autoflow/runs.ndjson`:

```json
{
  "run_id": "run_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "issue_number": <N>,
  "issue_title": "<title>",
  "outcome": "<completed|failed|escalated>",
  "phases_completed": <N>,
  "total_refinement_loops": <N>,
  "first_pass_gates": <N>,
  "total_gates": <N>,
  "duration_seconds": <N>,
  "skill_version": "<version from issue-flow manifest>",
  "quality_score": <0.0-1.0>,
  "improvement_triggered": false
}
```

### Step 7: Evaluate Quality

Compare this run's metrics against thresholds from `program.md`:

1. If any gate has `avg_refinement_loops > max_loops_threshold` → flag for improvement
2. If `first_pass_rate < min_first_pass_rate` → flag for escalation
3. If this is the Nth consecutive failure → escalate per policy

**Escalation**: When triggered:
- Comment on the GitHub issue: "Autoflow escalation: [reason]. Human review requested."
- Capture trace with gate "escalation_review"
- If escalation policy says "pause" → set loop to paused state

### Step 8: Improvement Cycle

Triggered when: completed runs since last cycle >= improvement frequency, OR a gate exceeds the refinement threshold.

1. **Compute aggregate metrics**:
   ```bash
   python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compute --skill issue-flow
   ```

2. **Check if improvement is needed**: If all gates are below threshold and first_pass_rate is above minimum, skip improvement. Log: "Metrics within thresholds, no improvement needed."

3. **Snapshot pre-improvement metrics**: Save the current quality_score, avg_refinement_loops, first_pass_rate.

4. **Run skill-improve**:
   ```
   /skill-improve issue-flow
   ```

   In autonomous mode (when `program.md` allows auto-accept):
   - Accept proposals that meet auto-accept criteria (3+ agreeing traces, additive change, medium or lower blast_radius)
   - Reject proposals that require human review per program.md rules
   - If ANY proposal requires human review: pause the improvement cycle and wait

   In supervised mode: always pause and present proposals to the user.

5. **Record improvement cycle**:

   Append to `~/.agents/traces/autoflow/improvements.ndjson`:
   ```json
   {
     "cycle_id": "cycle_<YYYYMMDD>_<NNN>",
     "timestamp": "<ISO 8601>",
     "skill": "issue-flow",
     "runs_since_last_improvement": <N>,
     "metrics_before": { "quality_score": <N>, "avg_loops": <N>, "first_pass_rate": <N> },
     "improvements_proposed": <N>,
     "improvements_accepted": <N>,
     "decision": "pending_evaluation"
   }
   ```

6. **Evaluate impact** (after the next N runs per program.md):

   ```bash
   python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compare \
       --skill issue-flow --before <old_version> --after <new_version>
   ```

   - If decision is "keep" → log success, continue loop
   - If decision is "revert" → revert skill to pre-improvement version:
     ```bash
     git checkout <pre-improvement-commit> -- ~/.agents/skills/issue-flow/
     ```
     Log the reversion with trace evidence.

### Step 9: Loop

Return to Step 1. Re-read `program.md` on every iteration (human may have updated thresholds).

## State Tracking

The autoflow loop maintains its state in `~/.agents/traces/autoflow/state.json`:

```json
{
  "status": "running|paused|stopped",
  "session_start": "<ISO 8601>",
  "issues_processed": 5,
  "current_issue": null,
  "last_improvement_at_run": 5,
  "consecutive_failures": 0,
  "paused_reason": null
}
```

Read this file on `status`, `resume`, and at the start of each loop iteration.

## Hard Stop Conditions

- `program.md` not found
- GitHub CLI not authenticated
- Max issues per session exceeded without human check-in
- Escalation policy triggered a full stop
- Unrecoverable git state (worktree corruption, merge conflicts)

## Output Contract

For `start`: report each issue as it begins and completes, with metrics summary.
For `status`: current state, issues processed, active issue, next action, aggregate metrics.
For `metrics`: full metrics table from run_metrics.py compute.
For `history`: formatted run log with outcomes and quality scores.

## Safety Rules

1. Never process more issues than `max_issues_per_session` without human check-in.
2. Never auto-accept skill improvements for high blast_radius skills.
3. Never skip human gates — wait for explicit instruction.
4. Never modify evaluation infrastructure (`_shared/*.py`, state machine scripts).
5. Never modify `program.md` — it is the human control surface.
6. Always capture traces for every decision — this is the audit trail.
7. If in doubt about any decision, escalate rather than proceed.
