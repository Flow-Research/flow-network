{{global}}

## Flow Harness Decisions

### Flow Platform POC — Architecture Decisions

**Agent Framework:**
- Fork OpenClaw as the base for Jarvis agent instances
- Extend with Flow-specific gateway, security, and operator capabilities
- EigenCloud for verifiable compute and TEE (Trusted Execution Environment) sandboxing
- X402 integration for payment protocol on personal operators

**Economic Model:**
- Bittensor is the initial external value source (may expand beyond Bittensor later)
- Flow operates as a **miner** on Bittensor subnets (not validator, not subnet owner)
- Rewards arrive as subnet **alpha tokens** (fungible, swappable to TAO or USDC)
- Alpha tokens are not pegged to fiat — value varies by subnet demand
- One TAO ~ $200; alpha tokens vary ($7-9 per token on active subnets)
- Alpha token supply capped at 21M per subnet with burn mechanics

**Reward Distribution:**
- Start with **centralized management** (Flow captures alpha tokens, converts, distributes in familiar currency)
- Evolve toward **decentralized direct distribution** (operators receive alpha tokens directly)
- Users see earnings in local currency (NGN, USD) — crypto is abstracted
- Smart contracts may handle on-chain distribution (under evaluation)

**Orchestrator Design:**
- Single orchestrator instance for POC; pool of orchestrators for scale
- Mines **across multiple subnets** (not limited to one)
- Decomposes subnet tasks into sub-tasks for personal operators
- Aggregates operator outputs and submits to subnet validators
- Must be reliable (property 1: always sources and distributes tasks)

**WorkStream Design:**
- Conceptualized as a **mempool-like environment** (inspired by blockchain mempools)
- Tasks posted by orchestrator, claimed by active operators
- Mechanisms TBD: exclusive claim vs competitive submission, task matching by capability
- Architecture should be **flexible** on distribution strategy (easy to change later)

**Task Pipeline:**
- Tasks originate from Bittensor subnet users (AI training, ML research, data tasks)
- Initial focus: subnets with AI/ML use cases (majority of current 129 subnets)
- Target users: people with AI/ML knowledge or willingness to learn
- Apprenticeship model: complex tasks decomposed, junior contributors get simpler slices

**Three Required Properties:**
1. Reliable orchestrator — always sources tasks and distributes them
2. Quality submissions — operators produce work that passes subnet validation
3. Sustainable incentives — rewards cover operator compute costs and provide net positive earnings

### Flow Core (Rust) — Architecture Decisions (Unchanged)

**Storage:** IPLD + RocksDB (blocks), SQLite/Postgres via SeaORM (metadata), append-only events
**Network:** QUIC primary, Kademlia DHT + mDNS, GossipSub, Circuit Relay v2
**Identity:** did:key with Ed25519, WebAuthn passkeys, VCs with delegation chains
**AI:** nomic-embed-text (768 dims), llama3.1:8b for RAG, HNSW in-memory vectors
