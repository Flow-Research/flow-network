# Jarvis - AI Assistant with Pluggable Backends

This is a CLI tool for task scheduling and journaling that supports multiple knowledge base backends (AnyType, Notion).

## AI Agent Discovery

**For comprehensive CLI documentation, run:**

```bash
jarvis docs        # Human-readable markdown
jarvis docs --json # Machine-readable JSON
```

This outputs all commands, options, and examples in a format optimized for AI consumption.

## Maintenance Rule

Whenever Jarvis CLI commands are added, changed, or removed, update all of the following in the same change:

1. `src/jarvis/cli.py` so `jarvis docs` / `jarvis docs --json` stay accurate
2. `Jarvis/AGENTS.md` quick reference and command examples
3. `tools/flow-install/skills/jarvis/commands/jarvis.md` so the Jarvis skill stays current
4. The installed artifacts on the local machine when the change is important:
   - re-register skills: `pnpm skills:register`
   - reinstall CLI: `uv tool install --force ./Jarvis`

Do not treat source updates as complete until the installed CLI and installed skill are refreshed when the change materially affects command behavior.

## Quick Reference

## Installation

```bash
# Local workspace install
uv tool install --force ./Jarvis

# GitHub install (after publishing harnessy)
uv tool install --force "git+https://github.com/Flow-Research/harnessy#subdirectory=Jarvis"
```

### Running Commands

```bash
# Use the installed CLI (if alias is set up)
jarvis <command>

# Or run via uv from this repo
uv run python -m jarvis <command>
```

### Available Commands

| Command | Description |
|---------|-------------|
| `jarvis analyze` | Analyze task distribution over next 14 days |
| `jarvis suggest` | Generate AI rescheduling suggestions |
| `jarvis apply` | Apply pending suggestions interactively |
| `jarvis rebalance` | Full schedule rebalance |
| `jarvis spaces` | List/select AnyType spaces |
| `jarvis init` | Initialize context directories |
| `jarvis context status` | Show loaded context files |
| `jarvis context edit <file>` | Edit a context file |
| `jarvis journal write` | Write a journal entry |
| `jarvis j` | Alias for `journal write` |
| `jarvis journal list` | List recent entries |
| `jarvis journal read <n>` | Read entry by number |
| `jarvis journal search <query>` | Search entries |
| `jarvis journal insights` | AI analysis of entries |
| `jarvis task create` | Create a new task in AnyType |
| `jarvis t` | Alias for `task create` (quick capture) |
| `jarvis object get <id>` | Fetch and display any object by ID or URL |
| `jarvis object edit <id>` | Edit object properties (interactive or --set) |
| `jarvis o <id>` | Quick object lookup/edit alias |
| `jarvis reading-list organize <target>` | Deep research and prioritize a reading list (CLI AI) |
| `jarvis reading-list extract <target>` | Extract raw items as JSON for agent consumption |
| `jarvis reading-list write-back <target>` | Write agent-formatted markdown back to source |
| `jarvis reading-list list <target>` | Extract and display links from a reading list |
| `jarvis reading-list cache-clear` | Clear reading list caches |
| `jarvis rl <target>` | Quick alias for reading-list organize |
| `jarvis android run <apk>` | Boot emulator if needed, install an APK, and launch it |
| `jarvis android avds` | List available Android Virtual Devices |
| `jarvis apk <apk>` | Quick alias for `android run` |
| `jarvis docs` | Output full CLI documentation for AI agents |
| `jarvis status` | Show connection status and backend capabilities |
| `jarvis config show` | Display current configuration |
| `jarvis config capabilities` | Show backend capabilities |

### Task Commands

```bash
# Quick task capture
jarvis t "Buy groceries" --due tomorrow
jarvis t "Review PR" -d friday -p high -t work

# With priority and tags
jarvis t "Fix bug #123" -p high -t urgent -t bugs

# Full creation with description (opens editor)
jarvis task create "Q1 Planning" --due "jan 31" -p high -t planning -e

# Verbose output
jarvis t "Important task" --due tomorrow -v
```

### Object Commands

```bash
# Fetch and inspect any object by ID
jarvis o bafyreig...
jarvis object get bafyreig...

# Fetch a Notion page by URL
jarvis o https://notion.so/My-Page-abc123def456...

# Show raw API response as JSON
jarvis o bafyreig... --raw

# Interactive edit mode (prompts for property changes)
jarvis o bafyreig... --edit
jarvis object edit bafyreig...

# Inline property updates (scripted)
jarvis object edit bafyreig... --set due_date=2026-04-01
jarvis object edit bafyreig... --set name="New Title" --set priority=1
jarvis o bafyreig... --set done=true
```

### Journal Commands

```bash
# Quick journal entry
jarvis j "Your entry text here"

# With custom title (skips AI title generation)
jarvis j "Entry text" --title "My Title"

# Open editor for longer entries
jarvis journal write --editor

# List recent entries
jarvis journal list

# Read specific entry (by list number)
jarvis journal read 1
```

### Android Commands

```bash
# Install and launch an APK on the default emulator
jarvis apk ~/Downloads/demo.apk

# Choose a specific AVD when no emulator is running
jarvis android run ./builds/demo.apk --avd Medium_Phone_API_36.1

# Reinstall without launching the app
jarvis android run ./builds/demo.apk --reinstall --no-launch

# List available Android emulators
jarvis android avds
```

### Context System

Two-tier context for AI personalization:

- **Global**: `~/.jarvis/context/` - User-wide preferences
- **Folder**: `./.jarvis/context/` - Project-specific overrides

```bash
# Initialize global context
jarvis init --global

# Initialize folder context
jarvis init --folder

# Check what's loaded
jarvis context status
```

## Project Structure

```
src/jarvis/
├── cli.py              # Main CLI entry point
├── anytype_client.py   # AnyType API wrapper (legacy, use adapters)
├── context_reader.py   # Two-tier context loading
├── analyzer.py         # Workload analysis
├── ai_client.py        # Anthropic API client
├── state.py            # Global state management
├── android/            # Android emulator + APK runner feature
│   ├── cli.py          # Android CLI commands
│   └── service.py      # Emulator boot/install/launch helpers
├── adapters/           # Backend abstraction layer
│   ├── __init__.py     # AdapterRegistry and exports
│   ├── base.py         # KnowledgeBaseAdapter Protocol
│   ├── exceptions.py   # Typed exception hierarchy
│   ├── retry.py        # Retry decorator with backoff
│   ├── anytype.py      # AnyType adapter implementation
│   └── notion/         # Notion adapter package
│       ├── __init__.py
│       ├── adapter.py  # Notion adapter implementation
│       └── mappings.py # Property type mappings
├── config/             # Configuration management
│   ├── __init__.py
│   └── schema.py       # Pydantic config schemas
├── models/             # Domain models
│   ├── __init__.py
│   ├── task.py         # Task model
│   ├── journal_entry.py# JournalEntry model
│   ├── backend_object.py # Generic object model (any type)
│   ├── space.py        # Space model
│   ├── tag.py          # Tag model
│   └── priority.py     # Priority enum
├── journal/            # Journal feature
│   ├── cli.py          # Journal CLI commands
│   ├── hierarchy.py    # Journal → Year → Month structure
│   ├── capture.py      # Entry capture modes
│   └── state.py        # Journal state management
├── object/             # Object inspection & editing
│   ├── __init__.py
│   └── cli.py          # Object CLI commands (get, edit, ID parsing)
├── reading_list/       # Reading list prioritization
│   ├── cli.py          # reading-list CLI commands
│   ├── parser.py       # Markdown link extraction
│   ├── fetcher.py      # Deep URL content fetching
│   ├── prioritizer.py  # AI + heuristic prioritization
│   └── cache.py        # URL/result caching
└── task/               # Task feature
    ├── cli.py          # Task CLI commands
    ├── date_parser.py  # Natural language date parsing
    └── editor.py       # Editor integration for descriptions
```

## Key Files

| File | Purpose |
|------|---------|
| `src/jarvis/cli.py` | All CLI command definitions |
| `src/jarvis/journal/cli.py` | Journal subcommands |
| `src/jarvis/task/cli.py` | Task subcommands |
| `src/jarvis/object/cli.py` | Object get/edit subcommands |
| `src/jarvis/anytype_client.py` | AnyType API integration |
| `src/jarvis/context_reader.py` | Context file loading/merging |

## Testing

```bash
# Run all tests
uv run python -m pytest tests/ -v

# Run unit tests only (fast)
uv run python -m pytest tests/ -v -m "not integration"

# Run integration tests (requires backends)
uv run python -m pytest tests/integration/ -v -m integration

# Run specific test file
uv run python -m pytest tests/test_anytype_client_journal.py -v
```

## Environment

Requires:
- `ANTHROPIC_API_KEY` - For AI features (task suggestions, journal insights)

### Backend Requirements

**AnyType (default):**
- AnyType desktop app running on localhost:31009
- 4-digit auth code approval on first connection

**Notion (optional):**
- `JARVIS_NOTION_TOKEN` - Notion integration token
- Config file at `~/.jarvis/config.yaml` with database IDs

## Backend Abstraction Layer

Jarvis uses a pluggable adapter pattern to support multiple knowledge base backends.

### Supported Backends

| Backend | Tasks | Journal | Tags | Search | Relations |
|---------|-------|---------|------|--------|-----------|
| AnyType | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notion  | ✅ | ✅ | ✅ | ✅ | ✅ |

### Capabilities

Each adapter declares its capabilities, enabling graceful feature degradation:

```python
from jarvis.adapters import get_adapter

adapter = get_adapter()  # Gets default backend
print(adapter.capabilities)
# {'tasks': True, 'journal': True, 'tags': True, 'search': True, ...}
```

### Configuration

Create `~/.jarvis/config.yaml`:

```yaml
# Default backend (anytype, notion)
default_backend: anytype

backends:
  anytype:
    default_space_id: null  # Auto-detected

  notion:
    workspace_id: "your-workspace-id"
    task_database_id: "your-tasks-db-id"
    journal_database_id: "your-journal-db-id"
    property_mappings:
      title: "Name"
      due_date: "Due Date"
      priority: "Priority"
      done: "Done"
      tags: "Tags"
```

## Common Tasks

### Using the adapter interface (recommended)

```python
from jarvis.adapters import get_adapter
from jarvis.models import Priority
from datetime import date, timedelta

# Get the configured adapter (AnyType by default)
adapter = get_adapter()
adapter.connect()

# Get default space
space_id = adapter.get_default_space()

# Create a task
task = adapter.create_task(
    space_id=space_id,
    title="My Task",
    due_date=date.today() + timedelta(days=1),
    priority=Priority.HIGH,
    tags=["work", "urgent"],
    description="Task details here",
)
print(f"Created task: {task.id}")

# Create a journal entry
entry = adapter.create_journal_entry(
    space_id=space_id,
    content="Today I learned about adapters...",
    title="Learning Notes",
)
print(f"Created entry: {entry.id}")

# Query tasks
tasks = adapter.get_tasks(
    space_id,
    start_date=date.today(),
    end_date=date.today() + timedelta(days=7),
    include_done=False,
)
```

### Using a specific backend

```python
from jarvis.adapters import get_adapter

# Explicitly use Notion
adapter = get_adapter("notion")
adapter.connect()

# Explicitly use AnyType
adapter = get_adapter("anytype")
adapter.connect()
```

### Legacy AnyType client (deprecated)

```python
# Legacy API - use adapters instead
from jarvis.anytype_client import AnyTypeClient
from datetime import date

client = AnyTypeClient()
client.connect()
space_id = client.get_default_space()

task_id = client.create_task(
    space_id=space_id,
    title="My Task",
    due_date=date.today(),
    priority="high",
)
```

### Loading context

```python
from jarvis.context_reader import load_context, get_context_locations

# Load merged global + folder context
ctx = load_context()

# Check where context is loaded from
locations = get_context_locations()
print(f"Global: {locations['global']}")
print(f"Folder: {locations['folder']}")
```

## Implementing a New Backend Adapter

To add support for a new knowledge base backend:

### 1. Create the adapter class

```python
# src/jarvis/adapters/mybackend.py
from datetime import date
from ..models import JournalEntry, Priority, Space, Tag, Task

class MyBackendAdapter:
    """Adapter for MyBackend knowledge base."""

    @property
    def capabilities(self) -> dict[str, bool]:
        return {
            "tasks": True,
            "journal": True,
            "tags": True,
            "search": False,  # Mark as False if not supported
            "priorities": True,
            "due_dates": True,
            "daily_notes": False,
            "relations": False,
            "custom_properties": False,
        }

    @property
    def backend_name(self) -> str:
        return "mybackend"

    def connect(self) -> None:
        # Establish connection
        ...

    def disconnect(self) -> None:
        ...

    def is_connected(self) -> bool:
        ...

    # Implement all Protocol methods from base.py
    def create_task(self, space_id: str, title: str, ...) -> Task:
        ...
```

### 2. Register the adapter

```python
# In src/jarvis/adapters/__init__.py
from .mybackend import MyBackendAdapter

def _register_builtin_adapters() -> None:
    AdapterRegistry.register("mybackend", MyBackendAdapter)
```

### 3. Add configuration schema

```python
# In src/jarvis/config/schema.py
class MyBackendConfig(BaseModel):
    api_key: str | None = None
    workspace_id: str | None = None
    # Add backend-specific config fields

class BackendsConfig(BaseModel):
    mybackend: MyBackendConfig | None = None
```

### 4. Handle errors properly

Use the typed exceptions from `jarvis.adapters.exceptions`:

```python
from jarvis.adapters.exceptions import (
    AuthError,        # Authentication failures
    ConnectionError,  # Network/connection issues
    NotFoundError,    # Resource not found
    RateLimitError,   # Rate limiting (with retry_after)
    ValidationError,  # Invalid input
    ConfigError,      # Configuration issues
)
```

### 5. Add integration tests

Create `tests/integration/test_mybackend_adapter.py` following the pattern in existing tests.

## Exception Hierarchy

```
JarvisBackendError (base)
├── ConnectionError  - Network/connection issues
├── AuthError        - Authentication failures
├── NotFoundError    - Resource not found
├── NotSupportedError - Capability not supported
├── RateLimitError   - Rate limiting (has retry_after)
├── ValidationError  - Invalid input (has field)
├── ConfigError      - Configuration issues
└── AdapterNotFoundError - Unknown adapter
```

All exceptions include `backend` attribute for identifying the source.

<!-- flow:start -->
## Flow Framework

> `FLOW_SKIP_SUBPROJECTS=true`

### Skill Usage Protocol

- Check available skills before proceeding on every request.
- Global skills: `~/.agents/skills/`
- Project skills: `.agents/skills/` (if present)
- Catalog: `.jarvis/context/skills/_catalog.md`
- Register: use the project skill scripts (for example `pnpm skills:register` or `npm run skills:register`) | Validate: the matching `skills:validate` script

### Context Vault

- Project context: `.jarvis/context/`
- Loading order: projects.md -> focus.md -> priorities.md -> goals.md -> decisions.md
- `{{global}}` in context files is Jarvis CLI templating; treat as no-op

### Memory System

- Scope registry: `.jarvis/context/scopes/_scopes.yaml`
- Scope resolution: most-specific match wins; user scope always highest priority
- Memory types: fact, decision, preference, event
- One file per scope per type

### Technical Debt Tracking

- Register: `.jarvis/context/technical-debt.md`
- Per-epic: `.jarvis/context/specs/<epic>/tech_debt.md`
- Required fields: ID, status, type, scope, context, impact, resolution, target, links

### Conventions

- No `.env` commits — use `.env.example`
- Personal context in `.jarvis/context/private/<username>/` (gitignored)
<!-- flow:end -->
