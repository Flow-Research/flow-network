{{global}}

## Flow Harness Projects (Workspace)

### Flow Platform — POC (Active Primary)
**Location:** `Focus/Flow/`
**Tech Stack:** Python/FastAPI, PostgreSQL, React, Solidity/Foundry, Base Chain

**Purpose:** Human+AI economic coordination platform. Users get a personal AI agent (Jarvis) that earns on their behalf by completing tasks sourced from Bittensor subnets. The platform abstracts crypto/AI complexity behind a simple earnings product.

**System Components:**
- **Orchestrator (Miner Service):** Sources tasks from Bittensor subnets, decomposes into sub-tasks, distributes to personal operators, aggregates results, submits to subnet for rewards
- **Personal Operators:** User-bound AI agents that execute tasks on behalf of their human. Built on OpenClaw (modified fork)
- **WorkStream:** Task exchange environment where the orchestrator posts decomposed tasks and operators claim/execute them
- **Gateway:** Policy layer defining how Jarvis instances behave — security config, channel routing, session binding, operator/orchestrator integration
- **Smart Contracts:** FlowEscrow (payment), FlowArtifactRegistry (provenance) on Base Sepolia

**Value Flow:**
- Bittensor subnet users submit tasks (pay in alpha tokens via TAO)
- Orchestrator mines subnets as a miner, receives alpha token rewards
- Rewards distributed to personal operators and their humans
- Users see earnings in familiar currency (NGN, USD), crypto abstracted

**Backend:** FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL
**Frontend:** React + Vite + wagmi (wallet connect), Tailwind CSS
**Contracts:** Solidity, Foundry (Base Sepolia)
**Integrations:** AnyType API, Google Sheets, IPFS/Pinata, Anthropic AI

**Deployed Contracts (Base Sepolia):**
- MockCNGN: `0xfdf794bfBC24bCc7aE733a33a78CE16e71024821`
- FlowEscrow: `0xf10D75Bd61eA5071677aE209FD3a9aA334Ac14FF`
- FlowArtifactRegistry: `0x120ddd1Be4534d2Bd24009b913eB3057a2251751`

---

### Flow Core — P2P Engine (Paused)
**Location:** `Flow/`
**Status:** Phase 3 complete (~95%), Phase 4 (Agent Framework) ready to start, paused for POC
**Tech Stack:** Rust, libp2p, RocksDB, Sea-ORM, Axum, Qdrant, React/Vite

**Purpose:** Decentralized P2P runtime for content-addressed storage, peer-to-peer networking, and semantic search. Will serve as the long-term infrastructure layer under the Flow platform.

**Codebase:** ~35,500 lines Rust, 486+ tests
**Agent file:** `Flow/AGENTS.md` (project-specific instructions)

---

### Jarvis CLI (Active Tooling)
**Location:** `Jarvis/`
**Tech Stack:** Python 3.11+, Click, Rich, Pydantic, AnyType/Notion backends
**Run:** `uv run jarvis <command>`

**Purpose:** Personal AI CLI for task scheduling, journaling, and context management. Two-tier context system (global + folder). Pluggable backends (AnyType, Notion).

**Agent file:** `Jarvis/AGENTS.md` (461 lines, comprehensive CLI docs)

---

### Knowledge Base (Brainstorming)
**Location:** `knowledge-base/`
**Tech Stack:** Python (content agents) + Astro 5 (static site) + GitHub Actions

**Purpose:** AI-powered tech knowledge base. Agents discover updates from GitHub releases and arXiv papers, generate content, human reviews via PRs, CI deploys.

---

### Other (Reference/Experiments)
- `anytype-automation/` — Python scripts connecting AnyType to Google Sheets
- `flow-demo/` — Next.js 15 demo with AT Protocol, Prisma, shadcn/ui
- `research projects/MCP/` — 6 Model Context Protocol experiments
- `Flow-bkp/` — Earlier Flow iteration in Go (superseded by Rust version)
- `anytype/` — Full AnyType codebase (not Julian's, reference only)
- `automerge-go/`, `automerge-repo-quickstart/` — CRDT reference code
