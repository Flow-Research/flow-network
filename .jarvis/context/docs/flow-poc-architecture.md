# Flow Platform POC — Architecture

Date: 2026-03-16
Status: Active
Sources: AnyType project docs, Flow Design Brief, March 14 team meeting, deep system analysis

## One-Line Summary

Flow is a platform where every user gets a personal AI agent that earns money by completing tasks sourced from Bittensor subnets, with the crypto complexity fully abstracted.

## System Model

```
┌─────────────────────────────────────────────────────────┐
│                    BITTENSOR NETWORK                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Subnet A │  │ Subnet B │  │ Subnet C │  ... (129+)  │
│  │ (ML)     │  │ (Data)   │  │ (Code)   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      │ tasks + alpha token rewards       │
└──────────────────────┼──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  ORCHESTRATOR   │
              │ (Miner Service) │
              │                 │
              │ - Registers as  │
              │   miner on      │
              │   subnets       │
              │ - Receives tasks│
              │ - Decomposes    │
              │ - Aggregates    │
              │ - Submits       │
              └────────┬────────┘
                       │ decomposed sub-tasks
              ┌────────▼────────┐
              │   WORKSTREAM    │
              │ (Task Exchange) │
              │                 │
              │ - Mempool-like  │
              │ - Tasks posted  │
              │ - Operators     │
              │   claim tasks   │
              └──┬─────┬─────┬──┘
                 │     │     │
          ┌──────▼┐ ┌──▼──┐ ┌▼──────┐
          │ Op A  │ │Op B │ │ Op C  │  ... (Personal Operators)
          │       │ │     │ │       │
          │Jarvis │ │Jarv.│ │Jarvis │
          │inst.  │ │inst.│ │inst.  │
          └───┬───┘ └──┬──┘ └───┬───┘
              │        │        │
          ┌───▼───┐ ┌──▼──┐ ┌──▼───┐
          │User A │ │Usr B│ │User C│  (Humans)
          └───────┘ └─────┘ └──────┘
```

## Component Breakdown

### Orchestrator (Miner Service)

The central coordinator. Registers as a miner on Bittensor subnets and bridges subnet demand to personal operators.

**Responsibilities:**
- Connect to and mine across multiple Bittensor subnets
- Receive tasks from subnet validators
- Decompose complex tasks into sub-tasks suitable for personal operators
- Post sub-tasks to WorkStream
- Aggregate completed sub-task results from operators
- Submit aggregated output back to subnet validators
- Receive alpha token rewards on successful submission

**Key Properties (must guarantee):**
1. **Reliability** — Always sources tasks and distributes them (liveness)
2. **Quality** — Aggregated submissions pass subnet validation
3. **Sustainability** — Rewards exceed operational + compute costs

**POC:** Single instance. Scale later to a pool of orchestrators for fault tolerance.

### Personal Operators (Jarvis Instances)

Each user gets one. A persistent AI agent that works on their behalf.

**Built on:** Jarvis (our agent runtime), with the agent execution layer forked from OpenClaw and extended

**Capabilities:**
- Claim tasks from WorkStream based on user's skills/interests
- Execute tasks using AI + user's private knowledge base
- Request human input when needed (approval, expert knowledge)
- Submit completed work back through WorkStream to orchestrator
- Build reputation over time (more reputation = more/better tasks)

**Compute:** Hybrid — local-first with EigenCloud (verifiable VMs + TEEs) fallback

**Agent identity:** Each operator has its own identity, wallet, and reputation score

### WorkStream (Task Exchange)

The environment where tasks are distributed and claimed.

**Design inspiration:** Blockchain mempool — tasks exist in a shared space, operators pick from it.

**Mechanisms (TBD, keep architecture flexible):**
- Exclusive claim vs competitive submission (multiple operators solve, fastest wins)
- Task matching by operator capability, reputation, and interest alignment
- Anti-redundancy: prevent multiple operators solving the same task unnecessarily
- Fair distribution: no bias toward any particular operator

**POC:** Simple queue or pub/sub. Sophistication comes later.

### Gateway

Policy layer for all Jarvis instances. Not a running service — a set of rules and configurations.

**Defines:**
- Who/what can access a Jarvis instance
- Security configuration (secrets, validation schemas)
- Channel routing (how requests reach the agent)
- Session binding (context per session)
- Operator-orchestrator integration policies

**Security-first:** Default-secure configurations. Users can relax policies but start locked down.

### Platform UI

User-facing layer. Users never see Bittensor, subnets, or alpha tokens.

**What users see:**
- Earnings dashboard (in local currency: NGN, USD)
- Task activity feed (what their agent is working on)
- Jarvis conversation interface (onboarding, skill setup, manual input)
- Withdrawal to familiar rails (mobile money, bank transfer)

**What users don't see:**
- Bittensor mechanics, alpha token conversions, subnet details
- Orchestrator internals, task decomposition logic
- Wallet management (handled by Jarvis)

## Value Flow

```
Bittensor subnet users submit tasks (pay in alpha tokens via TAO)
  → Subnet validators distribute tasks to miners
    → Orchestrator (our miner) receives tasks
      → Decomposes into sub-tasks, posts to WorkStream
        → Personal operators claim and execute
          → Operators submit results to orchestrator
            → Orchestrator aggregates and submits to subnet
              → Subnet validates, releases alpha token reward
                → Flow takes operational cut
                  → Remaining reward distributed to operators/users
```

**Revenue model:**
- Alpha tokens earned from subnet mining
- Flow takes a percentage for operations, infrastructure, development
- Remainder flows to users/operators
- Users see earnings in local currency (conversion handled by platform)

**Unit economics target:**
- If an operator costs ~$10/day to run (compute)
- Rewards must exceed that cost to be sustainable
- Measure: net earnings per operator per day after costs

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Agent runtime | OpenClaw (fork) | Existing agent framework, extensible, active community |
| Verifiable compute | EigenCloud | TEEs, verifiable agent execution, VM sandboxing |
| Payment protocol | X402 | Payment integration for personal operators |
| Backend API | FastAPI + SQLAlchemy | Existing Focus/Flow stack, async Python |
| Frontend | React + Vite | Existing Focus/Flow stack |
| Smart contracts | Solidity/Foundry, Base | Existing contracts (FlowEscrow, FlowArtifactRegistry) |
| Blockchain | Bittensor (external) | Subnet economy, alpha token rewards |
| Task exchange | TBD (mempool-like) | Could be message queue, pub/sub, or custom protocol |

## Team Ownership

| Component | Team | Lead |
|-----------|------|------|
| Gateway, security, agent framework | Agent/Jarvis team | Rise |
| Bittensor integration, miner service, blockchain | Bittensor team | Gbolahan + Ojogo |
| WorkStream UI, earnings dashboard | Platform team | TBD |
| Architecture, coordination | Julian | — |

## Open Questions

Status as of March 2026:

- **Task decomposition strategy:** POC starts with LLM-based splitting reviewed by humans. Acknowledged as core technical risk. See `docs/flow-overview.md` (What Flow Does, step 2; Risks, item 3).
- **Quality assurance:** Resolved. Pre-submission QA, operator reputation, human-in-the-loop. See `docs/flow-overview.md` (Quality Assurance).
- **Reward distribution mechanics:** Resolved. Centralized for POC: Flow captures alpha tokens, converts to fiat, distributes to users. Decision from March 14 kickoff meeting.
- **Orchestrator scaling:** Single instance for POC. Scale trigger: when single instance becomes reliability bottleneck or demand exceeds throughput. Not near-term.
- **Subnet selection:** Open. Criteria defined: active miners, clear task format, measurable quality, reasonable reward rate. See roadmap Phase 3.
- **Operator matching:** Open. Start with simple capability tags. Learned matching deferred.
- **Trust/autonomy gradient:** Partially addressed. Reputation score unlocks harder tasks and greater autonomy. Detailed mechanics TBD.

## Cold Start Strategy

From the design brief: "WorkStream with a simplified Jarvis (smart profile + matching, not full autonomous agent) is the right first product."

**POC sequence:**
1. Get a single Jarvis agent running (OpenClaw fork)
2. Connect orchestrator to one Bittensor subnet
3. Simple task decomposition (even manual at first)
4. One operator completes one round-trip (task -> execution -> submission -> reward)
5. Measure the value flow. Iterate.

Don't build all three systems at once. Validate the economics with the simplest possible implementation, then invest in sophistication.

## Key References

- `docs/flow-deep-system-analysis.md` — Strategic analysis of the full vision
- `docs/flow-v1-unit-economics-model-appendix.md` — Unit economics model
- AnyType: "15 - The Flow Project" — Vision, flywheel, funding mechanisms
- AnyType: "Flow: Design Brief" — UX design, user journey, phased functionality
