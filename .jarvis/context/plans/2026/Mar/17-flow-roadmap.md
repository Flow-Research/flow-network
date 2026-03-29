# Flow Network — Roadmap

**Date:** 2026-03-17
**Status:** Active
**Scope:** Full Flow roadmap from developer infrastructure through economic participation
**Source:** Deep review of workspace state + AnyType vision document (5 layers)

## Strategic Frame

Flow is a full stack for human+AI economic coordination:


| Component              | Role                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| **Flow**               | User-facing earnings/work product                                           |
| **Jarvis**             | Agent runtime and personal CLI                                              |
| **Orchestrator**       | Economic coordinator — mines Bittensor subnets, decomposes and routes tasks |
| **Personal Operators** | User-bound AI agents that execute tasks and earn on behalf of their human   |
| **WorkStream**         | Task exchange environment (mempool-like)                                    |
| **Bittensor**          | Initial external demand and reward source                                   |


Flow is infrastructure. Projects like pilot-project-a are customers/instances. Each user gets a personal Jarvis agent that can earn on their behalf.

## Architecture Layers

The vision spans 5 layers. This roadmap sequences them by dependency and validation priority.


| Layer                        | Scope                                                                   | Roadmap Phase         |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------- |
| L1: Developer Infrastructure | Jarvis CLI, skills, scripts, context, AGENTS.md                         | Phase 1 (done)        |
| L2: Agent Runtime            | Registration, heartbeat, task queue, execution loop, GitHub integration | Phase 2               |
| L3: Economic Participation   | Bittensor mining, contribution tracking, earnings, Flow Score           | Phases 3-5            |
| L4: Content & Communication  | Research automation, content generation, platform automation            | Deferred              |
| L5: Advanced/Future          | Context engineering, network abstractions, security, physical infra     | Deferred              |


## Context Separation Model

Flow and project instances (like AA) share infrastructure but keep context separate:


| Scope                 | Location                             | What Lives Here                                                 |
| --------------------- | ------------------------------------ | --------------------------------------------------------------- |
| Global (user)         | `~/.jarvis/context/`                 | Personal preferences, patterns, calendar                        |
| Flow infrastructure   | `Flow Network/.jarvis/context/`      | Architecture, skills catalog, plans, roadmap, tech debt         |
| Project instance (AA) | `pilot-project-a/.jarvis/context/` | Project specs, epics, meeting notes, AA-specific decisions      |
| Shared skills         | `~/.agents/skills/`                  | Both repos register skills here; agents discover from one place |


Jarvis CLI already supports this via two-tier context loading (global + folder).

---

## Phase 1: Foundation Hardening (This Week)

**Goal:** Clean up stale artifacts, fill gaps from the installation architecture work, make the workspace coherent.


| #   | Task                                                                                                         | Status    |
| --- | ------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Consolidate stale context files into canonical status and team docs                                          | Done      |
| 2   | Fix `projects.md` reference to `Flow/CLAUDE.md` → `Flow/AGENTS.md`                                           | Done      |
| 3   | Create `Focus/Flow/AGENTS.md` with POC-specific instructions                                                 | Done      |
| 4   | Align the canonical status and roadmap docs with the current execution plan                                  | Done      |
| 5   | Resolve Jarvis CLI distribution (TD-003) — `uv tool install` from Flow Network/Jarvis                        | Done. Local install works, `install.sh` exists, and cross-project rollout completed for pilot projects. GitHub publish remains an operational release step. |
| 6   | Audit `.env` files across sub-projects (ensure all gitignored)                                               | Open      |
| 7   | Installation architecture plan: Phases 0-5 complete, Phase 4 (memory) and Phase 6 (community skills) pending | Reference |


### L1 Completion Checklist

From the AnyType vision doc, Layer 1 items and their status:


| Item                                         | Status  | Notes                                                         |
| -------------------------------------------- | ------- | ------------------------------------------------------------- |
| Jarvis CLI in PATH everywhere                | Done    | Installed via `uv tool install` at `~/.local/bin/jarvis`. GitHub-based remote install pending (see installation-and-distribution plan). |
| Skills repository and management             | Done    | `tools/flow-install/skills/` is the shared source of truth; project-local skills live in `.agents/skills/` |
| Skill catalog merge (local + project + Flow) | Done    | `_catalog.md` + `pnpm skills:register`                        |
| AGENTS.md personalization                    | Done    | Root + sub-project AGENTS.md files, personal context protocol |
| Script repository                            | Partial | 6 lifecycle scripts exist; no script discovery via Jarvis yet |


---

## Phase 2: Agent Runtime — Core Loop (Weeks 1-2)

**Goal:** A Jarvis agent can register itself, receive a task, execute it using a skill, and report results.


| #   | Task                    | Description                                                                                                                                   |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `jarvis agent register` | New CLI command. Writes to Supabase `agent_registry` table (already exists in POC schema). Captures: agent_id, user_id, capabilities, status. |
| 2   | Agent heartbeat         | Background loop that keeps agent marked `active` in registry. Configurable interval (default 60s).                                            |
| 3   | `jarvis agent run`      | Execution loop: poll `agent_tasks` (status=available) → claim task → load matching skill → execute → update status + write results.           |
| 4   | Skill-task mapping      | Config file mapping task types to skills. E.g., `code_review → code-review skill`, `spec_generation → tech-spec skill`.                       |
| 5   | Task lifecycle          | Status flow: `available → claimed → in_progress → completed/failed`. Timeout and retry logic.                                                 |
| 6   | Result reporting        | Write `qa_results` JSONB to task record. Include: output artifacts, quality metrics, execution time.                                          |


### Dependencies

- Supabase instance with `agent_registry` and `agent_tasks` tables (exists in POC)
- Jarvis CLI with adapter for Supabase (may need new adapter or direct httpx calls)

---

## Phase 3: Bittensor Integration (Weeks 2-3)

**Goal:** Orchestrator can mine at least one Bittensor subnet, receive tasks, and capture rewards.


| #   | Task                        | Description                                                                                                       |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Subnet research             | Select 1 active subnet with AI/ML use case. Document: task format, validation criteria, reward mechanics.         |
| 2   | Miner registration          | Register Flow as a miner on chosen subnet. Stake TAO.                                                             |
| 3   | Task ingestion              | Orchestrator receives raw tasks from subnet validators.                                                           |
| 4   | Task decomposition          | Function that breaks subnet task into sub-tasks suitable for personal operators. Start simple (1:1 or 1:N split). |
| 5   | Result aggregation          | Function that combines operator outputs into a single submission for the subnet.                                  |
| 6   | Submission + reward capture | Submit aggregated result to subnet validators. Receive alpha tokens on success.                                   |


### Key Decision

- Which subnet first? Criteria: active miners, clear task format, measurable quality, reasonable reward rate.

---

## Phase 4: Personal Operators (Weeks 3-4)

**Goal:** User-bound operator agents can claim tasks from WorkStream and execute them.


| #   | Task                       | Description                                                                                                                 |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Operator agent             | Extension of Jarvis agent that is bound to a specific user. Inherits user's skills, preferences, and compute budget.        |
| 2   | WorkStream (task exchange) | Minimal implementation: orchestrator posts decomposed tasks, operators poll and claim.                                      |
| 3   | Gateway security           | Policy layer: which skills an operator can use, rate limits, session binding, channel routing.                              |
| 4   | Execute-and-report         | Operator claims task → executes via skill → reports result with quality score.                                              |
| 5   | Round-trip validation      | End-to-end test: subnet task → orchestrator decompose → operator execute → orchestrator aggregate → subnet submit → reward. |


### Architecture Note

- Gateway design should be **flexible on distribution strategy** (exclusive claim vs competitive, task matching by capability). Start with simplest model, iterate.

---

## Phase 5: Earnings & Measurement (Weeks 4-6)

**Goal:** Validate the three required properties. Users can see what they're earning.


| #   | Task                  | Description                                                                                                  |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Contribution tracking | Record: who completed what, quality score, time, complexity. New table or extend `agent_tasks`.              |
| 2   | Value attribution     | `task_value = base_rate × quality_multiplier × complexity_factor`. Compute per completed task.               |
| 3   | Earnings ledger       | `agent_earnings` table: user_id, task_id, amount, status, payout_date.                                       |
| 4   | Platform UI           | Basic dashboard: earnings per agent, task history, completion rate. Extend existing React frontend.          |
| 5   | Measurement           | Track: earnings/agent/day, task completion rate, submission quality score, reward vs compute cost.           |
| 6   | Property validation   | (1) Orchestrator reliably sources tasks? (2) Submissions pass subnet validation? (3) Net positive economics? |


### Success Criteria

- At least 1 subnet mined end-to-end
- At least 3 test operators running
- Positive unit economics (reward > compute cost per task)
- Users can see earnings in familiar currency

---

## Phase 6: Multi-Agent & Scale (Weeks 6-8+)

**Goal:** Scale from single agent to multi-agent operation. Automate the development workflow itself.


| #   | Task                  | Description                                                                                                 |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Multi-agent tmux      | `jarvis agent spawn --count=N` — spins up N agent instances in tmux panes. Each in its own worktree/branch. |
| 2   | GitHub integration    | GitHub Issue → auto-spawn agent → work → PR. Listen to webhooks, orchestrate task state.                    |
| 3   | Multi-subnet mining   | Orchestrator mines across multiple subnets. Task matching by operator capability.                           |
| 4   | Flow Score prototype  | Aggregated reputation: quality, reliability, speed, skill growth. Contextual per task type.                 |
| 5   | Operator pool scaling | Multiple orchestrator instances. Load balancing across operator pools.                                      |


---

## Deferred

### Layer 4: Content & Communication (No timeline)

- Research automation (git-sourced to partner platforms)
- Social media from journal entries
- Podcast generation, video (VO3, Flux, Kling AI), YouTube automation
- Meeting transcription (email → Jarvis), Discord recording, WhatsApp reading
- Calendar event management, screen recording, Raycast integration
- AnyType state management from git hooks

### Layer 5: Advanced/Future (No timeline)

- Context engineering, harness engineering, constraint optimization
- Memory management (QMD) for general agents
- Network abstractions (clusters, organizations, communities, governments)
- Agent security models, sandbox execution, principle of least privilege
- GPU compute, hardware/PCB, energy
- Merge economics, human capital investment, skills marketplace

### From Installation Architecture

- Memory system generalization (TD-002) — pending
- ~~Community skills installation~~ — Done. `--full` flag added to `community-skills-install` skill. 1,284 skills installed to `~/.agents/skills/`. Now part of the `install.sh` bootstrap flow.

---

## Open Questions

1. ~~**Jarvis distribution:**~~ Resolved. Local: `uv tool install ./Jarvis`. Remote: `uv tool install "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis"`. Full plan in `17-flow-installation-and-distribution.md`.
2. **Which Bittensor subnet first?** Need to research active subnets with clear AI/ML task formats.
3. **Operator compute budget:** How much compute does each operator get? Who pays? Start with user's local machine, evolve to EigenCloud TEE.
4. **Reward distribution model:** Centralized (Flow captures, converts, distributes) vs decentralized (operators receive alpha directly). Start centralized for POC.
5. **AA-specific agent tasks:** Coaching plans, story mapping, bulk operations, QA — tracked in AA's context, not here.

## References

- AnyType vision doc: `bafyreiewba7njrrydy4wswzhaepc43ylq2nyy4vov7p6wow2shapc5kfby`
- Installation and distribution: `.jarvis/context/plans/2026/Mar/17-flow-installation-and-distribution.md`
- Deep system analysis: `.jarvis/context/docs/flow-deep-system-analysis.md`
- POC architecture: `.jarvis/context/docs/flow-poc-architecture.md`
- Decisions: `.jarvis/context/decisions.md`
