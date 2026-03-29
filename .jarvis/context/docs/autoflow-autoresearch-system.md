# Autoflow: The Autoresearch System for Autonomous Software Delivery

> Complete system documentation for Flow's autonomous issue processing,
> quality measurement, and skill self-improvement loop.

## What Is Autoflow?

Autoflow is Karpathy's autoresearch pattern applied to software delivery. Instead of training ML models overnight, it processes GitHub issues autonomously, measures the quality of each delivery, and improves its own skills when quality degrades — keeping only improvements that demonstrably work.

The core guarantee: **the system can only get better or stay the same — never silently degrade.**

---

## The Three-File Contract

Every autoresearch system has strict separation between three types of files. This separation is what makes the ratchet trustworthy.

### 1. Editable Files (the "train.py")

Skill instructions that the system is allowed to modify through improvement cycles:
- `SKILL.md` — orchestration logic, constraints, decision guidance
- `commands/*.md` — phase specifications, gate logic
- Templates and checklists

### 2. Fixed Evaluation Infrastructure (the "prepare.py")

Scripts that measure quality — never modified by agents:
- `_shared/ratchet.py` — multiplicative composite metric + hard constraint gates + ratchet mechanics
- `_shared/run_metrics.py` — raw metrics from decision traces
- `_shared/trace_capture.py` — records decision traces
- `_shared/trace_query.py` — queries accumulated traces for patterns
- `_shared/promote_check.py` — checks for unpromoted improvements

**If agents could modify how they're measured, the ratchet would be meaningless.**

### 3. Human Control Surface (the "program.md")

`program.md` at the repository root is the human steering mechanism. Agents read it every loop iteration but never modify it. It controls:
- Optimization metric configuration
- Hard constraint thresholds
- Approval checkpoint default and max autonomy
- Time budgets
- Issue source and filtering
- Quality standards and improvement rules
- Escalation policy
- Loop cadence

---

## The Optimization Metric

### Why Multiplicative, Not Weighted Sum

A weighted sum (`0.5*a + 0.3*b + 0.2*c`) lets one strong variable compensate for a weak one. A system that fails on quality could still score well if it's fast.

A multiplicative composite (`a^0.35 * b^0.25 * c^0.25 * d^0.15`) punishes weakness in any dimension. Both factors must be good for a high score.

### Layer 1 (Default)

```
S = f^0.35 · p^0.25 · q^0.25 · (1-r)^0.15
```

| Variable | Meaning | Range | Source |
|----------|---------|-------|--------|
| f | Final success rate | [0,1] | completed / total runs |
| p | First-pass success rate | [0,1] | gates with 0 refinement loops / total gates |
| q | Output quality | [0,1] | test pass rate from QA phase |
| r | Refinement burden | [0,1] | avg_loops / 5.0, capped |

### Layer 2 (After 10+ runs)

```
S = f^0.35 · p^0.20 · q^0.20 · (1-r)^0.10 · (1-h)^0.10 · (1-c)^0.05
```

Adds human intervention rate (h) and normalized cost (c).

### Hard Constraint Gates (Vetoes)

These are disqualifying — any violation rejects an improvement regardless of score:

| Constraint | Threshold | Action |
|------------|-----------|--------|
| Catastrophic failure rate | > 0 | Immediate revert |
| Regression rate | > 0.1 | Revert |
| Human dependence | > 0.5 | Revert |

### Significance Threshold

```
ΔS > 0.02   → KEEP (improvement confirmed)
ΔS < -0.02  → REVERT (regression confirmed)
|ΔS| ≤ 0.02 → KEEP (within noise, no regression)
```

### Practical Example

```
Perfect score:          1.0000
Good (0.9/0.8/0.85):   0.8464
Weak quality (q=0.2):  0.5895  (old weighted sum would give 0.6850)
Weak success (f=0.2):  0.5000  (old weighted sum would give 0.6025)
```

The multiplicative composite punishes weakness ~15-17% harder.

---

## The Complete `/autoflow start` Sequence

### Step 1: Load Program

Read `program.md` from the repository root. Parse all configuration sections. If missing, HARD STOP.

### Step 2: Choose Approval Checkpoint

The human picks a trust level that controls which human gates auto-approve:

| Preset | What It Means |
|--------|--------------|
| `after-brainstorm` | Human reviews brainstorm, then autonomous |
| `after-design` | Human reviews design, then autonomous |
| `after-spec` | Human reviews tech spec, then autonomous **(default)** |
| `after-scope` | Human reviews execution scope, then autonomous |
| `after-qa` | Autonomous through QA, human reviews before PR |
| `after-pr` | Autonomous through PR, human does final acceptance only |
| `full-auto` | No human gates (quality gates only) |
| `all-gates` | Every human gate pauses (safest, legacy behavior) |

**Quality gates are NEVER bypassed regardless of preset.** Only human gates can be auto-approved.

`program.md` can set a `max_autonomy` level to cap how much trust is allowed.

### Step 3: Fetch Eligible Issues (Deep Inspection)

Not just titles — autoflow fetches the **full body and comments** of every eligible issue:

```bash
gh issue list --label autoflow --state open \
    --json number,title,body,labels,assignees,createdAt,milestone,comments
```

Filters out issues labeled `blocked`, `wontfix`, or `duplicate`.

### Step 4: Load Project Strategy Context

Reads from `.jarvis/context/`:
- `status.md` — current project status, active priorities
- `roadmap.md` — upcoming milestones, strategic direction
- `docs/strategy/README.md` — strategic context (if exists)
- Active specs in `.jarvis/context/specs/` — ongoing epic work

### Step 5: Evaluate and Prioritize

For each issue, assess:

| Factor | Signal |
|--------|--------|
| Strategic alignment | Does it advance current roadmap priorities? |
| Dependency order | Does it block or depend on other issues? |
| Readiness | Well-specified? Clear acceptance criteria? |
| Complexity | Bug fix vs. feature — affects time budget and risk |
| Risk | Does it touch high blast_radius areas? |

### Step 6: Present Queue for Approval

```
Proposed work queue (5 eligible issues):

 1. #42 — Add input validation to registration flow
    Strategic: Blocks #48 (registration epic). Well-specified. Low complexity.

 2. #45 — Fix auth redirect on expired sessions
    Strategic: User-facing bug, aligns with stability priority.

 3. #48 — Registration flow end-to-end
    Strategic: Registration epic milestone. Depends on #42.

Approval checkpoint: after-spec
Session limit: 20 issues

Approve this order? (y / reorder / skip issues)
```

The human can approve, reorder, or skip specific issues. The approved queue is stored in `.jarvis/context/autoflow/queue.json`.

### Step 7: Begin Experiment Loop

Process issues from the approved queue in order.

---

## The Experiment Loop (Per Issue)

Each issue is one "experiment" in the autoresearch sense.

### Processing an Issue

1. **Pop next from queue** — take the next issue in the approved order
2. **Start timer** — time budget enforcement (default 30 min per issue)
3. **Invoke issue-flow** — `/issue-flow issue <number>`
4. **18 phases execute** — with gates enforced per checkpoint setting:

```
Phase 0:  Issue readiness & clarification recovery
Phase 1:  Brainstorm (human gate: brainstorm_approval)
Phase 2:  PRD generation
Phase 3:  PRD review (human gate: prd_approval) — PAUSE point
Phase 4:  Design specification
Phase 5:  Design review (human gate: design_approval) — PAUSE point
Phase 6:  Tech specification
Phase 7:  Tech spec review (human gate: tech_spec_approval) — PAUSE point
Phase 8:  Execution scope (human gate: execution_scope_approval)
Phase 9:  Implementation
Phase 10: Regression scenario generation
Phase 11: Test code generation
Phase 12: Test quality validation
Phase 13: QA execution
Phase 14: Simplicity and architecture review
Phase 15: PR creation and CI resolution
Phase 16: Final verification (human gate: final_acceptance) — PAUSE point
Phase 17: Closeout and GitHub sync
```

### What Happens at Human Gates

**If gate phase < checkpoint phase (auto-approve):**
- Gate is bypassed — trace captured as `human-bypassed`
- Agent proceeds without pausing
- Audit trail preserved for ratchet analysis

**If gate phase >= checkpoint phase (human reviews):**

1. **Review skill runs first** — a specialized review skill (e.g., `prd-spec-review`) analyzes the artifact through expert lenses and fixes obvious issues before the human sees it

2. **Human gate activates** — issue-flow presents the reviewed artifact and stops:
   ```json
   { "phase.status": "paused_awaiting_instruction" }
   ```

3. **If human APPROVES:**
   - Artifact committed and linked on GitHub issue
   - Trace captured: `outcome: "approved", refinement_loops: 0`
   - State advances to next phase (after explicit instruction at pause points)

4. **If human REJECTS (refinement loop):**
   - Human provides feedback: "Acceptance criteria aren't testable"
   - Trace captured with feedback text and categories:
     ```
     outcome: "rejected", refinement_loops: 1,
     feedback: "Acceptance criteria aren't testable",
     category: UNCLEAR_CRITERIA
     ```
   - Agent reworks the artifact addressing the feedback
   - Re-presents to human
   - Loop counter increments
   - Repeats until approved

**Quality gates (automated) run regardless of checkpoint:**
- `spec_gate`, `design_completeness_gate`, `regression_coverage_gate`, etc.
- These are pass/fail checks with bounded retries
- No human involvement — automated validation

### After Issue Completes

Autoflow captures the run record:

```json
{
  "run_id": "run_20260328_001",
  "issue_number": 42,
  "outcome": "completed",
  "phases_completed": 17,
  "total_refinement_loops": 3,
  "first_pass_gates": 17,
  "total_gates": 19,
  "duration_seconds": 1420,
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

---

## Feedback and Improvement

Two feedback loops operate at different timescales.

### Short Loop: Per-Gate (Immediate)

Every gate resolution captures a decision trace. Before the next time that gate runs (even in the same session), the agent queries recent traces:

```bash
trace_query.py recent --skill issue-flow --gate prd_approval --limit 5 --min-loops 1
```

Output:
```
PATTERNS (recurring in 3+ traces):
- "acceptance criteria" (4/5)
- "not testable" (3/5)

RECENT FEEDBACK:
- [2026-03-28] (rejected, 2 loops) "Acceptance criteria not testable"
- [2026-03-27] (approved, 1 loop) "Missing mobile use case"
```

The agent applies this as extra constraints before producing output. This means feedback from one issue immediately influences the next.

### Long Loop: Skill Improvement (After Every Issue)

After every completed issue, autoflow evaluates whether improvement is needed:

1. **Check thresholds** — if any gate averages > 1.5 refinement loops, improvement fires
2. **Snapshot** — `ratchet.py snapshot` creates a git tag and records baseline score
3. **Analyze traces** — `/skill-improve` reads accumulated feedback patterns
4. **Propose changes** — concrete diffs to skill instructions, backed by trace evidence

Example proposal:
```diff
  ## Phase 3: PRD Review

+ Before writing the PRD, ensure every acceptance criterion is:
+   1. Independently verifiable with a concrete test scenario
+   2. Written as "Given X, When Y, Then Z" format
+   3. Free of subjective language ("should look good", "fast enough")
```

5. **Auto-accept or human review** — per `program.md` rules:
   - 3+ traces agree, additive change, medium or lower blast_radius → auto-accept
   - High blast_radius or weakening change → requires human approval

6. **Evaluation window** — run 3 more issues with the improved skill

7. **Ratchet decide** — binary keep or revert:
   ```bash
   ratchet.py evaluate --skill issue-flow --window 3
   ratchet.py decide --skill issue-flow
   ```
   - Hard constraint violated → REVERT
   - ΔS > 0.02 → KEEP
   - ΔS < -0.02 → REVERT
   - Within noise → KEEP (no regression)

8. **If reverted** — skill files restored to the git tag snapshot. The improvement is logged with the reason.

---

## State Architecture

### Per-Project State (`.jarvis/context/autoflow/`)

Each project has its own autoflow state — enables concurrent multi-repo usage:

| File | Contents |
|------|----------|
| `state.json` | Loop status, checkpoint, issues processed, ratchet score |
| `queue.json` | Approved issue queue with prioritization reasoning |
| `pool.json` | Concurrency pool state (if max_concurrent > 1) |
| `runs.ndjson` | Run-by-run log with extended metrics |
| `improvements.ndjson` | Improvement cycle log with ratchet decisions |
| `ratchet_*.json` | Per-skill ratchet state: baseline, candidate, decision |

This directory is gitignored (runtime state, not source).

### Global Traces (`~/.agents/traces/<skill>/`)

Decision traces are per-skill and cross-project. The ratchet reads from these:

| File | Contents |
|------|----------|
| `traces.ndjson` | Every gate resolution with feedback, categories, loops |
| `improvements.ndjson` | Skill improvement history |
| `index.md` | Human-readable summary (regenerated by `trace_query.py summarize`) |

### Ratchet Tags (Git)

Every improvement cycle creates a git tag: `ratchet/<skill>/<timestamp>`. These are rollback points — if an improvement degrades quality, the skill reverts to the tagged state.

---

## The State Machine

```
/autoflow start
    │
    ├─ STARTUP (steps 1-6: program.md, checkpoint, prioritize, approve queue)
    │
    └─ EXPERIMENT LOOP
         │
         ├─ LOAD_PROGRAM (re-read program.md each iteration)
         │
         ├─ NEXT_FROM_QUEUE (pop next issue)
         │
         ├─ CHECK_LIMITS (session max?)
         │
         ├─ RUN_ISSUE (/issue-flow with checkpoint enforcement)
         │     │
         │     ├─ Human gate before checkpoint → auto-approve
         │     ├─ Human gate at/after checkpoint → PAUSE for review
         │     └─ Quality gate → always enforced
         │
         ├─ CAPTURE_METRICS (run record to runs.ndjson)
         │
         ├─ EVALUATE_QUALITY (check thresholds, compute ratchet score)
         │     │
         │     ├─ Threshold breached → IMPROVEMENT_CYCLE
         │     └─ Within thresholds → LOOP
         │
         ├─ IMPROVEMENT_CYCLE (when triggered)
         │     ├─ SNAPSHOT (git tag + baseline score)
         │     ├─ RUN_SKILL_IMPROVE (analyze traces, propose diffs)
         │     ├─ EVALUATION_WINDOW (3 issues with improved skill)
         │     └─ RATCHET_DECIDE (keep or revert — binary, no pending)
         │
         └─ LOOP (back to LOAD_PROGRAM)
```

---

## Pool Protocol (Concurrency)

When `max_concurrent > 1` in `program.md`:

- Multiple issues process simultaneously in separate git worktrees
- When an issue hits an active human gate, it moves to `waiting_human` and the next issue starts
- Improvement cycles are always serial — no concurrent skill edits
- Each issue gets its own worktree at `../<project>-worktrees/<issue_id>_<name>`

---

## Safety Rules

1. Never process more issues than `max_issues_per_session` without human check-in
2. Never auto-accept skill improvements for high blast_radius skills
3. Never bypass quality gates — only human gates via approval checkpoint
4. Never modify evaluation infrastructure (`_shared/`)
5. Never modify `program.md` — human control surface only
6. Always capture traces for every decision including bypassed gates
7. Always check hard constraint gates before keeping an improvement
8. Never allow "pending_evaluation" state — every ratchet cycle is binary
9. Enforce time budgets — runs exceeding budget are timed_out
10. Respect `max_autonomy` from program.md

---

## All Skills Are Autoresearch-Enabled

Every Flow skill includes `autoresearch: enabled: true` in its `manifest.yaml`. This is the default for all new skills created with `/skill-create`. Autoflow discovers autoresearch-enabled skills and can orchestrate the improvement loop for any of them — issue-flow is just the first consumer.

### Manifest Convention

```yaml
autoresearch:
  enabled: true
  metric_layer: 1
  time_budget_seconds: 1200   # by blast_radius: high=1800, medium=1200, low=600
  evaluation_window: 3
  constraints:
    max_regression_rate: 0.1
    max_human_intervention: 0.5
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `program.md` | Human control surface — thresholds, constraints, cadence |
| `tools/flow-install/skills/autoflow/commands/autoflow.md` | Full command specification with state machine |
| `tools/flow-install/skills/autoflow/SKILL.md` | Skill overview and orchestration |
| `tools/flow-install/skills/autoflow/manifest.yaml` | Metadata, state paths, gates |
| `tools/flow-install/skills/_shared/ratchet.py` | Multiplicative metric + hard gates + ratchet mechanics |
| `tools/flow-install/skills/_shared/autoresearch.md` | Reusable protocol specification |
| `tools/flow-install/skills/_shared/run_metrics.py` | Raw metrics from traces |
| `tools/flow-install/skills/_shared/trace_capture.py` | Decision trace recording |
| `tools/flow-install/skills/_shared/trace_query.py` | Trace querying and pattern extraction |
| `.jarvis/context/autoflow/` | Per-project runtime state (gitignored) |
| `~/.agents/traces/` | Global decision traces (per-skill) |
