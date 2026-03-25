{{global}}

# Flow Harness Team

## Ownership Map

| Track | Lead | Focus |
|---|---|---|
| Agent / Jarvis | Rise + team | Agent runtime, Jarvis CLI, skills, personal operators |
| Bittensor / Blockchain | Gbolahan + Ojogo | Subnet mining, smart contracts, reward mechanics |
| Platform | TBD | WorkStream UI, earnings dashboard, onboarding |
| Coordination / Architecture | Julian | Architecture, orchestrator design, context, cross-track alignment |

## Delegation Principles

### Delegate

- Frontend implementation for the earnings dashboard and WorkStream UI
- Bittensor subnet research and miner registration execution
- Test coverage expansion and CI automation
- Operator-agent implementation once the runtime loop is stable
- Deployment automation and release hygiene

### Keep Central Ownership

- Core architecture decisions
- Economic model and value attribution
- Agent framework design and runtime contracts
- Security-critical gateway behavior
- Protocol and roadmap definitions

## Coordination Pattern

- Agent and Bittensor tracks move in parallel.
- Integration checkpoints are orchestrator <-> Bittensor and operator <-> task queue.
- Weekly syncs should capture blockers and decisions.
- Architectural decisions belong in `decisions.md`.

## Canonical Rule

This file is the canonical workspace-level team and delegation reference. Older delegation notes should point here rather than carry their own planning state.
