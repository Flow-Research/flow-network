---
description: Autonomous issue-flow runner with self-improving skill evolution loop
argument-hint: "<start|status|pause|resume|metrics|history>"
---

# Autoflow Command Specification

## Mission

Autonomously process GitHub issues through issue-flow, measure quality via a multiplicative composite metric, and improve skills when quality thresholds are breached. This is the autoresearch ratchet: run → measure → improve → evaluate → keep or revert → repeat.

## User Input

$ARGUMENTS

## Context

- Current directory: !`pwd`
- Git branch: !`git branch --show-current 2>/dev/null || echo "N/A"`
- Program file: !`cat program.md 2>/dev/null | head -5 || echo "No program.md found"`

## State Directory

All autoflow operational state lives per-project at `.jarvis/context/autoflow/`:

```
.jarvis/context/autoflow/
├── state.json            # Loop state: status, checkpoint, issues processed
├── queue.json            # Approved issue queue with prioritization reasoning
├── pool.json             # Concurrency pool state (if max_concurrent > 1)
├── runs.ndjson           # Run-by-run log with extended metrics
├── improvements.ndjson   # Improvement cycle log with ratchet decisions
└── ratchet_*.json        # Per-skill ratchet state: baseline, candidate, decision
```

This directory must be gitignored (runtime state, not source). Decision traces remain global at `~/.agents/traces/<skill>/traces.ndjson` (per-skill, cross-project).

Create `.jarvis/context/autoflow/` on first run if it doesn't exist.

## Command Router

### `start`

Begin the autonomous loop. Executes the full startup sequence:
1. Read `program.md`
2. Prompt for approval checkpoint (trust level)
3. Fetch and deep-inspect eligible issues
4. Prioritize against project strategy
5. Present ranked queue for human approval
6. Begin experiment loop on approved queue

### `status`

Show current loop state: active issue, approval checkpoint, queue position, ratchet score, improvement history, pool state, next action.

### `pause`

Set the loop to pause after the current issue completes. Does not interrupt an active issue-flow run.

### `resume`

Resume from where the loop was paused. Re-read `program.md` for any updated configuration. Queue and checkpoint are preserved from the original `start`.

### `metrics`

Show aggregate quality metrics and ratchet score:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" score --skill issue-flow --json
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" gates --skill issue-flow --json
python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compute --skill issue-flow
```

### `history`

Show the run log from `.jarvis/context/autoflow/runs.ndjson`.

---

## Startup Sequence

The `start` command executes these steps before entering the experiment loop.

### Startup Step 1: Load Program

Read `program.md` from the repository root. Parse all sections:
- `Optimization Metric` → composite formula, hard constraints, significance threshold
- `Time Budgets` → max time per run, max time per improvement
- `Approval Checkpoint` → default preset, max_autonomy
- `Issue Source` → label filter, skip labels
- `Quality Standards` → thresholds for refinement loops, first-pass rate, max failures
- `Skill Improvement Rules` → auto-accept criteria, human review triggers, evaluation window
- `Escalation Policy` → failure limits, revert triggers, pause conditions
- `Loop Cadence` → concurrency, improvement frequency, max issues per session

If `program.md` is missing, HARD STOP.

### Startup Step 2: Approval Checkpoint

Ask the user to choose their approval checkpoint (trust level):

```
What's your approval checkpoint for this session?

  after-brainstorm  — Human reviews brainstorm, then autonomous
  after-design      — Human reviews design, then autonomous
  after-spec        — Human reviews tech spec, then autonomous (default)
  after-scope       — Human reviews execution scope, then autonomous
  after-qa          — Autonomous through QA, human reviews before PR
  after-pr          — Autonomous through PR, human does final acceptance only
  full-auto         — No human gates (quality gates only)
  all-gates         — Every human gate pauses (safest)
```

- Use the default from `program.md` if set, show it as "(default)"
- If `max_autonomy` is set in `program.md`, reject presets beyond that level
- `full-auto` requires explicit confirmation: "Full auto mode skips ALL human gates. Quality gates still enforce. Confirm?"

Store the choice in `.jarvis/context/autoflow/state.json` as `approval_checkpoint`.

**Checkpoint-to-phase mapping:**

```
after-brainstorm → Phase 1
after-design     → Phase 5
after-spec       → Phase 7
after-scope      → Phase 8
after-qa         → Phase 13
after-pr         → Phase 15
full-auto        → Phase 99 (no human gates)
all-gates        → Phase -1 (all human gates active)
```

### Startup Step 3: Fetch Eligible Issues (Deep Inspection)

Fetch all eligible issues with full content — not just titles:

```bash
gh issue list --label "<label from program.md>" --state open \
    --json number,title,body,labels,assignees,createdAt,milestone,comments \
    --jq '[.[] | select(.labels | map(.name) | all(. != "blocked" and . != "wontfix" and . != "duplicate"))]'
```

Read the **full body and comments** of each issue. This is essential for prioritization.

If no eligible issues found, PAUSE and report.

### Startup Step 4: Load Project Strategy Context

Read from `.jarvis/context/`:
- `status.md` — current project status, active priorities
- `roadmap.md` — upcoming milestones, strategic direction
- `docs/strategy/README.md` — strategic context (if exists)
- Active specs in `.jarvis/context/specs/` — ongoing epic work

These provide the strategic lens for prioritization.

### Startup Step 5: Evaluate and Prioritize

For each eligible issue, assess:

| Factor | Signal |
|--------|--------|
| **Strategic alignment** | Does it advance current roadmap priorities? |
| **Dependency order** | Does it block or depend on other eligible issues? |
| **Readiness** | Well-specified? Clear acceptance criteria? No open questions? |
| **Complexity estimate** | Bug fix vs. feature — affects time budget and risk |
| **Risk** | Does it touch high blast_radius areas? |

Produce a ranked queue with one-line reasoning per issue.

### Startup Step 6: Present Queue for Approval

Present the ranked queue to the human:

```
Proposed work queue (N eligible issues):

 1. #42 — Add input validation to registration flow
    Strategic: Blocks #48 (registration epic). Well-specified. Low complexity.

 2. #45 — Fix auth redirect on expired sessions
    Strategic: User-facing bug, aligns with stability priority. No dependencies.

 3. #48 — Registration flow end-to-end
    Strategic: Registration epic milestone. Depends on #42. Medium complexity.

Approval checkpoint: after-spec
Session limit: 20 issues

Approve this order? (y / reorder / skip issues)
```

The human can:
- **Approve** (`y`) — process in this order
- **Reorder** — specify a different order
- **Skip** — remove specific issues from this session

Store the approved queue in `.jarvis/context/autoflow/queue.json`:

```json
{
  "session_id": "session_<YYYYMMDD>_<NNN>",
  "approved_at": "<ISO 8601>",
  "approval_checkpoint": "after-spec",
  "queue": [
    { "number": 42, "title": "...", "priority_reason": "Blocks #48, registration epic" },
    { "number": 45, "title": "...", "priority_reason": "User-facing bug, stability" }
  ],
  "skipped": [51],
  "context_files_read": ["status.md", "roadmap.md"]
}
```

---

## State Machine

After the startup sequence completes, the experiment loop begins.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AUTOFLOW STATE MACHINE                          │
│                                                                         │
│  STARTUP ──→ LOAD_PROGRAM ──→ NEXT_FROM_QUEUE ──→ CHECK_LIMITS         │
│                                    │                    │               │
│                              (queue empty)         (limit hit)          │
│                                    ↓                    ↓               │
│                                  PAUSE               PAUSE              │
│                                                                         │
│  CHECK_LIMITS ──→ RUN_ISSUE ──→ CAPTURE_METRICS ──→ EVALUATE_QUALITY   │
│                       │                                   │             │
│                  (human gate,         ┌───────────────────┤             │
│                   pool mode)          │            (threshold breach)    │
│                       ↓               ↓                   ↓             │
│                    WAITING          LOOP           IMPROVEMENT_CYCLE    │
│                                      ↓                   │             │
│                              LOAD_PROGRAM          ┌─────┘             │
│                                                    ↓                    │
│  IMPROVEMENT_CYCLE:                                                     │
│    SNAPSHOT ──→ RUN_SKILL_IMPROVE ──→ EVALUATION_WINDOW                │
│                                            │                            │
│                                      (window complete)                  │
│                                            ↓                            │
│                                      RATCHET_DECIDE                    │
│                                       ┌────┴────┐                      │
│                                      KEEP    REVERT                    │
│                                       └────┬────┘                      │
│                                            ↓                            │
│                                          LOOP                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### State Transitions

| From | To | Condition |
|------|----|-----------|
| STARTUP | LOAD_PROGRAM | Startup sequence complete (queue approved) |
| LOAD_PROGRAM | NEXT_FROM_QUEUE | `program.md` parsed successfully |
| LOAD_PROGRAM | HARD_STOP | `program.md` not found |
| NEXT_FROM_QUEUE | CHECK_LIMITS | Next issue available in queue |
| NEXT_FROM_QUEUE | PAUSE | Queue exhausted |
| CHECK_LIMITS | RUN_ISSUE | Within session limits |
| CHECK_LIMITS | PAUSE | Session max exceeded |
| RUN_ISSUE | CAPTURE_METRICS | Issue-flow completed or failed |
| RUN_ISSUE | WAITING | Issue paused at human gate (pool mode) |
| CAPTURE_METRICS | EVALUATE_QUALITY | Metrics captured |
| EVALUATE_QUALITY | IMPROVEMENT_CYCLE | Threshold breached |
| EVALUATE_QUALITY | LOOP | Within thresholds |
| IMPROVEMENT_CYCLE | LOOP | Improvement cycle complete |
| LOOP | LOAD_PROGRAM | Re-read program.md, continue |
| PAUSE | LOAD_PROGRAM | `resume` command received |

---

## The Experiment Loop

### State: LOAD_PROGRAM

Re-read `program.md` on every iteration (human may have updated thresholds). Do NOT re-read the queue — issue order is locked to the approved queue from startup.

### State: NEXT_FROM_QUEUE

Pop the next issue from `.jarvis/context/autoflow/queue.json`. If queue is empty, transition to PAUSE.

### State: CHECK_LIMITS

Read `.jarvis/context/autoflow/runs.ndjson` to count issues processed in the current session.
If count >= `max issues per session` from program.md → transition to PAUSE.

### State: RUN_ISSUE

Record the start time.

Invoke issue-flow on the next queued issue:

```
/issue-flow issue <number>
```

**Approval checkpoint enforcement**: Pass the `approval_checkpoint` to issue-flow. At each human gate in issue-flow:

1. Look up the gate's phase number:
   ```
   brainstorm_approval       → Phase 1
   issue_append_approval     → Phase 1
   prd_approval              → Phase 3
   design_approval           → Phase 5
   tech_spec_approval        → Phase 7
   execution_scope_approval  → Phase 8
   final_acceptance          → Phase 16
   ```

2. If gate phase < checkpoint phase → **auto-approve**:
   ```bash
   python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
       --skill "issue-flow" \
       --gate "<gate_name>" --gate-type "human-bypassed" \
       --outcome "auto-approved" --refinement-loops 0 \
       --feedback "Auto-approved: checkpoint is <preset>, gate before checkpoint"
   ```
   Continue to next phase without pausing.

3. If gate phase >= checkpoint phase → **pause for human review** (normal behavior).

4. Quality gates are NEVER bypassed regardless of checkpoint.

**Time budget enforcement**: At each phase transition, check elapsed time:
```
if elapsed > time_budget_seconds from program.md:
    mark run as "timed_out", capture partial metrics, transition to CAPTURE_METRICS
```

**Human gate handling in pool mode**:
- If `max_concurrent == 1`: wait for user input at active human gates
- If `max_concurrent > 1`: move issue to WAITING state, pop next from queue

### State: CAPTURE_METRICS

After issue-flow completes (or fails or times out), compute metrics:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/run_metrics.py" compute \
    --skill issue-flow --last <number_of_traces_from_this_run> --json
```

Capture a run completion trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "autoflow" \
    --gate "run_completion" --gate-type "quality" \
    --outcome "<completed|failed|escalated|timed_out>" \
    --issue-number <N> --project <project>
```

Append to `.jarvis/context/autoflow/runs.ndjson`:

```json
{
  "run_id": "run_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "issue_number": 123,
  "issue_title": "<title>",
  "outcome": "completed|failed|escalated|timed_out",
  "phases_completed": 17,
  "total_refinement_loops": 3,
  "first_pass_gates": 15,
  "total_gates": 19,
  "duration_seconds": 1800,
  "skill_version": "<version from issue-flow manifest>",
  "improvement_triggered": false,
  "human_gates_triggered": 2,
  "human_gates_total": 7,
  "human_gates_bypassed": 5,
  "tests_passed": 15,
  "tests_total": 18,
  "regression_detected": false,
  "catastrophic_failure": false,
  "approval_checkpoint": "after-spec"
}
```

### State: EVALUATE_QUALITY

After **every completed issue**, evaluate whether improvement is needed:

1. If any gate has `avg_refinement_loops > max_loops_threshold` → flag for improvement
2. If `first_pass_rate < min_first_pass_rate` → flag for escalation
3. If this is the Nth consecutive failure → escalate per policy

Also compute the ratchet score:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" score --skill issue-flow --json
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" gates --skill issue-flow --json
```

**Escalation**: When triggered:
- Comment on the GitHub issue: "Autoflow escalation: [reason]. Human review requested."
- Capture trace with gate "escalation_review"
- If escalation policy says "pause" → set loop to PAUSE state

If improvement flagged → transition to IMPROVEMENT_CYCLE.
Otherwise → transition to LOOP.

### State: IMPROVEMENT_CYCLE

Triggered after any completed issue where a gate exceeds the refinement threshold (checked every issue, not on a cadence).

#### Sub-state: SNAPSHOT

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" snapshot --skill issue-flow
```

Creates a git tag and records baseline score.

#### Sub-state: RUN_SKILL_IMPROVE

Record improvement start time.

```
/skill-improve issue-flow
```

**Time budget**: If elapsed exceeds `max_time_per_improvement` from program.md, abort and continue with unmodified skills.

Auto-accept rules from `program.md` apply:
- 3+ agreeing traces, additive change, medium or lower blast_radius → auto-accept
- Otherwise → pause for human review

#### Sub-state: EVALUATION_WINDOW

Process the next N issues from the queue (evaluation window from program.md, default 3) with the improved skill. Normal RUN_ISSUE → CAPTURE_METRICS flow.

#### Sub-state: RATCHET_DECIDE

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" evaluate --skill issue-flow --window <N> --json
python3 "${AGENTS_SKILLS_ROOT}/_shared/ratchet.py" decide --skill issue-flow --json
```

Decision logic:
1. Hard constraint gate fails → **REVERT**
2. ΔS > 0.02 → **KEEP**
3. ΔS < -0.02 → **REVERT**
4. |ΔS| ≤ 0.02 → **KEEP** (no regression)

Record to `.jarvis/context/autoflow/improvements.ndjson`:

```json
{
  "cycle_id": "cycle_<YYYYMMDD>_<NNN>",
  "timestamp": "<ISO 8601>",
  "skill": "issue-flow",
  "triggered_by_issue": 42,
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

### State: LOOP

Return to LOAD_PROGRAM. Re-read `program.md`, pop next issue from queue, continue.

---

## Pool Protocol (Throughput)

When `max_concurrent > 1` in `program.md`, autoflow runs a concurrency pool.

### Pool State

Tracked in `.jarvis/context/autoflow/pool.json`:

```json
{
  "max_concurrent": 3,
  "active": [
    { "issue_number": 42, "status": "running", "worktree": "../project-worktrees/42_feature", "started_at": "..." },
    { "issue_number": 57, "status": "waiting_human", "worktree": "../project-worktrees/57_fix", "gate": "prd_approval" }
  ],
  "completed_this_session": 5
}
```

### Pool Rules

1. **Dispatch**: If `active.length < max_concurrent` and queue has items, start next issue in its own worktree
2. **Human gate at checkpoint**: When an issue hits an active human gate (at or after checkpoint), move to `waiting_human` and dispatch next
3. **Completion**: When a `waiting_human` issue gets approval, it resumes
4. **Improvement cycles are SERIAL**: No new issues dispatched during improvement
5. **Worktree isolation**: Each issue gets its own worktree

---

## State Tracking

`.jarvis/context/autoflow/state.json`:

```json
{
  "status": "running|paused|stopped",
  "session_id": "session_20260328_001",
  "session_start": "<ISO 8601>",
  "approval_checkpoint": "after-spec",
  "issues_processed": 5,
  "current_issue": null,
  "consecutive_failures": 0,
  "paused_reason": null,
  "current_ratchet_score": 0.76,
  "ratchet_trend": [0.68, 0.72, 0.74, 0.76]
}
```

---

## Hard Stop Conditions

- `program.md` not found
- GitHub CLI not authenticated
- Max issues per session exceeded without human check-in
- Escalation policy triggered a full stop
- Unrecoverable git state (worktree corruption, merge conflicts)
- Hard constraint gate failure during evaluation

---

## Output Contract

For `start`: startup sequence output (checkpoint, prioritized queue, approval), then each issue as it begins/completes with ratchet score.
For `status`: current state, checkpoint, queue position, ratchet score, pool state.
For `metrics`: ratchet score breakdown + hard gate status + legacy quality metrics.
For `history`: formatted run log with outcomes, ratchet scores, improvement decisions.

---

## Safety Rules

1. Never process more issues than `max_issues_per_session` without human check-in.
2. Never auto-accept skill improvements for high blast_radius skills.
3. Never bypass quality gates — only human gates can be bypassed via approval checkpoint.
4. Never modify evaluation infrastructure (`_shared/*.py`, `_shared/*.md`).
5. Never modify `program.md` — it is the human control surface.
6. Always capture traces for every decision including bypassed gates — this is the audit trail.
7. If in doubt about any decision, escalate rather than proceed.
8. Always check hard constraint gates before keeping an improvement.
9. Never allow "pending_evaluation" state — every ratchet cycle ends with binary keep/revert.
10. Enforce time budgets — runs exceeding budget are timed_out.
11. Respect `max_autonomy` from program.md — never allow a checkpoint beyond this level.
12. `human-bypassed` traces do not count as "human rescue" in the ratchet `h` variable.
