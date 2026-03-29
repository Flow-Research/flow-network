# Technical Specification: Agent Memory System

## Document Info

| Field | Value |
|---|---|
| Version | 1.1 |
| Last Updated | 2026-03-16 |
| Status | Reviewed |
| Author | Claude Code |
| Epic | 52_agent-memory-system |
| Product Spec | [product_spec.md](./product_spec.md) |
| Brainstorm | [brainstorm.md](./brainstorm.md) |

---

## 1. Overview

### 1.1 Purpose

Define the implementation architecture for the Agent Memory System: a persistent, hierarchical, backend-agnostic memory layer for AI agents and team members. This spec covers all four phases at the architecture level, with Phase 1 as the immediate implementation target.

### 1.2 Scope

| In Scope | Out of Scope |
|---|---|
| Scoped file conventions and directory structure (Phase 1) | Memory UI/dashboard |
| `_scopes.yaml` registry with glob-based auto-detection | Graph database infrastructure |
| Memory entry format with frontmatter schema | Encryption of memory files |
| Scope chain resolution algorithm | Real-time sync between concurrent sessions |
| Post-commit hook for memory extraction (Phase 1) | Product scope types (cohort, founder, coach) |
| MemoryProvider interface definition (Phase 2 design) | Training/fine-tuning on memories |
| Supabase schema design (Phase 2 design) | |
| MCP server tool definitions (Phase 2 design) | |

---

## 2. Current-State Analysis

### 2.1 Existing Infrastructure

| Component | Status | Relevance |
|---|---|---|
| `.jarvis/context/` vault | Active, 12 root files + structured subdirectories | Foundation to extend, not replace |
| `.jarvis/context/private/<username>/` | Active, gitignored, created by `pnpm setup` | Maps directly to `user:<username>` scope |
| `AGENTS.md` | Active, git-tracked | Will get a "Memory System" section |
| `scripts/setup-local.mjs` | Active, interactive setup | Already creates personal context; no changes needed for Phase 1 |
| `.jarvis/context/docs/personal-context-protocol.md` | Active | Will reference memory system |
| Supabase PostgreSQL | Available | Phase 2 backend (pgvector extension available) |
| Git hooks (Husky) | Not currently configured | Phase 1 adds post-commit hook |

### 2.2 Gaps Addressed

| Gap | Solution |
|---|---|
| No scoped retrieval | `_scopes.yaml` + scope chain resolution |
| No search | Ripgrep over scope chain files (Phase 1); pgvector semantic search (Phase 2) |
| No multi-user composition | User scope merged at highest priority into scope chain |
| No backend flexibility | MemoryProvider abstraction (Phase 2) |
| No temporal awareness | Frontmatter `created_at` + `status` (Phase 1); temporal queries (Phase 3) |
| No write guarantee | Layered: AGENTS.md convention + post-commit hook extraction |

---

## 3. Architecture and Components

### 3.1 Phase 1 Architecture (File-Based)

```
┌─────────────────────────────────────────────────────────┐
│                   AGENT (Claude Code / Jarvis)           │
│                                                          │
│  1. Read _scopes.yaml                                    │
│  2. Match working directory → scope                      │
│  3. Walk parent chain → scope chain                      │
│  4. Read memory files from each scope                    │
│  5. Compose context (user > app > project > org)         │
│  6. Write memories to appropriate scope files             │
└──────────────────┬──────────────┬───────────────────────┘
                   │              │
         ┌─────────▼─────┐  ┌────▼──────────────────────┐
         │ _scopes.yaml  │  │  Memory Files              │
         │ (registry)    │  │  scopes/org/decisions.md    │
         │               │  │  scopes/project/facts.md    │
         │               │  │  private/<user>/prefs.md    │
         └───────────────┘  └────────────────────────────┘
                                       │
                              ┌────────▼─────────────────┐
                              │  Post-Commit Hook         │
                              │  (memory extraction)      │
                              │  → _pending_memories.md   │
                              └──────────────────────────┘
```

### 3.2 Phase 2+ Architecture (MCP + Supabase)

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│ Claude Code   │────▶│  MCP Memory Server    │◀────│ Jarvis CLI   │
└──────────────┘     │                      │     └──────────────┘
                     │  Tools:              │
                     │   memory_write       │     ┌──────────────┐
                     │   memory_read        │◀────│ Other Agents │
                     │   memory_search      │     └──────────────┘
                     │   memory_scope       │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   MemoryRouter        │
                     │   (capability-based)  │
                     └──┬──────────┬────────┘
                        │          │
              ┌─────────▼──┐  ┌───▼──────────────┐
              │ FileProvider│  │ SupabaseProvider  │
              │ [read,write]│  │ [read,write,      │
              │             │  │  search,semantic]  │
              └─────────────┘  └──────────────────┘
```

### 3.3 Component Inventory

| Component | Phase | Language | Location |
|---|---|---|---|
| `_scopes.yaml` | 1 | YAML | `.jarvis/context/scopes/_scopes.yaml` |
| Scoped memory files | 1 | Markdown | `.jarvis/context/scopes/**/*.md` |
| Post-commit hook | 1 | Shell + Node | `.husky/post-commit` + `scripts/memory-extract.mjs` |
| AGENTS.md "Memory System" section | 1 | Markdown | `AGENTS.md` |
| MemoryProvider interface | 2 | TypeScript | `packages/shared/src/memory/types.ts` |
| FileProvider | 2 | TypeScript | `packages/shared/src/memory/providers/file.ts` |
| SupabaseProvider | 2 | TypeScript | `packages/shared/src/memory/providers/supabase.ts` |
| MemoryRouter | 2 | TypeScript | `packages/shared/src/memory/router.ts` |
| MCP Memory Server | 2 | TypeScript | `packages/shared/src/memory/mcp-server.ts` |
| `memory.config.yaml` | 2 | YAML | `.jarvis/memory.config.yaml` |
| Summarization pipeline | 3 | TypeScript | `packages/shared/src/memory/summarize.ts` |

---

## 4. Data Design

### 4.1 Directory Structure (Phase 1)

```
.jarvis/context/
├── scopes/
│   ├── _scopes.yaml                    # Scope registry (git-tracked)
│   ├── _pending_memories.md            # Staging file for commit-extracted memories (gitignored)
│   ├── org/                            # org:my-org
│   │   ├── decisions.md
│   │   ├── facts.md
│   │   ├── preferences.md
│   │   └── events.md
│   └── project/                        # project:my-project
│       ├── decisions.md
│       ├── facts.md
│       ├── preferences.md
│       ├── events.md
│       └── apps/
│           ├── api/                    # app:api
│           │   ├── decisions.md
│           │   └── facts.md
│           ├── admin/                  # app:admin
│           │   └── decisions.md
│           ├── my-coach-app/           # app:my-coach-app
│           │   └── decisions.md
│           └── cms/                    # app:cms
│               └── facts.md
├── private/
│   └── <username>/                     # user:<username> (gitignored)
│       ├── preferences.md
│       └── decisions.md
```

### 4.2 Scope Registry Schema (`_scopes.yaml`)

```yaml
version: 1

scopes:
  - id: "org:my-org"
    type: org
    parent: null
    path: org/
    # Org scope is never auto-matched. It is always the root of every chain.
    # Only reached as the terminal parent, not via glob matching.

  - id: "project:my-project"
    type: project
    parent: "org:my-org"
    path: project/
    match: "**"                    # Catch-all: any file in the repo is part of this project

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

user_scope:
  # Resolved relative to .jarvis/context/ (the context root, NOT scopes/)
  path_template: "private/{username}/"
```

**Resolution rules:**
- `match` patterns are tested against repo-relative file paths
- Scopes are sorted by specificity (see Section 5.2) and tested most-specific-first
- First match wins
- `**` is the catch-all fallback (project scope). The org scope has no `match` pattern -- it is always included as the root parent of the project scope.
- `user_scope.path_template` is resolved relative to `.jarvis/context/` (the context root)

### 4.3 Memory Entry Format

Each memory file contains multiple entries. Each entry is a frontmatter block followed by content:

```markdown
---
created_at: 2026-03-16
status: active
source: agent_session
---
We use pnpm as the sole package manager. npm and yarn are prohibited.
Rationale: pnpm workspace support is required for the Turborepo monorepo.

---
created_at: 2026-03-16
status: active
source: commit_extraction
---
Strapi CMS requires Node <= 20. All other apps use Node 22.
```

**Frontmatter fields:**

| Field | Type | Required | Values |
|---|---|---|---|
| `created_at` | Date (YYYY-MM-DD) | Yes | ISO date |
| `status` | String | Yes | `active`, `superseded` |
| `source` | String | Yes | `agent_session`, `manual`, `commit_extraction`, `migration` |
| `supersedes` | String | No | Reference to the content being replaced (for traceability) |

**Note on `memory_type`:** The PRD (MS-04) lists `memory_type` as a per-entry frontmatter field. This tech spec supersedes that: `memory_type` is derived from the filename for scope memory files (canonical source). The `_pending_memories.md` staging file includes a `type:` field per-entry because entries haven't been promoted to a typed file yet. The PRD should be updated to align with this approach.

**Parsing rules:**

An entry is detected by matching a **frontmatter open sequence**: a line containing exactly `---` followed on the next line by a known YAML key (`created_at:`, `status:`, or `source:`). This distinguishes memory entry frontmatter from markdown horizontal rules (`---` followed by blank line or non-YAML content).

Parsing regex for entry boundary: `/^---\n(created_at|status|source):/m`

Complete parsing algorithm:
1. Split file content on the regex pattern above (lookahead to keep the delimiter)
2. For each chunk, extract the YAML frontmatter (from `---` to next `---`)
3. Everything after the closing `---` until the next entry boundary is the content body
4. Content body MAY contain `---` (markdown horizontal rules) -- these are not entry delimiters because they are not followed by a known frontmatter key

**Memory type derivation:** The `memory_type` is derived from the filename, not stored per-entry. Mapping: `decisions.md` → `decision`, `facts.md` → `fact`, `preferences.md` → `preference`, `events.md` → `event`. The `_pending_memories.md` file is an exception: it includes a `type:` field per-entry since entries haven't been promoted to a typed file yet.

### 4.4 Pending Memories Format

The post-commit hook writes extracted candidates to `_pending_memories.md`:

```markdown
# Pending Memories

Extracted from recent commits. Review and promote to scope memory files.

## Pending

---
created_at: 2026-03-16
status: pending
source: commit_extraction
scope: app:api
type: fact
commit: abc123f
---
API uses JWT authentication with RS256 signing.

## Promoted

(Entries moved here after promotion to scope files)

## Dismissed

(Entries moved here if rejected during review)
```

### 4.5 Supabase Schema (Phase 2)

```sql
-- Scope hierarchy table
CREATE TABLE memory_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                -- org, project, app, user
  identifier TEXT NOT NULL,          -- my-org, my-project, api, julian
  parent_id UUID REFERENCES memory_scopes(id),
  path TEXT,                         -- filesystem path relative to scopes/
  match_pattern TEXT,                -- glob pattern for auto-detection
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, identifier)
);

-- Memory entries table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),            -- pgvector, OpenAI ada-002 dimensions
  scope_id UUID NOT NULL REFERENCES memory_scopes(id),
  memory_type TEXT NOT NULL,         -- fact, decision, preference, event
  status TEXT DEFAULT 'active',      -- active, superseded, archived
  tier TEXT DEFAULT 'active',        -- core, active, archive
  source TEXT NOT NULL,              -- agent_session, manual, commit_extraction, migration, file_sync
  supersedes_id UUID REFERENCES memories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  -- Indexes
  CONSTRAINT valid_type CHECK (memory_type IN ('fact', 'decision', 'preference', 'event')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'superseded', 'archived'))
);

CREATE INDEX idx_memories_scope ON memories(scope_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_status ON memories(status);
CREATE INDEX idx_memories_created ON memories(created_at DESC);

-- RLS policies (Phase 2)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_scopes ENABLE ROW LEVEL SECURITY;

-- User scope isolation: users can only read/write their own user scope
-- Shared scopes (org, project, app) readable by all authenticated users
-- Shared scopes writable by authenticated users (convention-enforced quality)
```

---

## 5. Scope Resolution Algorithm

### 5.1 Resolution Function (Pseudocode)

```
function resolveScope(workingFilePath, scopesYaml, username):
  // Step 1: Load scopes sorted by specificity (most specific match pattern first)
  scopes = sortBySpecificity(scopesYaml.scopes)

  // Step 2: Find matching scope
  matchedScope = null
  for scope in scopes:
    if globMatch(workingFilePath, scope.match):
      matchedScope = scope
      break

  // Step 3: Walk parent chain to build hierarchy chain
  hierarchyChain = []
  current = matchedScope
  while current != null:
    hierarchyChain.push(current)
    current = findById(scopesYaml.scopes, current.parent)

  // Step 4: Build user scope
  userScope = {
    id: "user:" + username,
    type: "user",
    path: scopesYaml.user_scope.path_template.replace("{username}", username)
  }

  // Step 5: Compose final chain (user first = highest priority)
  return [userScope, ...hierarchyChain]
```

### 5.2 Specificity Sorting

Scopes are sorted by match pattern specificity before testing. Specificity is defined as the **number of literal (non-wildcard) path segments before the first wildcard**.

**Function:** `specificity(pattern) = count of path segments that are entirely literal (no `*` or `?` characters)`

**Worked examples:**

```
apps/api/**          → literal segments: ["apps", "api"]     → specificity 2
apps/api/src/**      → literal segments: ["apps", "api", "src"] → specificity 3
apps/**              → literal segments: ["apps"]             → specificity 1
packages/**          → literal segments: ["packages"]         → specificity 1
**                   → literal segments: []                   → specificity 0
*.ts                 → literal segments: []                   → specificity 0
apps/*/src/**        → literal segments: ["apps"]             → specificity 1 (* is wildcard)
```

**Tie-breaking:** When two patterns have equal specificity, the one defined **first** in `_scopes.yaml` wins. This gives the YAML author explicit control over precedence among peers.

**Sorting order:** Higher specificity tested first. On tie, earlier definition tested first. The `**` catch-all is always last.

### 5.3 Example Resolution

**Input:** Agent edits `apps/api/src/modules/auth/auth.service.ts`

**Process:**
1. Test `apps/api/**` → MATCH → `app:api`
2. Walk parents: `app:api` → parent `project:my-project` → parent `org:my-org` → parent null (root)
3. Add user: `user:julian`

**Output scope chain:**
```
[user:julian, app:api, project:my-project, org:my-org]
```

**Memory files read (in order):**
1. `private/julian/preferences.md`, `private/julian/decisions.md`
2. `scopes/project/apps/api/facts.md`, `scopes/project/apps/api/decisions.md`
3. `scopes/project/facts.md`, `scopes/project/decisions.md`, `scopes/project/preferences.md`, `scopes/project/events.md`
4. `scopes/org/facts.md`, `scopes/org/decisions.md`, `scopes/org/preferences.md`, `scopes/org/events.md`

---

## 6. Post-Commit Memory Extraction Hook

### 6.1 Hook Architecture

```
git commit
    │
    ▼
.husky/post-commit
    │
    ▼
scripts/memory-extract.mjs
    │
    ├── Read: git log -1 --format='%s%n%n%b' (commit message)
    ├── Read: git diff-tree --no-commit-id --name-only -r HEAD (changed files)
    ├── Read: _scopes.yaml (scope resolution)
    │
    ├── Determine affected scopes from changed file paths
    ├── Extract memory candidates (heuristic + optional LLM)
    │
    └── Write: _pending_memories.md (staging file)
```

### 6.2 Extraction Heuristics (No LLM Required)

Before resorting to LLM extraction, apply deterministic heuristics:

| Signal | Memory Type | Example |
|---|---|---|
| Commit message starts with `feat:` | `fact` | New capability added |
| Commit message contains "chose", "decided", "picked", "switched to" | `decision` | Technology choice |
| New dependency in `package.json` | `fact` | "Added @supabase/supabase-js dependency" |
| New env var in `.env.example` | `fact` | "API requires REDIS_URL environment variable" |
| File deleted + file created in same area | `decision` | Migration/replacement decision |
| Commit message starts with `fix:` for recurring area | `fact` | Pattern of issues in a component |

### 6.3 LLM-Enhanced Extraction (Optional)

If an LLM API key is configured, the hook can make a single API call:

```
System: You extract institutional knowledge from git commits.
Given a commit message and list of changed files, extract 0-3 memory entries.
Each entry has: content, memory_type (fact|decision|preference|event), scope (most specific applicable scope from the provided list).
Only extract genuinely reusable knowledge. Skip routine changes.

User: Commit: "feat(api): add JWT auth with RS256 signing"
Files: apps/api/src/modules/auth/auth.module.ts (new), apps/api/src/modules/auth/auth.service.ts (new), ...
Scopes: [app:api, project:my-project, org:my-org]
```

### 6.4 Script Design (`scripts/memory-extract.mjs`)

```javascript
// scripts/memory-extract.mjs
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const PENDING_FILE = ".jarvis/context/scopes/_pending_memories.md";
const SCOPES_FILE = ".jarvis/context/scopes/_scopes.yaml";

async function run() {
  // 1. Get commit info
  const message = execSync("git log -1 --format='%s'").toString().trim();
  const body = execSync("git log -1 --format='%b'").toString().trim();
  const hash = execSync("git log -1 --format='%h'").toString().trim();
  // Use diff-tree (works for initial commits, merges, and amends)
  const files = execSync("git diff-tree --no-commit-id --name-only -r HEAD")
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);

  // 2. Load scope registry
  const scopesYaml = parseYaml(await fs.readFile(SCOPES_FILE, "utf8"));

  // 3. Determine affected scopes
  const affectedScopes = resolveAffectedScopes(files, scopesYaml);

  // 4. Sanitize content (prevent frontmatter injection)
  const safeMessage = sanitizeContent(message);
  const safeBody = sanitizeContent(body);

  // 5. Extract candidates via heuristics
  const candidates = extractHeuristic(safeMessage, safeBody, files, affectedScopes);

  // 6. (Optional) LLM-enhanced extraction -- opt-in, disabled by default
  // const llmCandidates = await extractWithLLM(message, files, affectedScopes);
  // candidates.push(...llmCandidates);

  // 7. Append to pending file
  if (candidates.length > 0) {
    await appendPending(candidates, hash);
    console.log(
      `[memory] Extracted ${candidates.length} candidate(s) → _pending_memories.md`
    );
  }
}
```

---

## 7. AGENTS.md Memory System Section

Add the following section to `AGENTS.md` after the "Personal Context" section:

```markdown
## Memory System

This project uses a scoped memory system for persistent agent context.

### Reading Memories

On session start, read the scope registry at `.jarvis/context/scopes/_scopes.yaml`.
Resolve your scope chain based on the files you are working with.
Read memory files from each scope in your chain (your user scope has highest priority).

### Writing Memories

When you confirm a decision, resolve an architectural question, or learn a new project fact:

1. Determine the narrowest scope where the memory is universally true.
2. Append to the appropriate type file (e.g., `decisions.md`) in that scope directory.
3. Use this format:

    ---
    created_at: YYYY-MM-DD
    status: active
    source: agent_session
    ---
    [Memory content. Include rationale for decisions.]

**What to persist:** Decisions, confirmed facts, user preferences, notable events.
**What NOT to persist:** Debugging steps, exploratory discussion, temporary workarounds.

### Pending Memories

The post-commit hook extracts memory candidates to `_pending_memories.md`.
Review and promote these to the appropriate scope files when relevant.
```

---

## 8. MemoryProvider Interface (Phase 2 Design)

Defined here for architectural completeness. Implementation begins in Phase 2.

```typescript
// packages/shared/src/memory/types.ts

export type MemoryType = "fact" | "decision" | "preference" | "event";
export type MemoryStatus = "active" | "superseded" | "archived";
export type MemoryTier = "core" | "active" | "archive";
export type MemorySource =
  | "agent_session"
  | "manual"
  | "commit_extraction"
  | "migration"
  | "file_sync";

export type ScopeType = "org" | "project" | "app" | "user";
// Phase 4 extensions: | "cohort" | "founder" | "coach"

export interface ScopeRef {
  type: ScopeType;
  id: string;
}

export type ScopeChain = ScopeRef[];

export interface MemoryEntry {
  id: string;
  content: string;
  scope: ScopeRef;
  memoryType: MemoryType;
  status: MemoryStatus;
  tier: MemoryTier;
  source: MemorySource;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  supersedesId?: string;
  metadata: Record<string, unknown>;
}

export interface MemoryQuery {
  text?: string;
  scope?: ScopeChain;
  type?: MemoryType;
  status?: MemoryStatus;
  since?: Date;
  until?: Date;
  limit?: number;
  semantic?: boolean;
}

export type ProviderCapability =
  | "read"
  | "write"
  | "search"
  | "semantic"
  | "graph"
  | "temporal";

export interface MemoryProvider {
  readonly name: string;
  readonly capabilities: Set<ProviderCapability>;

  write(entry: Omit<MemoryEntry, "id">): Promise<string>;
  read(id: string): Promise<MemoryEntry | null>;
  search(query: MemoryQuery): Promise<MemoryEntry[]>;
  update(id: string, patch: Partial<MemoryEntry>): Promise<void>;
  archive(id: string): Promise<void>;
  resolveScope(chain: ScopeChain): Promise<MemoryEntry[]>;

  // Optional capabilities
  semanticSearch?(
    query: string,
    chain?: ScopeChain,
    limit?: number
  ): Promise<MemoryEntry[]>;
  graphTraverse?(
    fromId: string,
    relationship: string
  ): Promise<MemoryEntry[]>;
  summarize?(
    chain: ScopeChain,
    period?: { since: Date; until: Date }
  ): Promise<string>;
}
```

### 8.1 MemoryRouter

```typescript
// packages/shared/src/memory/router.ts

export interface RoutingConfig {
  providers: ProviderConfig[];
  routing: {
    write: string[];    // Provider names for write operations
    read: string[];     // Provider names for read operations (first success wins)
    search: string[];   // Provider names for search
    fallback: string;   // Last-resort provider
  };
}

export class MemoryRouter implements MemoryProvider {
  readonly name = "router";
  readonly capabilities: Set<ProviderCapability>;

  constructor(
    private providers: Map<string, MemoryProvider>,
    private config: RoutingConfig
  ) {
    // Capabilities = union of all provider capabilities
    this.capabilities = new Set(
      [...this.providers.values()].flatMap((p) => [...p.capabilities])
    );
  }

  async write(entry: Omit<MemoryEntry, "id">): Promise<string> {
    const writeProviders = this.config.routing.write
      .map((name) => this.providers.get(name))
      .filter(Boolean);

    // Write-through: write to all configured providers
    const results = await Promise.allSettled(
      writeProviders.map((p) => p!.write(entry))
    );

    const firstSuccess = results.find((r) => r.status === "fulfilled");
    if (!firstSuccess || firstSuccess.status !== "fulfilled") {
      throw new Error("All write providers failed");
    }
    return firstSuccess.value;
  }

  async search(query: MemoryQuery): Promise<MemoryEntry[]> {
    // Route semantic searches to semantic-capable providers
    if (query.semantic) {
      const semanticProvider = [...this.providers.values()].find((p) =>
        p.capabilities.has("semantic")
      );
      if (semanticProvider?.semanticSearch) {
        return semanticProvider.semanticSearch(
          query.text || "",
          query.scope,
          query.limit
        );
      }
    }

    // Fall back to keyword search across all search providers
    const searchProviders = this.config.routing.search
      .map((name) => this.providers.get(name))
      .filter(Boolean);

    const results = await Promise.all(
      searchProviders.map((p) => p!.search(query))
    );
    return this.deduplicateAndRank(results.flat());
  }

  // ... remaining method implementations follow same pattern
}
```

---

## 9. Security Model

### 9.1 Phase 1 (File-Based)

| Concern | Mitigation |
|---|---|
| User scope isolation | Convention-based: agents should only write to their own user scope. No filesystem enforcement. **[TD-52-01]** |
| Shared scope integrity | Git-tracked: changes reviewable via PR. Any team member can write. |
| Secret leakage | Memory files must not contain secrets. AGENTS.md convention states this explicitly. |
| PII in memories | Phase 1-3: Names in preferences acceptable. No emails, phone numbers, financial data. Phase 4 requires privacy impact assessment. |

### 9.2 Phase 2 (Supabase)

| Concern | Mitigation |
|---|---|
| User scope isolation | RLS policy: `auth.uid()` matches `owner_uid` on user-type scopes |
| Scope-chain read access | RLS policy: authenticated users can read shared scopes (org, project, app) |
| API authentication | MCP server authenticates via Supabase service-role key internally; external REST adapter uses user auth tokens |
| Embedding data | Embeddings are derived from content; no additional PII beyond what's in the content |
| LLM data leakage | LLM-enhanced extraction is opt-in and disabled by default. Document that it should not be used in repos with sensitive commit messages. |

**RLS Policy Pseudocode:**

```sql
-- memory_scopes: add owner column for user-type scopes
ALTER TABLE memory_scopes ADD COLUMN owner_uid UUID;

-- Read policy: shared scopes readable by all authenticated; user scopes only by owner
CREATE POLICY "read_scopes" ON memory_scopes FOR SELECT
  USING (
    type != 'user' OR owner_uid = auth.uid()
  );

-- Write policy: shared scopes writable by authenticated; user scopes only by owner
CREATE POLICY "write_scopes" ON memory_scopes FOR INSERT
  WITH CHECK (
    type != 'user' OR owner_uid = auth.uid()
  );

-- Read memories: user can read memories in scopes they can see
CREATE POLICY "read_memories" ON memories FOR SELECT
  USING (
    scope_id IN (SELECT id FROM memory_scopes)  -- RLS on scopes cascades
  );

-- Write memories: user can write to scopes they own (user) or any shared scope
CREATE POLICY "write_memories" ON memories FOR INSERT
  WITH CHECK (
    scope_id IN (
      SELECT id FROM memory_scopes
      WHERE type != 'user' OR owner_uid = auth.uid()
    )
  );
```

**MCP server auth model:** The MCP server runs locally as a process and connects to Supabase with a service-role key (bypasses RLS). It enforces scope isolation in application code by validating that the requesting user's scope chain includes the target scope. This avoids the complexity of passing user auth context through the MCP protocol.

---

## 10. Testing Strategy

### 10.1 Phase 1 Tests

| Test | Type | What It Verifies |
|---|---|---|
| Scope YAML parsing | Unit | `_scopes.yaml` loads and validates correctly |
| Glob pattern matching | Unit | File paths resolve to expected scopes |
| Specificity sorting | Unit | More specific patterns match before general ones |
| Scope chain resolution | Unit | Full chain built correctly from matched scope to root + user |
| Memory entry parsing | Unit | Frontmatter + content extracted correctly from multi-entry files |
| Superseded filtering | Unit | Entries with `status: superseded` excluded from reads |
| Post-commit extraction heuristics | Unit | Known commit patterns produce expected memory candidates |
| Write template correctness | Integration | Written entry is parseable by reader |
| End-to-end scope read | Integration | Given a working path, correct memories from correct scopes returned |

### 10.2 Critical Test Cases

| ID | Test | Expected Result |
|---|---|---|
| TC-01 | Parse memory file where content body contains `---` (markdown horizontal rule) | Parser does not split on content `---`; entry remains intact |
| TC-02 | Parse memory file with `---` followed by non-YAML text in content | Parser ignores the `---` (not a frontmatter boundary) |
| TC-03 | Load `_scopes.yaml` with missing `id` field | Validation error thrown |
| TC-04 | Load `_scopes.yaml` with duplicate scope IDs | Validation error thrown |
| TC-05 | Load `_scopes.yaml` with circular parent chain (A→B→A) | Validation error thrown |
| TC-06 | Load `_scopes.yaml` with parent referencing nonexistent scope | Validation error thrown |
| TC-07 | Commit message containing `---\nstatus: active\n---` passed to extraction | Content is sanitized; pending file is not corrupted |
| TC-08 | `git diff-tree` on initial commit (no parent) | Script handles gracefully, returns file list |
| TC-09 | Specificity tie between two patterns with equal literal segments | First-defined in YAML wins |
| TC-10 | File path `packages/shared/src/memory/types.ts` matched | Resolves to `project:my-project` (catch-all), not `org` |

### 10.3 Extraction Heuristic Test Cases

| ID | Commit Message | Expected | Memory Type |
|---|---|---|---|
| EH-01 | `feat(api): add JWT auth with RS256 signing` | Extract: "API uses JWT auth with RS256 signing" | fact |
| EH-02 | `fix(admin): correct sidebar width on mobile` | No extraction (routine fix) | -- |
| EH-03 | `chore: switch from npm to pnpm` | Extract: decision about package manager | decision |
| EH-04 | `refactor(api): migrate from Prisma to Drizzle ORM` | Extract: technology migration decision | decision |
| EH-05 | `chore(deps): bump eslint from 8.0 to 9.0` | No extraction (routine dep bump) | -- |
| EH-06 | `feat: add REDIS_URL to .env.example` | Extract: new env var required | fact |

### 10.4 Test Approach

Phase 1 tests are **file-based** and can run without any server or database. Test fixtures:
- Sample `_scopes.yaml` with all scope types
- Sample memory files with multiple entries (active + superseded)
- Sample git commit messages and diffs for extraction testing

---

## 11. Rollback Strategy

### Phase 1

Rollback is trivial: delete the `scopes/` directory and remove the AGENTS.md section. The existing `.jarvis/context/` vault continues to work as before. No database changes, no service dependencies.

### Phase 2+

Rollback to Phase 1: disable the MCP server and Supabase provider in `memory.config.yaml`. The FileProvider continues to work. Memory files are the source of truth; the database is a derived index that can be dropped and rebuilt.

---

## 12. Performance Considerations

| Concern | Phase 1 Mitigation | Phase 2+ Mitigation |
|---|---|---|
| Token cost of injecting memories | Only inject memories from the resolved scope chain (not all scopes). Estimated: 200-500 tokens per scope, 800-2000 tokens total. | Tier management: only inject `core` + `active` tier. `archive` tier is search-only. |
| File I/O on session start | ~10-20 small files read. Sub-millisecond. | DB query with scope filter. Sub-100ms. |
| Post-commit hook latency | Heuristic extraction: <100ms. LLM extraction: 1-3s (async, non-blocking). | Same. |
| Memory file growth | Acceptable for months of use at current team size. | Phase 3 summarization condenses old entries. |

---

## 13. Task Decomposition (Phase 1)

| # | Task | Depends On | Effort |
|---|---|---|---|
| T1 | Create `_scopes.yaml` with all scope definitions and glob patterns | -- | 0.5h |
| T2 | Create scoped directory structure (`scopes/org/`, `scopes/project/`, `scopes/project/apps/*/`) | T1 | 0.5h |
| T3 | Seed initial memory files from existing context (see migration mapping below) | T2 | 2h |
| T4 | Define memory entry frontmatter schema and create `_pending_memories.md` template | T2 | 0.5h |
| T5 | Write AGENTS.md "Memory System" section (read instructions, write convention, pending memories) | T4 | 0.5h |
| T6 | Update `personal-context-protocol.md` to reference memory system | T5 | 0.5h |
| T7 | Set up Husky for git hooks at monorepo root (`pnpm add -D husky -w`, `"prepare": "husky"` in root package.json, test across workspaces) | -- | 1.5h |
| T8 | Implement `scripts/memory-extract.mjs` (heuristic extraction from commits) | T1, T4, T7 | 3h |
| T9 | Wire post-commit hook to memory extraction script | T7, T8 | 0.5h |
| T10 | Write unit tests for scope resolution, entry parsing, extraction heuristics | T1-T4 | 2h |
| T11 | Write integration test: end-to-end scope chain read | T2, T3 | 1h |
| T12 | Update `.gitignore`: ensure `_pending_memories.md` is gitignored (local staging file, not committed). Audit all gitignore implications of new `scopes/` structure. | T4 | 0.5h |
| T13 | Install `yaml` package as root dev dependency (`pnpm add yaml -w -D`) | -- | 0.25h |
| **Total** | | | **~14h** (includes review/QA buffer) |

### 13.1 Migration Mapping (T3)

| Source File | Target Scope | Memory Type | Estimated Entries |
|---|---|---|---|
| `AGENTS.md` "Critical Constraints" section | `project:my-project` | fact | 5-6 (Node version, pnpm, Tailwind versions, monorepo builds, env files) |
| `AGENTS.md` "Code Patterns" section | `project:my-project` | fact | 3-4 (Axios instance, Jotai state, path aliases) |
| `AGENTS.md` "Deprecated Apps" section | `project:my-project` | decision | 1 (coach app deprecated, prefer my-coach-app) |
| `.jarvis/context/decisions.md` | `project:my-project` or `org:my-org` | decision | Review and categorize by scope |
| `.jarvis/context/architecture/*.md` | `org:my-org` | fact, decision | Extract key architecture decisions |
| App-specific patterns (e.g., admin uses Tailwind v4) | `app:admin`, `app:api`, etc. | fact | 2-3 per app |

All migrated entries use `source: migration` in frontmatter. Original files remain unchanged.
