{{global}}

# Flow Harness Status

## Active Primary Work

- **Primary focus:** Flow Platform POC in `Focus/Flow/`
- **Current mode:** Active build-out of the end-to-end value flow
- **Sprint cadence:** 2-week cycles starting March 2026
- **Tracking source:** AnyType Kanban board in the Flow space

## Project Order

1. **Flow Platform POC** - validate Bittensor -> orchestrator -> operators -> rewards
2. **Jarvis CLI** - provide the runtime and commands needed by Flow operators
3. **Flow Core (Rust)** - paused until the POC validates the economic model
4. **Knowledge Base** - brainstorming only, not on the critical path

## Current Execution Goals

### Sprint 1

- [x] Install and harness architecture for skills, scripts, context, and AGENTS wiring
- [x] Remove stale context drift and align the workspace around the POC
- [ ] Finish global Jarvis installation via `uv tool install`
- [ ] Fork OpenClaw and bring up a baseline Jarvis agent runtime
- [ ] Implement `jarvis agent register` writing to `agent_registry`
- [ ] Implement the agent heartbeat loop
- [ ] Select the first Bittensor subnet to target

### Sprint 2

- [ ] Implement `jarvis agent run` execution loop
- [ ] Add skill-to-task mapping configuration
- [ ] Implement the gateway for routing, security, and session binding
- [ ] Register as a miner on the chosen subnet
- [ ] Implement task decomposition from subnet task -> operator sub-tasks

## Active Blockers

1. **Subnet selection** - no Bittensor subnet has been chosen yet, which blocks Phase 3.
2. **Agent runtime** - `jarvis agent register/run` does not exist yet, which blocks Phase 2.
3. **Global Jarvis install** - contributors still rely on aliases instead of a clean `uv tool install` path.

## Working Constraints

- Single orchestrator instance for the POC
- Single subnet for the first validation loop
- Small set of test operators rather than a scaled deployment
- Centralized reward distribution before direct decentralized payout
- Local machine compute only; no cloud TEE path yet
- Wallet-based auth only

## POC Success Criteria

- The orchestrator reliably sources, decomposes, assigns, and submits tasks.
- Operators produce work that passes subnet validation.
- Rewards cover operator compute cost and create net positive earnings.
- The platform can show basic earnings visibility to users.

## Related Canonical Docs

- `projects.md` - project inventory and repo map
- `roadmap.md` - phase sequencing and milestones
- `team.md` - ownership and delegation model
- `decisions.md` - accepted architecture and economics decisions
