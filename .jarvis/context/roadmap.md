{{global}}

# Flow Harness Roadmap

## Current Direction

The workspace is optimized around the Flow Platform POC. The near-term goal is not broad platform breadth; it is proof that the full value loop works in production-like conditions.

## Phase Sequence

| Phase | Goal | Timeline |
|---|---|---|
| Phase 1: Foundation | Clean workspace, install flow tooling, align context and harness | complete |
| Phase 2: Agent Runtime | Register, heartbeat, queue handling, execution loop | Weeks 1-2 |
| Phase 3: Bittensor | Mine one target subnet and receive rewards | Weeks 2-3 |
| Phase 4: Operators | Personal operator agents claim and execute tasks | Weeks 3-4 |
| Phase 5: Earnings | Contribution tracking, earnings ledger, basic UI | Weeks 4-6 |
| Phase 6: Scale | Multi-agent workflows, GitHub integration, multi-subnet support | Weeks 6-8+ |

## POC Milestones

- [ ] Orchestrator mines at least one Bittensor subnet end-to-end
- [ ] Personal operators claim and execute decomposed tasks from WorkStream
- [ ] Gateway enforces baseline security policies across agent instances
- [ ] Alpha token rewards flow back into the operator/human earnings loop
- [ ] Users can inspect earnings through a basic product UI
- [ ] Economics are measured with earnings/day, completion rate, and cost vs reward

## Priority Rules

1. End-to-end integration beats local optimization.
2. Architecture decisions beat cosmetic completeness.
3. Core runtime and orchestration beat advanced features.
4. Measurement is required before scale.
5. Deferred layers stay deferred until the POC loop is proven.

## Paused / Deferred Work

### Flow Core (Rust)

- Phase 3 is effectively complete and Phase 4 is ready to begin.
- Work remains paused until the POC validates the economic model and operator loop.

### Knowledge Base

- Still in brainstorming.
- No active execution unless it directly supports the POC or Jarvis runtime.

## Archive Rule

Completed one-off implementation plans belong under `plans/archive/` once they are no longer active guidance.
