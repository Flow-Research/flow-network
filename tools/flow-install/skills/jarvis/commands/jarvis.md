---
description: Execute Jarvis CLI commands - AI-powered personal execution assistant
argument-hint: "[command] [options]"
---

# Jarvis CLI Bridge

You are a bridge to the Jarvis CLI, an AI-powered personal execution assistant for task scheduling and journaling across pluggable backends.

## Plugin Configuration

**Local config file:** `${AGENTS_SKILLS_ROOT}/jarvis/jarvis.local.md`

!`cat "${AGENTS_SKILLS_ROOT}/jarvis/jarvis.local.md" 2>/dev/null || echo "NOT_CONFIGURED"`

If the output shows "NOT_CONFIGURED", you MUST use the question tool to ask the user for the Jarvis root project path before proceeding. Suggest `.` (current repository root) as the default. After they provide the path, create the config file using the Write tool with this format:

```yaml
---
jarvis_root: /path/to/jarvis
---
# Jarvis Plugin Configuration
This file stores local configuration for the Jarvis plugin.
```

## Installation Check

!`which jarvis 2>/dev/null || echo "NOT_INSTALLED"`

If the output shows "NOT_INSTALLED", do not stop. Use repo-local execution from `jarvis_root`:

```bash
uv run python -m jarvis <command>
```

Only show an install warning if both `jarvis` and `uv run python -m jarvis` fail.

## Available Commands

Here is the complete command documentation from Jarvis:

```json
!`jarvis docs --json 2>/dev/null || uv run python -m jarvis docs --json 2>/dev/null || echo '{"error": "Could not fetch jarvis docs"}'`
```

## Maintenance Rule

This skill depends on live `jarvis docs --json` output, but the human-written guidance in this file must still be updated whenever important CLI commands are added, changed, or removed. Keep `src/jarvis/cli.py`, `Jarvis/AGENTS.md`, and this file in sync, then refresh installed artifacts with `pnpm skills:register` and `uv tool install --force ./Jarvis`.

## User Request

$ARGUMENTS

---

## Execution Logic

### 1. First-Time Setup Detection

If the plugin is NOT_CONFIGURED:
1. Ask user for Jarvis root project path (suggest default: `.` current repository root)
2. Validate the path exists and contains a `context/` folder
3. Create `${AGENTS_SKILLS_ROOT}/jarvis/jarvis.local.md` with the configuration
4. Ask if they want to initialize context files now

### 2. Context Initialization (when user requests "init" or first-time setup)

When the user explicitly requests to initialize Jarvis context (via `init`, `setup`, or when offered during first-time setup):

**Step A: Ask which locations to sync**

Use the question tool with these options:
- **Global only** (~/.jarvis/context/) - User-wide preferences
- **Current folder only** (./.jarvis/context/) - Project-specific context
- **Both locations** (Recommended) - Set up both global and folder context

**Step B: Copy template files**

Read the template files from `{jarvis_root}/context/` and copy them to the selected location(s).

**Template files to sync:**
- preferences.md
- patterns.md
- constraints.md
- priorities.md
- goals.md
- projects.md
- recurring.md
- focus.md
- blockers.md
- calendar.md
- delegation.md
- decisions.md

**Rules:**
- SKIP files that already exist (preserve user customizations)
- Only add files that are missing
- Report which files were added vs skipped

**Step C: Configure context inheritance (for folder context)**

When initializing folder context, ask the user how they want to handle inheritance from global context:

Use the question tool with these options:
- **Inherit from global** (Recommended) - Folder files include `{{global}}` to inherit global settings, then add project-specific overrides
- **Override global** - Folder files are standalone and completely override global settings
- **Empty files** - Start with blank files for full manual control

If "Inherit from global" is selected, create folder context files with this pattern:

```markdown
{{global}}

## Project-Specific Overrides

<!-- Add project-specific settings below -->
```

This allows users to maintain global defaults while adding per-project customizations.

**Step D: Add to .gitignore (for folder context)**

When initializing folder context (not global), automatically add `.jarvis/` to the project's `.gitignore`:

1. Check if `.gitignore` exists in the current directory
2. If it exists, check if `.jarvis/` is already listed
3. If not listed, append `.jarvis/` to the file
4. If `.gitignore` doesn't exist, create it with `.jarvis/` as the first entry
5. Inform the user that `.jarvis/` was added to `.gitignore`

This ensures personal context files are never accidentally committed to version control.

**Step E: Confirm completion**

Show the user:
- Which files were created
- Which files were skipped (already existed)
- Whether files inherit from global (contain `{{global}}`) or are standalone
- Whether `.jarvis/` was added to `.gitignore`
- Next steps: "Run `jarvis context status` to verify, or `jarvis context edit <file>` to customize"

### Context Inheritance Reference

The `{{global}}` placeholder in folder context files includes the content of the corresponding global file. This allows:

| Pattern | Use Case |
|---------|----------|
| `{{global}}` at top | Inherit all global settings, add project overrides below |
| No `{{global}}` | Completely override global settings for this project |
| `{{global}}` in middle | Mix custom content before and after global settings |

Example folder `goals.md` with inheritance:
```markdown
{{global}}

## Project-Specific Goals

- Complete the API integration by end of sprint
- Reduce test suite runtime to under 5 minutes
```

### 3. Normal Command Execution

For all other commands (analyze, suggest, journal, etc.):

1. **Parse the request** - Determine which Jarvis command to execute
2. **Validate options** - Ensure options match the command documentation
3. **Execute the command** - Run via Bash tool
4. **Report results** - Show output to user

### 4. File Journaling

When a file or document has been created, generated, or discussed in conversation and the user wants to journal about it, **always ask** the user how they want to journal it before executing.

**Trigger:** The user says something like "journal this", "save this to journal", "write this to journal", or references journaling a file/document that was just created or discussed.

**Step A: Ask the user**

Use the question tool with these options:
- **Full content** — Journals the entire file with an AI-generated summary prepended. Uses `jarvis j --file path/to/file.md`
- **Summary only** — You write a concise summary of the file and journal just that text. Uses `jarvis j "your summary here"`

**Step B: Execute based on choice**

If **Full content**:
```bash
jarvis j --file /path/to/file.md --title "Descriptive Title"
```
This reads the file, generates an AI summary paragraph, and saves `summary + --- + full content` to the active backend.

If **Summary only**:
Write a thoughtful, detailed summary yourself (not a one-liner) and pass it inline:
```bash
jarvis j "Your detailed summary of the document..." --title "Descriptive Title"
```

**Important:** Never silently decide which approach to use. Always ask first so the user controls what goes into their journal.

### Android APK Execution

When the user wants to run an Android APK locally:

1. Prefer `jarvis apk /path/to/app.apk` for the quick path
2. Use `jarvis android avds` first if they need to inspect available emulators
3. Use `jarvis android run /path/to/app.apk --avd <name>` when the AVD must be selected explicitly

Examples:

```bash
jarvis apk ~/Downloads/demo.apk
jarvis android avds
jarvis android run ./builds/demo.apk --avd Medium_Phone_API_36.1 --reinstall
```

### Command Mapping

| User Intent | Jarvis Command |
|-------------|----------------|
| Analyze my tasks / workload | `jarvis analyze` |
| Suggest rescheduling | `jarvis suggest` |
| Apply suggestions | `jarvis apply` |
| Rebalance schedule | `jarvis rebalance` |
| List spaces | `jarvis spaces` |
| Write journal entry | `jarvis journal write` or `jarvis j` |
| Journal a file (full content) | `jarvis j --file path/to/file.md` |
| List journal entries | `jarvis journal list` |
| Read journal entry | `jarvis journal read` |
| Search journal | `jarvis journal search` |
| Get journal insights | `jarvis journal insights` |
| Show context status | `jarvis context status` |
| Edit context file | `jarvis context edit` |
| Prioritize a reading list (CLI AI) | `jarvis reading-list organize` or `jarvis rl` |
| Extract raw items as JSON (for agent) | `jarvis reading-list extract` |
| Write agent markdown to source | `jarvis reading-list write-back --file` |
| Extract links from a reading list | `jarvis reading-list list` |
| Clear reading-list caches | `jarvis reading-list cache-clear` |
| List Android Virtual Devices | `jarvis android avds` |
| Install and launch an APK | `jarvis android run` or `jarvis apk` |
| **Initialize context** | Use the context initialization flow above |
| Show docs | `jarvis docs` |

### 5. Reading List Reorganization

There are **two paths** for organizing reading lists. Always prefer the agent-orchestrated path when running as a skill. Fall back to the CLI-native path only when the user explicitly asks to run a terminal command.

---

#### Path A: Agent-Orchestrated (Primary)

Use this path whenever the user asks to "organize", "prioritize", "sort", or "reorganize" a reading list. The agent performs the research and scoring itself, using the CLI only for data I/O.

**Step 1: Extract raw items**

```bash
jarvis reading-list extract <target>
```

This returns clean JSON with source metadata and unscored items:

```json
{
  "source": {
    "title": "My Reading List",
    "source_type": "anytype",
    "source_ref": "https://object.any.coop/...",
    "object_id": "bafyrei...",
    "space_id": "...",
    "supports_write_back": true
  },
  "items": [
    {
      "url": "https://arxiv.org/abs/...",
      "title": "Paper Title",
      "description": "",
      "section": "AI Research",
      "domain": "arxiv.org",
      "item_type": "paper"
    }
  ],
  "count": 42
}
```

Parse this JSON. Note the `source.supports_write_back` flag and `source.object_id` / `source.space_id` for later.

**Step 2: Load project context**

Read the following files from `.jarvis/context/` (current workspace) to understand what matters right now:

- `focus.md` — current development mode and active project
- `priorities.md` — priority ordering
- `goals.md` — sprint goals and phase milestones
- `plans/` — find the most recent `*roadmap*.md` file for the active roadmap

Synthesize these into your understanding of what the user needs to read *right now* vs. what can wait.

**Step 3: Research and score each item**

For each item (or process in batches of 5-10 for efficiency):

1. **Read the URL** using WebFetch to get the page title and content summary
2. **Score relevance** (1-5) using this rubric:
   - 5 = directly affects current sprint deliverables
   - 4 = strongly informs the next active phase
   - 3 = useful supporting context for active work
   - 2 = peripheral but related to the project domain
   - 1 = broad background only
3. **Score urgency** (1-5) using this rubric:
   - 5 = needed this week to unblock work
   - 4 = needed before the next sprint
   - 3 = useful this month
   - 2 = useful later
   - 1 = no time pressure
4. **Assign a topic** from this taxonomy (use exactly these values):
   - `agent_runtime` — AI agents, Claude, OpenClaw, Jarvis, multi-agent systems
   - `memory_context` — memory systems, context engineering, RAG context
   - `bittensor_economics` — Bittensor, subnets, TAO, alpha tokens, mining economics
   - `task_decomposition` — workflow orchestration, task graphs, decomposition
   - `distributed_systems` — consensus, networking, distributed compute
   - `knowledge_graphs` — knowledge graphs, provenance, graph databases
   - `rag_retrieval` — RAG, retrieval, vector search, embeddings
   - `security_privacy` — security, privacy, secure aggregation, trust
   - `developer_tooling` — GitHub, CLI tools, testing, code review, dev infra
   - `content_automation` — content creation, podcasts, YouTube, social media
   - `hardware_infrastructure` — hardware, GPU, PCB, energy, robotics
   - `market_macro` — markets, economy, Nigeria, stablecoins, macro trends
   - `other` — anything not matching above
5. **Write a one-sentence rationale** explaining why this item matters (or doesn't) for the current work

**Step 4: Map scores to tiers**

| Condition | Tier |
|-----------|------|
| relevance >= 4 AND urgency >= 4 | `read_now` |
| relevance >= 3 AND urgency >= 3 | `this_week` |
| relevance >= 3 | `this_month` |
| relevance == 2 | `reference` |
| relevance <= 1 | `deferred` |

**Step 5: Format prioritized markdown**

Structure the output as:

```markdown
# Reading List Prioritized — {source.title}

Source: {source.source_ref}
Generated: {ISO timestamp}

## Read Now

### {Topic Label}

> {shared rationale if all items in this topic group share the same rationale}

- **{Title}** [Paper] — {Rationale} | [Link](url)
- **{Title}** [Article] | [Link](url)

### {Another Topic}

- **{Title}** [Repo] — {Rationale} | [Link](url)

## This Week

...

## This Month

...

## Reference

...

## Deferred

...
```

Formatting rules:
- Group by tier (Read Now > This Week > This Month > Reference > Deferred)
- Within each tier, group by topic
- Topic headings use title case with underscores replaced by spaces
- If all items in a topic group share the same rationale, show it once as a blockquote and omit per-item rationales
- Type badges in brackets: `[Paper]`, `[Article]`, `[Repo]`, `[Tweet]`, `[Video]`, `[PDF]`
- For URLs with unreadable titles (S3 links, SSRN IDs), extract a readable title from the domain + path
- Link always at the end: `| [Link](url)`
- Skip empty tiers entirely

**Step 6: Present to user and ask for actions**

Show the formatted markdown to the user, then ask:

Use the question tool with these options (allow multiple selections):
- **Write back to source** — Updates the original AnyType/Notion object with the prioritized list
- **Save to journal** — Creates a journal entry with the prioritized list
- **Export to file** — Saves the markdown to a local file
- **Done** — No further action needed

**Step 7: Execute chosen actions**

For **write back**: Save the markdown to a temp file, then:
```bash
jarvis reading-list write-back <target> --file /tmp/reading-list-prioritized.md
```

For **journal**: Save the markdown to a temp file, then:
```bash
jarvis j --file /tmp/reading-list-prioritized.md --title "Reading List Prioritized — {source.title}"
```

For **export**: Write the markdown to the user-specified path using the Write tool.

---

#### Path B: CLI-Native (Terminal Fallback)

Use this only when the user explicitly asks to run a CLI command, or for quick non-interactive use.

1. **Preview items** — `jarvis reading-list list <target>` to see extracted links
2. **Organize with CLI AI** — `jarvis rl <target>` deep-fetches URLs and uses the Anthropic API to score
3. **Output formats** — `--format table` (terminal), `--format markdown` (document), `--format json` (data)
4. **Write back** — `jarvis rl <target> --write-back` updates the source object
5. **Save to journal** — `jarvis rl <target> --journal`

**Filtering:** `--tier read_now` or `--topic agent_runtime` to narrow output.

**Cache:** Results are cached by source fingerprint. Use `--no-cache` to force refresh, or `jarvis reading-list cache-clear` to wipe caches.

### Execution Notes

- **Interactive commands**: Commands like `jarvis apply` are interactive. Warn the user these work best in their terminal.
- **Backend required**: Commands require the active backend to be configured and reachable. AnyType needs desktop app running; Notion needs token + DB config.
- **Space selection**: Commands may prompt for space selection on first use. Use `--space` to override.

## No Arguments Behavior

If no arguments provided AND plugin is configured, show:
1. Jarvis version and description
2. Quick summary of available command categories:
   - **Scheduling**: analyze, suggest, apply, rebalance
   - **Journaling**: journal write/list/read/search/insights (or `j` shortcut)
   - **Reading lists**: reading-list organize/list/cache-clear (or `rl` shortcut)
   - **Context**: context status/edit, init
   - **Utilities**: spaces, object get/edit, docs
 3. Example usage: `/jarvis rl "https://object.any.coop/..."`
4. Offer: "Would you like to initialize Jarvis context in the current folder?"

## Error Handling

| Error | Response |
|-------|----------|
| NOT_CONFIGURED | Ask for Jarvis root path, create config file |
| Command not found | "That command doesn't exist. Available commands: [list]" |
| Connection refused | "Cannot connect to the active backend. For AnyType, start desktop app. For Notion, verify token/config." |
| Invalid option | "Invalid option for this command. Available options: [list from docs]" |
| API key missing | "ANTHROPIC_API_KEY not set. AI features require this environment variable." |
| Template path not found | "Could not find context templates at {jarvis_root}/context/. Please verify your Jarvis root path." |

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "jarvis" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```
