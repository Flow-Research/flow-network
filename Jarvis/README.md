# Jarvis - AI Assistant for AnyType

A CLI tool for task scheduling and journaling that integrates with [AnyType](https://anytype.io/).

## Features

- **Task Management** - Create tasks with natural language due dates, priorities, and tags
- **Smart Scheduling** - AI-powered workload analysis and schedule rebalancing
- **Journaling** - Freeform journaling with AI-generated titles and insights
- **Context System** - Two-tier personalization (global + project-specific)

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- AnyType desktop app running locally (default: `localhost:31009`)
- Anthropic API key (for AI features)

## Installation

### Installed CLI from this workspace (recommended)

```bash
# From the Flow Harness workspace root
uv tool install --force ./Jarvis

# Run the installed CLI
jarvis --help
```

### Using uv in a local checkout

```bash
git clone https://github.com/Flow-Research/flow-harness.git
cd flow-harness/Jarvis
uv sync
uv run jarvis --help
```

### GitHub install (after publishing `flow-harness`)

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-harness#subdirectory=Jarvis"
jarvis --help
```

### Using pip

```bash
git clone https://github.com/Flow-Research/flow-harness.git
cd flow-harness/Jarvis
pip install -e .

jarvis --help
```

### Shell Alias (optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias jarvis="uv run --directory /path/to/jarvis python -m jarvis"
```

### Shell Completion (optional)

For zsh, add to `~/.zshrc`:
```bash
eval "$(_JARVIS_COMPLETE=zsh_source jarvis)"
```

For bash, add to `~/.bashrc`:
```bash
eval "$(_JARVIS_COMPLETE=bash_source jarvis)"
```

## Configuration

### Environment Variables

```bash
# Required for AI features
export ANTHROPIC_API_KEY="your-api-key"
```

### Two-Tier Context System

Jarvis uses a two-tier context system for AI personalization:

| Level | Location | Purpose |
|-------|----------|---------|
| **Global** | `~/.jarvis/context/` | User-wide preferences (all projects) |
| **Folder** | `./.jarvis/context/` | Project-specific overrides |

Folder context **overrides** global context. Use `{{global}}` in folder files to **include** global content.

```bash
# Initialize global context (~/.jarvis/context/)
jarvis init --global

# Initialize project context (./.jarvis/context/)
jarvis init --folder

# Check loaded context
jarvis context status

# Edit context files
jarvis context edit preferences        # Edit folder context
jarvis context edit goals --global     # Edit global context
```

### Context Files

| File | Purpose |
|------|---------|
| `preferences.md` | Work hours, task preferences |
| `patterns.md` | Weekly/daily work patterns |
| `constraints.md` | Hard rules that can't be violated |
| `priorities.md` | Current priority hierarchy |
| `goals.md` | Short and long-term goals |
| `projects.md` | Active projects |
| `focus.md` | Current focus areas |

## Usage

### Task Management

```bash
# Quick task creation
jarvis t "Buy groceries" --due tomorrow
jarvis t "Review PR" -d friday -p high -t work

# With multiple tags
jarvis t "Fix bug #123" -p high -t urgent -t bugs

# Open editor for description
jarvis task create "Q1 Planning" --due "jan 31" -p high -e

# Verbose output
jarvis t "Important task" --due tomorrow -v
```

### Schedule Management

```bash
# Analyze workload for next 14 days
jarvis analyze

# Generate AI rescheduling suggestions
jarvis suggest

# Apply suggestions interactively
jarvis apply

# Apply all suggestions without prompting
jarvis apply --yes

# Full schedule rebalance
jarvis rebalance
```

### Journaling

```bash
# Quick journal entry (AI generates title)
jarvis j "Today I learned about async/await patterns..."

# With custom title
jarvis j "Entry text" --title "My Custom Title"

# Open editor for longer entries
jarvis journal write --editor

# Interactive multi-line mode
jarvis journal write --interactive

# List recent entries
jarvis journal list

# Read specific entry (by list number)
jarvis journal read 1

# Search entries
jarvis journal search "python"

# AI insights across entries
jarvis journal insights --days 30
```

### Space Management

```bash
# List available AnyType spaces
jarvis spaces

# Select a different space
jarvis spaces --select
```

## Example Session

```bash
$ jarvis analyze

📊 Schedule Analysis (Next 14 Days)

  Mon 27  ████████████  8 tasks  ⚠️  Overloaded
  Tue 28  ██████        4 tasks  ✓
  Wed 29  ████          2 tasks  ○  Light
  ...

$ jarvis suggest

💡 3 Suggestions Generated

1. "Write API docs"
   Mon 27 → Wed 29
   Reason: Balances workload, no deadline pressure

$ jarvis j "Shipped the new feature today!"

╭─────────────── Journal ───────────────╮
│ Entry saved!                          │
│                                       │
│ 24 - Feature Launch Victory           │
│ Journal/2026/January                  │
╰───────────────────────────────────────╯
```

## Development

### Running Tests

```bash
# Run all tests
uv run pytest tests/ -v

# Run with coverage
uv run pytest tests/ -v --cov=src/jarvis --cov-report=term-missing

# Run specific test file
uv run pytest tests/task/test_cli.py -v
```

### Code Quality

```bash
# Linting
uv run ruff check src/

# Type checking
uv run mypy src/jarvis/

# Format code
uv run ruff format src/
```

## Project Structure

```
src/jarvis/
├── cli.py              # Main CLI entry point
├── anytype_client.py   # AnyType API wrapper
├── context_reader.py   # Two-tier context loading
├── analyzer.py         # Workload analysis
├── ai_client.py        # Anthropic API client
├── models.py           # Pydantic models
├── state.py            # Global state management
├── journal/            # Journaling subsystem
│   ├── cli.py          # Journal CLI commands
│   ├── hierarchy.py    # Journal → Year → Month structure
│   ├── capture.py      # Entry capture modes
│   └── ...
└── task/               # Task management subsystem
    ├── cli.py          # Task CLI commands
    ├── service.py      # Task creation service
    ├── date_parser.py  # Natural language date parsing
    └── editor.py       # Editor integration

~/.jarvis/                    # Global Jarvis data
├── config.json               # Settings (selected space, etc.)
├── .jarvis/context/          # Project context files
├── journal/                  # Journal state
└── pending.json              # Pending suggestions
```

## Troubleshooting

### AnyType Connection Issues

Ensure AnyType desktop app is running and the gRPC server is enabled:
- Default endpoint: `localhost:31009`
- Check AnyType settings for API/gRPC configuration

### API Key Issues

```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Or set it inline
ANTHROPIC_API_KEY=your-key jarvis suggest
```

## License

MIT
