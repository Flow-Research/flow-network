# Product Specification: Agent Memory System

## Document Info

| Field | Value |
|---|---|
| Version | 1.1 |
| Last Updated | 2026-03-16 |
| Status | Reviewed |
| Author | Claude Code |
| Epic | 52_agent-memory-system |
| Brainstorm | [brainstorm.md](./brainstorm.md) |

---

## 1. Executive Summary

The Agent Memory System is a persistent, hierarchical, backend-agnostic memory layer for AI agents and team members working on the the target project platform. It enables agents to retain context across sessions, inherit organizational knowledge through composable scopes, and store memories against pluggable storage backends.

The system is delivered in four phases: scoped file conventions (Phase 1), MCP server with Supabase semantic search (Phase 2), progressive summarization and temporal queries (Phase 3), and product coaching memory (Phase 4). Phase 1 is the immediate implementation target.

---

## 2. Problem Statement

AI coding agents in the the target project monorepo are stateless across sessions. Every new session starts from zero context unless the agent manually reads documentation files. This results in:

- **Repeated context loading:** Agents re-discover project conventions, architecture decisions, and contributor preferences every session.
- **Lost institutional knowledge:** Decisions made during one session are not persisted in a structured, retrievable way.
- **No scoped relevance:** When context is available (e.g., AGENTS.md), agents receive all of it regardless of what they're working on. An agent editing the API gets admin-specific context it doesn't need.
- **No personal context composition:** Personal preferences exist in gitignored files but don't compose with shared project memories into a unified context.
- **No path to product memory:** The coaching platform will need persistent memory about founders, coaches, and cohorts. There is no architectural foundation to build on.

The existing `.jarvis/context/` vault provides a good static knowledge base but lacks scoped retrieval, search, multi-user composition, and backend flexibility.

---

## 3. Target Users

| User | Phase | Needs |
|---|---|---|
| **AI coding agents** (Claude Code, Jarvis CLI) | 1-3 | Persistent context across sessions, scoped to the current work area. Read and write memories. |
| **Development team members** | 1-3 | Reviewable shared memories via git PRs. Personal preferences that compose with project context. Onboarding that automatically provides organizational knowledge. |
| **AI coaching agents** | 4 | Persistent memory about founders, coaches, and cohort dynamics. Compose individual and group context for personalized coaching. |
| **Platform administrators** | 4 | Manage memory scopes, review agent-generated memories, configure memory retention policies. |

---

## 4. Product Goals

| # | Goal | Success Metric | Phase |
|---|---|---|---|
| G1 | Agents retain context across sessions without manual re-loading | Agent reads composed scope chain on session start; no re-explanation of established decisions needed | 1 |
| G2 | Memories are scoped and composable through a hierarchy | Agent working on `app:api` receives api + project + org memories, not admin memories | 1 |
| G3 | Any storage backend can be used without changing the memory API | MemoryProvider interface implemented by FileProvider and SupabaseProvider with identical client behavior | 2 |
| G4 | Agents can search memories semantically | `memory_search("how do we handle auth?")` returns relevant decisions regardless of exact wording | 2 |
| G5 | Memory scales from individual dev use to platform-wide coaching | Same scope model serves dev memory (org/project/app/user) and product memory (org/cohort/founder/coach) | 4 |

---

## 5. Features and Requirements

### 5.1 Scope Hierarchy and Resolution

**Priority: P0 (Phase 1)**

The foundational feature. All other features depend on the scope model.

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| SR-01 | Define a scope registry (`_scopes.yaml`) that maps directory glob patterns to scope identifiers | P0 |
| SR-02 | Support scope types: `org`, `project`, `app`, `user` (Phase 1); extensible to `cohort`, `founder`, `coach` (Phase 4) | P0 |
| SR-03 | Resolve a scope chain by walking parent references from the matched scope to the root | P0 |
| SR-04 | Auto-detect agent scope from the current working directory using glob patterns | P0 |
| SR-05 | Append user scope from system username (or environment variable override) | P0 |
| SR-06 | Support explicit scope override for agents that work cross-project (e.g., Jarvis CLI) | P1 |
| SR-07 | Closer scope takes precedence over parent scope on conflict | P0 |
| SR-08 | User scope is a separate chain merged at highest priority. Full resolution: `[user:<username>] + [app:X → project:Y → org:Z]`. User memories always take precedence over all other scopes. | P0 |

### 5.2 Memory Storage (File-Based)

**Priority: P0 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MS-01 | Create a scoped directory structure under `.jarvis/context/scopes/` for shared scopes (org, project, app) | P0 |
| MS-02 | Map `user:<username>` scope to existing `.jarvis/context/private/<username>/` directory (gitignored) | P0 |
| MS-03 | Use one file per scope per memory type (e.g., `org/decisions.md`, `project/facts.md`) | P0 |
| MS-04 | Each memory entry within a file includes frontmatter: `created_at`, `status` (active/superseded), `memory_type`, `source` | P0 |
| MS-05 | Shared scope files (org, project, app) are git-tracked and reviewable in PRs | P0 |
| MS-06 | Personal scope files (user) are gitignored and never committed | P0 |

### 5.3 Memory Types

**Priority: P0 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MT-01 | Support four memory types: `fact`, `decision`, `preference`, `event` | P0 |
| MT-02 | `fact`: objective truths about the system (e.g., "API runs on port 3001") | P0 |
| MT-03 | `decision`: choices made with rationale (e.g., "We chose pnpm for workspace support") | P0 |
| MT-04 | `preference`: subjective preferences per-user or per-org (e.g., "Julian prefers detailed commits") | P0 |
| MT-05 | `event`: time-bound occurrences (e.g., "Deployed v0.3 to staging on 2026-03-10") | P0 |
| MT-06 | Memory type is required metadata on every entry | P0 |

### 5.4 Memory Read (Scope Chain Composition)

**Priority: P0 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MR-01 | AGENTS.md contains a "Memory System" section instructing agents to read `_scopes.yaml` at `.jarvis/context/scopes/_scopes.yaml` on session start. The scope registry is the entry point; AGENTS.md does not reference individual memory files. | P0 |
| MR-02 | Agent resolves its scope chain and reads memory files from each scope in chain order | P0 |
| MR-03 | Memories from closer scopes are presented first / take precedence on conflict | P0 |
| MR-04 | Agent can read a specific scope's memories without the full chain (targeted read) | P1 |
| MR-05 | Reading excludes memories with `status: superseded` by default | P0 |

### 5.5 Memory Write

**Priority: P0 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MW-01 | Agent can append a memory entry to the appropriate type file in a scope directory | P0 |
| MW-02 | Default write scope is the agent's current detected scope | P0 |
| MW-03 | Agent can explicitly target a broader or narrower scope for the write | P1 |
| MW-04 | Write operation populates `created_at` automatically | P0 |
| MW-05 | Write operation sets `status: active` by default | P0 |
| MW-06 | Agent can supersede an existing memory by updating its status to `superseded` and writing a new entry | P1 |

### 5.6 Memory Search (File-Based)

**Priority: P1 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MX-01 | Support keyword search across memory files in the current scope chain using ripgrep | P1 |
| MX-02 | Search results include the scope, memory type, and matching content | P1 |
| MX-03 | Search respects scope chain (only searches scopes in the agent's chain) | P2 |

### 5.7 Backend-Agnostic Provider Abstraction

**Priority: P0 (Phase 2)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| BP-01 | Define a `MemoryProvider` TypeScript interface with operations: `write`, `read`, `search`, `update`, `archive`, `resolveScope` | P0 |
| BP-02 | Define optional capability extensions: `semanticSearch`, `graphTraverse`, `summarize` | P0 |
| BP-03 | Implement `FileProvider` that reads/writes markdown files following Phase 1 conventions | P0 |
| BP-04 | Implement `SupabaseProvider` that reads/writes to a `memories` table with pgvector embeddings | P0 |
| BP-05 | Implement `MemoryRouter` that composes multiple providers with capability-based routing | P0 |
| BP-06 | Provider configuration via YAML (`memory.config.yaml`) -- which providers are active is a config choice | P0 |
| BP-07 | Write-through mode: writes go to all configured write-capable providers | P1 |
| BP-08 | Graceful degradation: if a provider is unavailable, fall back to the next provider | P1 |

### 5.8 MCP Memory Server

**Priority: P0 (Phase 2)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| MC-01 | MCP server exposing tools: `memory_write`, `memory_read`, `memory_search`, `memory_scope` | P0 |
| MC-02 | `memory_write(content, type, scope?)` -- writes a memory, scope defaults to current | P0 |
| MC-03 | `memory_read(scope?, type?)` -- reads composed memories for a scope chain | P0 |
| MC-04 | `memory_search(query, scope?)` -- searches memories with keyword or semantic matching | P0 |
| MC-05 | `memory_scope()` -- returns the agent's resolved scope chain | P0 |
| MC-06 | Server integrates with Claude Code natively via MCP protocol | P0 |
| MC-07 | REST/HTTP adapter for non-MCP agents (Jarvis CLI, future agents) | P1 |

### 5.9 Semantic Search

**Priority: P0 (Phase 2)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| SS-01 | Supabase `memories` table with pgvector column for embeddings | P0 |
| SS-02 | Embedding generation on memory write using an embedding model API | P0 |
| SS-03 | Semantic search returns memories ranked by vector similarity within scope chain | P0 |
| SS-04 | Hybrid search: combine semantic similarity with metadata filters (scope, type, status) | P1 |
| SS-05 | RLS policies enforce scope isolation (agent can only search scopes in its chain) | P0 |

### 5.10 Progressive Summarization

**Priority: P0 (Phase 3)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| PS-01 | When a scope accumulates more than a configurable threshold of memories, auto-generate a condensed summary | P0 |
| PS-02 | Summaries replace individual memories for context injection, but originals remain searchable | P0 |
| PS-03 | Temporal search: retrieve memories by date range (e.g., "decisions from last 2 weeks") | P0 |
| PS-04 | Tier management: core (identity/always-loaded), active (working set), archive (searchable but not auto-loaded) | P1 |

### 5.11 Contributor Onboarding

**Priority: P0 (Phase 1)**

**Requirements:**

| ID | Requirement | Priority |
|---|---|---|
| CO-01 | `pnpm setup` creates the user's personal scope directory (reuses existing `private/<username>/` creation) | P0 |
| CO-02 | Template memory files are available for new contributors to populate their preferences | P1 |
| CO-03 | Scope registry (`_scopes.yaml`) is git-tracked and available immediately on clone | P0 |
| CO-04 | No additional setup required beyond `pnpm setup` for Phase 1 functionality | P0 |

---

## 6. User Stories

### US-01: Agent Reads Composed Context

**As** an AI coding agent starting a session in `apps/api/`,
**I want** to automatically receive memories from the api, project, and org scopes,
**so that** I have full context about conventions, decisions, and preferences without needing them re-explained.

**Acceptance Criteria:**
- Agent reads `_scopes.yaml` and resolves scope chain `app:api → project:my-project → org:my-org`
- Agent reads `decisions.md`, `facts.md`, `preferences.md`, `events.md` from each scope directory
- Closer scope entries are presented before parent scope entries
- Superseded entries are excluded
- User scope (`private/<username>/`) is appended to the chain

### US-02: Agent Records a Decision

**As** an AI coding agent that just made an architecture decision with the user,
**I want** to persist that decision to the appropriate scope,
**so that** future sessions (mine or other agents') know about it.

**Acceptance Criteria:**
- Agent appends a new entry to `decisions.md` in the target scope directory
- Entry includes `created_at`, `status: active`, `memory_type: decision`, `source: agent_session`
- Entry includes the decision content and rationale
- The file is immediately readable by any agent that includes this scope in its chain

### US-03: New Contributor Gets Context

**As** a new development team member joining the project,
**I want** to run `pnpm setup` and immediately have access to the full organizational and project context,
**so that** I (and my AI agents) can work effectively without reading every document manually.

**Acceptance Criteria:**
- `pnpm setup` creates `private/<username>/` for personal scope
- Org and project memories are git-tracked and available on clone
- Agent resolves scope chain and provides org + project context on first session
- Contributor can add personal preferences that compose with shared context

### US-07: Memory Write Guarantee (Layered Enforcement)

**As** a project that depends on institutional knowledge being captured,
**I want** multiple layers ensuring memories are written even when agents forget,
**so that** the memory system stays populated reliably without depending on agent cooperation alone.

**Acceptance Criteria:**

**Layer 1 -- AGENTS.md Convention (Phase 1):**
- AGENTS.md "Memory System" section instructs agents: "When you confirm a decision, resolve an architectural question, or learn a new project fact, persist it as a memory entry."
- Convention distinguishes memory-worthy content (decisions, facts, preferences) from ephemeral content (debugging steps, exploratory discussion)

**Layer 2 -- Commit-Time Extraction (Phase 1):**
- A git post-commit hook reads the commit message and diff
- Uses LLM or heuristic extraction to identify memory-worthy facts/decisions
- Appends extracted memories to the appropriate scope memory files with `source: commit_extraction`
- Candidate memories are written to a `_pending_memories.md` staging file for review and promotion

**Layer 3 -- Session-End Review (Phase 2):**
- MCP tool or hook prompts the agent before session end: "Review this session for decisions, facts, or preferences that should be persisted."
- Agent writes memories via `memory_write` MCP tool

**Layer 4 -- Periodic Audit (Phase 3):**
- Scheduled task reads recent git history and compares against existing memory files
- Identifies gaps: commits that suggest decisions not yet captured in memory
- Generates a report or auto-fills gaps

### US-08: Seed Memories from Existing Context

**As** a project maintainer setting up the memory system for the first time,
**I want** to migrate relevant decisions from existing `.jarvis/context/` files into scoped memory files,
**so that** the memory system starts with useful institutional knowledge rather than empty files.

**Acceptance Criteria:**
- Key decisions from `decisions.md`, architecture docs, and `AGENTS.md` constraints are migrated to appropriate scope memory files
- Migrated entries have `source: migration` in frontmatter
- Original files remain unchanged (migration is additive, not destructive)

### US-04: Agent Searches Memories (Phase 1)

**As** an AI coding agent that needs to find a specific decision,
**I want** to search across memories in my scope chain,
**so that** I can find relevant context without reading every memory file.

**Acceptance Criteria:**
- Keyword search via ripgrep across memory files in the scope chain
- Results include scope, memory type, and matching content
- Search is scoped to the agent's chain (doesn't search unrelated scopes)

### US-05: Agent Searches Semantically (Phase 2)

**As** an AI coding agent that needs context about authentication,
**I want** to search `memory_search("how do we handle auth?")` and get relevant memories,
**so that** I find related decisions even if they don't contain the exact word "auth".

**Acceptance Criteria:**
- Semantic search via pgvector returns memories ranked by relevance
- Results are filtered to the agent's scope chain
- Results include scope, type, similarity score, and content

### US-06: Memory Provider Swap (Phase 2)

**As** a platform administrator,
**I want** to switch or add memory storage backends by changing a config file,
**so that** the memory system can evolve without code changes.

**Acceptance Criteria:**
- `memory.config.yaml` defines active providers and routing rules
- Changing the config activates/deactivates providers
- Agents interact with the same API regardless of active backends
- File provider is always available as fallback

---

## 7. Acceptance Criteria (Phase 1 -- Implementation Target)

| # | Criterion | Verification |
|---|---|---|
| AC-01 | `_scopes.yaml` exists at `.jarvis/context/scopes/_scopes.yaml` with org, project, app, and user scope definitions | File exists with valid YAML, glob patterns resolve correctly |
| AC-02 | Scoped directory structure exists: `scopes/org/`, `scopes/project/`, `scopes/project/apps/{api,admin,my-coach-app,cms}/` | Directories exist |
| AC-03 | User scope maps to `private/<username>/` | `_scopes.yaml` references `private/` path for user type |
| AC-04 | At least 3 scope levels have populated memory files with real content | org, project, and one app scope each have at least one non-empty memory file |
| AC-05 | Memory files use consistent frontmatter schema (created_at, status, memory_type, source) | All entries in all memory files have required frontmatter fields |
| AC-06 | An agent can resolve a scope chain from a working directory path | Given `apps/api/src/auth.ts`, resolves to `app:api → project:my-project → org:my-org` |
| AC-07 | Scope chain composition returns memories in priority order (closest first) | Reading from `app:api` chain returns api memories before project memories before org memories |
| AC-08 | Superseded memories are excluded from default reads | Memory with `status: superseded` is not included in composed output |
| AC-09 | `pnpm setup` creates personal scope (already implemented) | Running setup creates `private/<username>/` |
| AC-10 | Memory system is documented in personal-context-protocol.md | Protocol doc references scoped memory system |
| AC-11 | A memory entry written by an agent contains valid frontmatter (`created_at`, `status: active`, `source`) and is parseable by subsequent reads | Write a test entry, read it back, verify all fields present |
| AC-12 | After superseding a memory, the original entry has `status: superseded` and the new entry has `status: active` | Supersede an existing entry, verify both statuses |
| AC-13 | No user-scoped content exists under `scopes/`. All user memory is in `private/<username>/` | Directory audit: `scopes/` contains no username-specific content |
| AC-14 | AGENTS.md contains a "Memory System" section instructing agents to read `_scopes.yaml` on session start | AGENTS.md section exists with scope discovery instructions and write trigger convention |

---

## 8. Data Model

### Phase 1: File-Based

```
.jarvis/context/
├── scopes/
│   ├── _scopes.yaml              # Scope registry with hierarchy + glob patterns
│   ├── org/                       # org:my-org
│   │   ├── decisions.md
│   │   ├── facts.md
│   │   ├── preferences.md
│   │   └── events.md
│   ├── project/                   # project:my-project
│   │   ├── decisions.md
│   │   ├── facts.md
│   │   ├── preferences.md
│   │   ├── events.md
│   │   └── apps/
│   │       ├── api/               # app:api
│   │       │   ├── decisions.md
│   │       │   └── facts.md
│   │       ├── admin/             # app:admin
│   │       │   └── decisions.md
│   │       ├── my-coach-app/      # app:my-coach-app
│   │       │   └── decisions.md
│   │       └── cms/               # app:cms
│   │           └── facts.md
├── private/
│   └── <username>/                # user:<username> (gitignored)
│       ├── preferences.md
│       └── decisions.md
```

### Scope Registry (`_scopes.yaml`)

```yaml
# .jarvis/context/scopes/_scopes.yaml
version: 1

scopes:
  - id: "org:my-org"
    type: org
    parent: null
    path: org/
    match: "**"                    # Root fallback: matches everything

  - id: "project:my-project"
    type: project
    parent: "org:my-org"
    path: project/
    match: "apps/**"               # Any file under apps/

  - id: "app:api"
    type: app
    parent: "project:my-project"
    path: project/apps/api/
    match: "apps/api/**"

  - id: "app:admin"
    type: app
    parent: "project:my-project"
    path: project/apps/admin/
    match: "apps/admin/**"

  - id: "app:my-coach-app"
    type: app
    parent: "project:my-project"
    path: project/apps/my-coach-app/
    match: "apps/my-coach-app/**"

  - id: "app:cms"
    type: app
    parent: "project:my-project"
    path: project/apps/cms/
    match: "apps/cms/**"

# User scopes are resolved dynamically from system username.
# Path: ../private/<username>/ (relative to scopes/)
user_scope:
  path_template: "../private/{username}/"
```

**Schema fields:**
- `id`: Unique scope identifier in `type:name` format
- `type`: One of `org`, `project`, `app` (extensible to `cohort`, `founder`, `coach` in Phase 4)
- `parent`: Parent scope `id` or `null` for root
- `path`: Directory path relative to `scopes/` where this scope's memory files live
- `match`: Glob pattern against repo-relative file paths for auto-detection. First match wins (most specific patterns should be listed before general ones).

### Memory Entry Format (within files)

```markdown
---
created_at: 2026-03-16
status: active
source: agent_session
---
We use pnpm as the sole package manager. npm and yarn are prohibited.
Rationale: pnpm workspace support is required for the Turborepo monorepo.
```

Each entry starts with a `---` frontmatter block and is followed by content. Entries are separated by a blank line before the next `---`. Each file contains multiple entries appended sequentially.

### Memory Write Template

Agents use this exact template when appending a new memory entry:

```markdown

---
created_at: YYYY-MM-DD
status: active
source: agent_session
---
[Memory content here. One paragraph for facts. Include rationale for decisions.]

```

**Write convention:** Append to the end of the file. Do not modify existing entries (except to change `status` to `superseded` when explicitly superseding).

### Phase 2: Supabase Table

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  scope_type TEXT NOT NULL,       -- org, project, app, user
  scope_id TEXT NOT NULL,         -- my-org, my-project, api, julian
  parent_scope_id UUID,           -- FK to scopes table
  memory_type TEXT NOT NULL,      -- fact, decision, preference, event
  status TEXT DEFAULT 'active',   -- active, superseded
  tier TEXT DEFAULT 'active',     -- core, active, archive
  source TEXT,                    -- agent_session, manual, file_sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  parent_id UUID REFERENCES scopes(id),
  metadata JSONB DEFAULT '{}',
  UNIQUE(type, identifier)
);
```

---

## 9. Edge Cases

| # | Edge Case | Expected Behavior |
|---|---|---|
| EC-01 | Agent works in a directory not matched by any glob pattern | Falls back to project scope (root of monorepo). Warn if no match found. |
| EC-02 | Memory file doesn't exist for a scope/type combination | Skip silently. Not every scope needs every type file. |
| EC-03 | Two memories in the same scope contradict each other | Most recent `created_at` wins within the same scope. Agents should supersede the old entry. |
| EC-04 | User scope directory doesn't exist (contributor hasn't run `pnpm setup`) | Proceed without user scope. Log a hint suggesting `pnpm setup`. |
| EC-05 | `_scopes.yaml` is missing or malformed | Fatal error for scope-dependent operations. Agent falls back to reading `.jarvis/context/` flat files (backward compatibility). |
| EC-06 | Agent tries to write to a scope it doesn't have access to (e.g., writing to `user:alice` when running as `user:julian`) | Phase 1: relies on agent convention (agents should only write to their own user scope). No filesystem enforcement. Phase 2+: enforced by Supabase RLS policies. **[TECH DEBT: TD-52-01]** |
| EC-07 | Concurrent agents write to the same file simultaneously | Acceptable in Phase 1 (file-level, low frequency). Phase 2 handles with database transactions. |
| EC-08 | Memory file grows very large (hundreds of entries) | Phase 3 addresses with progressive summarization. Phase 1 accepts the growth. |

---

## 10. Dependencies

| Dependency | Type | Phase | Status |
|---|---|---|---|
| `.jarvis/context/` vault | Existing infrastructure | 1 | Available |
| `private/<username>/` convention | Existing infrastructure | 1 | Available (implemented today) |
| `pnpm setup` personal context phase | Existing infrastructure | 1 | Available (implemented today) |
| Supabase PostgreSQL with pgvector | External service | 2 | Available (existing project infra) |
| Embedding model API (OpenAI, Anthropic, or local) | External service | 2 | Needs selection |
| MCP server runtime | New infrastructure | 2 | To be built |

---

## 11. Out of Scope

- **Managed/cloud memory services** (Mem0 cloud, Zep managed) -- we build our own on existing infrastructure
- **Real-time memory sync** between concurrent agent sessions -- eventual consistency is acceptable
- **Memory UI/dashboard** -- deferred until product phase (Phase 4)
- **Graph database infrastructure** -- Phase 4 will use Supabase relational queries or evaluate Cognee
- **Training or fine-tuning on memories** -- memories are retrieved and injected, not used as training data
- **Encryption of memory files** -- memories are context, not secrets. No PII in Phase 1-3.
- **Memory retention policies / auto-cleanup** -- deferred until Phase 3 (summarization handles growth)
- **Product scope types** (cohort, founder, coach) -- Phase 4. The scope model is extensible by design.

---

## 12. Success Metrics

| Metric | Target | Phase | Measurement |
|---|---|---|---|
| Agent correctly references established decisions | >90% of sessions | 1 | In 10 observed sessions post-launch, agent references a memory-stored decision without being re-told. Baseline: 0 sessions pre-launch (no memory system). |
| Memory entries created per week | >10 across all scopes | 1 | Count entries in memory files |
| Scope chain resolution accuracy | 100% for known paths | 1 | Test suite: glob patterns resolve correctly for all app directories |
| Time to onboard new contributor's context | <5 minutes | 1 | From `git clone` + `pnpm setup` to agent having full org/project context |
| Semantic search relevance (Phase 2) | >80% of top-5 results are relevant | 2 | Manual evaluation on a test query set |
| Provider swap without code changes | Achievable via config only | 2 | Switch from File-only to File+Supabase by editing `memory.config.yaml` |
