# Brainstorm — Agent Memory System

## Overview

A persistent, hierarchical, backend-agnostic memory system for AI agents working on the the target project platform. The system enables agents (Claude Code, Jarvis CLI, future agents) and team members to store, retrieve, and share contextual memories that persist across sessions and compose across organizational scopes. The architecture is designed to evolve from a development-agent tool into a platform product feature powering AI-driven coaching.

## Problem Statement

AI coding agents in the the target project monorepo lose all context between sessions. Decisions made in one session are forgotten in the next. Project conventions must be manually re-explained. There is no structured way for agents to know what has been decided, what patterns apply at each level (org, project, app), or what a specific contributor's preferences are.

The existing `.jarvis/context/` vault provides static markdown context, but it lacks:
- Scoped retrieval (agent gets ALL context, not just what's relevant to its current scope)
- Semantic search (finding memories by meaning, not just file location)
- Multi-user support (personal context is gitignored but not composable with shared context)
- Backend flexibility (locked to filesystem, no path to database-backed retrieval)
- Temporal awareness (old decisions have the same weight as current ones)

## Target Audience

- **Primary (Phase 1-3):** AI coding agents (Claude Code, Jarvis CLI) and development team members working on the AA monorepo
- **Secondary (Phase 4):** AI coaching agents and platform users (founders, coaches) on the the target project platform

## Core Concept / Confirmed Product Decisions

### Backend-Agnostic Abstraction (MemoryProvider)

A `MemoryProvider` interface that any storage backend must implement. Providers can be composed behind a `MemoryRouter` that routes operations based on provider capabilities (read, write, search, semantic, graph, temporal). This means:
- Phase 1 uses a FileProvider (markdown files in `.jarvis/context/`)
- Phase 2 adds a SupabaseProvider (pgvector for semantic search)
- Future phases can add Redis, Neo4j, Cognee, or any other backend
- Multiple providers can be active simultaneously with capability-based routing
- Configuration-driven: which providers are active is a config choice, not a code change

### Hierarchical Scope Model

Memories belong to scopes arranged in a hierarchy. When retrieving context, an agent receives memories from its current scope AND all parent scopes, with closer scopes ranked higher priority.

**Development scopes (Phase 1-3):**
```
org:my-org
├── project:my-project
│   ├── app:api
│   ├── app:admin
│   ├── app:my-coach-app
│   └── app:cms
└── user:<username> (inherits from org)
```

**Product scopes (Phase 4, future):**
```
org:my-org
├── cohort:cohort-N
│   ├── founder:<name>
│   └── coach:<name>
```

Scope inheritance resolution: walk up the chain from current scope to root. Closer scope wins on conflict.

### Memory Types

Four types, kept deliberately minimal:

| Type | Purpose | Example |
|---|---|---|
| `fact` | Objective truths about the system | "API uses NestJS 10 with Drizzle ORM" |
| `decision` | Choices made with rationale | "We chose pnpm over npm for workspace support" |
| `preference` | Subjective preferences (per-user or per-org) | "Julian prefers detailed commit messages" |
| `event` | Time-bound occurrences | "Deployed v0.3 to staging on 2026-03-10" |

### Temporal Metadata

Basic temporal tracking from Phase 1: `created_at` and `status` (active / superseded) in frontmatter. More sophisticated temporal search (date ranges, progressive summarization) deferred to Phase 3.

## Unique Value Proposition

Unlike flat memory stores (conversation history buffers) or vendor-locked services (Mem0 cloud, Zep managed):
- **Composable scopes** -- memories inherit through a hierarchy, so you write once and it applies everywhere it should
- **Backend-agnostic** -- the same abstraction works over files, PostgreSQL, vector DBs, or graph DBs
- **Human-readable source of truth** -- files in `.jarvis/context/` are always readable, editable, and git-trackable
- **Multi-agent** -- any agent with file access or API access can participate
- **Product pathway** -- the scope model maps directly from dev (org/project/app/user) to product (org/cohort/founder/coach)

## Inspiration & References

### Frameworks Studied

| Framework | Key Pattern Borrowed |
|---|---|
| **Mem0** | Multi-level memory scopes (user, session, agent), hybrid vector + metadata retrieval, memory deduplication |
| **Zep** | Progressive summarization, temporal + semantic dual-search, entity extraction |
| **Letta** | Tiered memory architecture (RAM/disk metaphor), agent-controlled promotion/demotion |
| **Cognee** | Knowledge graph from unstructured data, graph traversal + vector hybrid retrieval |
| **LangChain Memory** | Composable memory types, pluggable storage backends |
| **LlamaIndex Memory** | Chat history + document context fusion, query engine integration |

### Technical Research

- Vector databases excel at broad semantic matching but score 60-70% on relationship queries
- Graph RAG (temporal knowledge graphs like Zep) achieves 94.8% accuracy on relationship queries
- Hybrid approach (vector for initial retrieval, graph for relational context) is the recommended architecture for advanced agent memory
- Source: MLM article "Vector Databases vs. Graph RAG for Agent Memory" (March 2026)

## Architecture Direction

### Phased Implementation

| Phase | What | Backend | Effort |
|---|---|---|---|
| **Phase 1** | Scoped file conventions, directory structure, frontmatter schema, CLI search | FileProvider (markdown in `.jarvis/context/`) | ~1 week |
| **Phase 2** | MCP memory server, MemoryProvider abstraction in TypeScript, Supabase memories table with pgvector | FileProvider + SupabaseProvider | ~2-3 weeks |
| **Phase 3** | Progressive summarization pipeline, temporal search, tier management | Summarization layer on top of existing providers | ~1-2 weeks |
| **Phase 4** | Product coaching memory, entity relationships, admin UI | Extended scope types + graph queries | TBD |

### Provider Composition Model

```
MemoryClient (MCP tools / CLI / SDK)
    └── MemoryRouter (resolves scopes, routes by capability)
         ├── FileProvider     [read, write]
         ├── SupabaseProvider [read, write, search, semantic, temporal]
         └── GraphProvider    [graph] (Phase 4)
```

Routing strategies: write-through (write to all), capability-based (semantic → Supabase, graph → graph provider), primary + fallback (files always readable).

## Data and Security Notes

- Personal memories (`user:<username>` scope) are gitignored and never committed
- Shared memories (org, project, app scopes) are git-tracked and reviewable in PRs
- Supabase RLS policies will enforce scope isolation in Phase 2+
- No secrets stored in memory entries (memory is context, not credentials)
- Privacy boundaries: founder memories never visible to other founders (Phase 4 concern, designed for now)

## User Flows

### Agent Reads Context (Phase 1)

1. Agent starts a session and reads `_scopes.yaml` from the memory root
2. Agent auto-detects its scope from the current working directory using glob patterns in the registry
3. Agent resolves the full scope chain by walking up parent references (e.g., `app:api → project:my-project → org:my-org`)
4. Agent appends user scope from system username (e.g., `user:julian`)
5. Agent reads memory files from each scope directory in chain order (closest first)
6. Closer scope memories take precedence on conflict
7. Agent injects composed memories into its working context

### Agent Writes a Memory (Phase 1)

1. Agent makes a decision or learns a fact during a session
2. Agent determines the narrowest scope where the memory is universally true (defaults to current scope)
3. Agent appends the memory entry to the appropriate type file (e.g., `decisions.md`) in the scope directory
4. Entry includes frontmatter: created_at, status, memory_type, source
5. Memory is immediately available to future sessions at that scope and all child scopes

### Contributor Onboards (Phase 1)

1. `pnpm setup` already creates `.jarvis/context/private/<username>/` (gitignored personal namespace)
2. The `user:<username>` memory scope maps directly to this existing directory -- no new directory needed
3. Contributor adds their preferences to `preferences.md` in their personal scope (`private/<username>/preferences.md`)
4. Their preferences compose with org/project memories automatically via scope chain resolution
5. Future: `jarvis init` becomes the primary onboarding interface when Jarvis is standard tooling

## Resolved Questions

### How does an agent determine its scope chain?

Hybrid auto-detection + override:

1. **Auto-detect from working directory.** A `_scopes.yaml` registry at the memory root defines glob patterns mapping file paths to scopes. An agent editing `apps/api/src/auth.ts` matches `apps/api/**` → resolves to `app:api → project:my-project → org:my-org`.
2. **User scope from system username.** Always appended via `os.userInfo().username` or environment variable.
3. **Explicit override** when auto-detection doesn't apply (e.g., Jarvis CLI working cross-project, or an agent explicitly told its scope via config).

### How does an agent determine what scope a memory applies to?

**Default: store at the narrowest scope where the memory is universally true.**

- "API uses NestJS 10" → `app:api` (only applies to the API)
- "We use pnpm, not npm" → `project:my-project` (applies to all apps)
- "Our mission is X" → `org:my-org` (org-wide)
- "Julian prefers detailed commits" → `user:julian` (personal)

Agent defaults to its current scope. Can explicitly target a broader scope when the memory applies beyond the current context. In Phase 2+, the MCP server provides `memory_write(content, scope?)` where scope is optional.

### Scope registry format

**YAML (`_scopes.yaml`).** Machine-parseable, supports the glob pattern matching needed for auto-detection, and YAML is already used across the project (GitHub Actions, skill manifests).

### Memory file granularity

**One file per scope per type.** E.g., `org/decisions.md`, `project/facts.md`, `apps/api/decisions.md`. Each memory is an entry within that file (with frontmatter metadata per entry). This keeps the file count manageable and makes it easy to read all memories of a given type at a scope in one file read.

### AGENTS.md integration

**Memory system is a separate context source that agents discover independently.** AGENTS.md does not reference individual memory files. Instead, agents discover the memory system via the `_scopes.yaml` registry at the memory root. This decouples memory from the static AGENTS.md and allows the memory system to evolve without AGENTS.md changes.

### Search in Phase 1

**Ripgrep over files.** Sufficient for the file-based phase. FTS index deferred to Phase 2 when the Supabase provider is added.

### Contributor onboarding

**`pnpm setup` already handles it.** The existing personal context setup creates `.jarvis/context/private/<username>/` (gitignored). The `user:<username>` memory scope maps directly to this existing directory -- no separate `scopes/users/` needed. This avoids redundancy between the personal context protocol and the memory system. Future migration path: `jarvis init` becomes the primary interface when Jarvis is standard tooling.

### User scope directory mapping

The `user:<username>` scope is **not** stored under `scopes/` like org/project/app scopes. It maps to the existing `private/<username>/` directory, which is already gitignored and created by `pnpm setup`. This reuses the established personal context protocol rather than duplicating it.

## Remaining Open Questions

1. **Entry format within memory files:** YAML frontmatter blocks per entry, or a simpler markdown list with inline metadata?
2. **Conflict resolution detail:** When closer scope conflicts with parent, is it always "closer wins" or do some memory types (e.g., facts) merge rather than override?

## Out of Scope

- Managed/cloud memory services (Mem0 cloud, Zep managed) -- we build our own
- Real-time memory sync between agents during concurrent sessions (eventual consistency is fine)
- Memory UI/dashboard (deferred until product phase)
- Graph database infrastructure (Phase 4; will use Supabase relational queries or Cognee)
- Training or fine-tuning on memories (memories are retrieved, not trained on)

## Success Criteria / Next Steps

### Phase 1 Success Criteria
- Scoped directory structure exists in `.jarvis/context/scopes/`
- At least 3 scope levels populated with memories (org, project, one app)
- Any agent can resolve a scope chain and read composed memories
- New contributor can onboard their personal scope via `pnpm setup`
- Frontmatter schema enforced with created_at and status fields
- Documented in personal-context-protocol.md and AGENTS.md

### Next Steps
1. PRD defining the full memory system across all phases
2. Technical spec defining the MemoryProvider interface, file schema, scope resolution algorithm, and database schema (Phase 2+)
3. Phase 1 implementation: directory structure, frontmatter conventions, scope resolution logic, integration with existing setup script

---

## Addendum: Generalization (2026-03-19)

**Decision:** The memory system scope hierarchy has been generalized to be project-agnostic. This was tracked as FN-TD-002.

**What changed:**
- Scope hierarchy is no longer hardcoded to the target project (`org:my-org`, `project:my-project`, `app:api`, etc.)
- `_scopes.yaml` is now auto-generated during `flow-install` by detecting `package.json` workspaces and git remote
- The scope format (org > project > app > user) remains the same, but contents are project-specific
- Phase 4 product scopes (`cohort:`, `founder:`, `coach:`) are deferred as AA-specific extensions (FN-TD-004)
- Onboarding changed from `pnpm setup` to `npx flow-install` as the canonical installation mechanism
- Component location for Phase 1 implementation remains in Jarvis CLI (`src/jarvis/memory/`), but the scaffolding is now handled by `flow-install`

**Implementation:** `tools/flow-install/lib/memory.mjs` contains the auto-detection algorithm and `_scopes.yaml` generation logic. Installed successfully into pilot-project-a (7 scopes: org + project + 5 apps), pilot-project-b (2 scopes: org + project), and Flow Network (2 scopes: org + project).
