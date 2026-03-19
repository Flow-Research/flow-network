# Flow Network

Flow Network is a reusable agent harness for software projects.

It gives any repository a working AI operating layer with:

- `jarvis` CLI in the user's PATH
- shared Flow skills installed globally
- project-specific skills vendored in `.agents/skills/`
- lifecycle scripts for skill registration, validation, and local setup
- a scoped memory system in `.jarvis/context/scopes/`
- personal context and private space under `.jarvis/context/`
- a shared context vault and knowledge base protocol
- root `AGENTS.md` instructions for humans and coding agents

## What You Get

After installation, a project gets this baseline structure:

```text
.
├── AGENTS.md
├── .agents/
│   └── skills/                 # project-local skills (optional)
├── .jarvis/
│   └── context/
│       ├── README.md
│       ├── technical-debt.md
│       ├── skills/_catalog.md
│       ├── scopes/_scopes.yaml
│       ├── private/<username>/
│       └── ...
└── package.json scripts
    ├── skills:register
    ├── skills:validate
    └── postinstall
```

Shared/core skills are sourced from `tools/flow-install/skills/` and installed into `~/.agents/skills/`.
Project-specific skills stay in each repo's `.agents/skills/` directory and are registered globally by the generated scripts.

## Installation

### Option 1: Bootstrap a full Flow workspace

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash
```

This bootstrap script:

- installs `uv` if needed
- verifies `node` and `pnpm`
- clones `flow-network`
- installs `jarvis`
- runs `flow-install`
- installs lifecycle scripts into `$HOME/.scripts`
- scaffolds the `.jarvis/context/` vault and memory system

Useful environment variables:

| Variable | Purpose | Example |
|---|---|---|
| `FLOW_INSTALL_DIR` | Where the workspace should be cloned | `/Users/name/flow-network` |
| `FLOW_NONINTERACTIVE` | Skip prompts during bootstrap | `1` |
| `FLOW_SKIP_SUBPROJECTS` | Do not clone optional sub-project repos | `1` |
| `FLOW_REPO_URL` | Override the GitHub source | custom fork URL |

Example:

```bash
FLOW_INSTALL_DIR="$HOME/work/flow-network" \
FLOW_NONINTERACTIVE=1 \
FLOW_SKIP_SUBPROJECTS=1 \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh)"
```

### Option 2: Install Jarvis only

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-network.git#subdirectory=Jarvis"
jarvis --help
```

### Option 3: Install Flow into an existing project

From inside the target project root:

```bash
node /path/to/flow-network/tools/flow-install/index.mjs --yes
```

Or after cloning this repo locally:

```bash
git clone https://github.com/Flow-Research/flow-network.git
cd /path/to/your-project
node /path/to/flow-network/tools/flow-install/index.mjs --yes
```

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 9+
- Python 3.11+
- `uv`
- Git

### Repository setup

```bash
pnpm skills:validate
printf 'n\n' | pnpm skills:register
uv tool install --force ./Jarvis
jarvis --help
```

### Core commands

| Command | Purpose |
|---|---|
| `pnpm skills:validate` | Validate shared skill source and catalog consistency |
| `pnpm skills:register` | Install shared skills into `~/.agents/skills/` |
| `uv tool install --force ./Jarvis` | Install the local Jarvis CLI build |
| `node tools/flow-install/index.mjs --yes` | Install Flow into the current repo |
| `node tools/flow-install/index.mjs --dry-run` | Preview install changes |

## Architecture

### 1. Jarvis CLI

`Jarvis/` is the user-facing agent CLI.

Install paths:

- local workspace: `uv tool install --force ./Jarvis`
- GitHub: `uv tool install --force "git+https://github.com/Flow-Research/flow-network.git#subdirectory=Jarvis"`

Jarvis currently provides task planning, journaling, reading-list workflows, context operations, and Android APK tooling.

### 2. Shared skills

Shared Flow skills live in:

```text
tools/flow-install/skills/
```

These are the source of truth for reusable skills shipped by the framework.

### 3. Project-local skills

Repo-specific skills live in:

```text
.agents/skills/
```

These are not part of the shared framework. They are owned by the target project and registered globally with the generated `skills:register` script.

### 4. Generated lifecycle scripts

`flow-install` installs helper scripts into:

```text
$HOME/.scripts/
```

These power:

- `skills:register`
- `skills:validate`
- `skills:register:claude`
- `postinstall`

### 5. Context vault

Every installed project gets:

```text
.jarvis/context/
```

Important files:

- `README.md` - knowledge base protocol
- `technical-debt.md` - tracked debt register
- `skills/_catalog.md` - local discovery layer
- `scopes/_scopes.yaml` - memory scope registry
- `private/<username>/` - gitignored personal space
- `local.md.example` - machine-specific template

### 6. Memory system

The memory system is file-based and scoped.

Current core hierarchy:

- `org:<git-org>`
- `project:<repo-name>`
- `user:<username>` via `.jarvis/context/private/<username>/`

Memory file types:

- `fact`
- `decision`
- `preference`
- `event`

## Installing Flow in a Team Project

Recommended team workflow:

1. Install Flow into the repo with `flow-install`
2. Commit generated files:
   - `AGENTS.md`
   - `.jarvis/context/`
   - `flow-install.lock.json`
   - any repo-local `.agents/skills/`
3. Ask each engineer to run:

```bash
pnpm skills:register
```

or:

```bash
npm run skills:register
```

depending on the repo

4. Install Jarvis if they want the local CLI:

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-network.git#subdirectory=Jarvis"
```

## Verified Rollout Targets

The canonical layout has been applied and verified in:

- `Accelerate Africa`
- `Awadoc`
- a fresh smoke-test project

That means the installation model is no longer theoretical; it has been exercised in both real repos and a clean install target.

## Troubleshooting

### `jarvis` not found

Install or reinstall it:

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-network.git#subdirectory=Jarvis"
```

### `pnpm skills:register` does nothing

That usually means the current repo has no project-local skills in `.agents/skills/`. Shared skills are installed globally by `flow-install` already.

### Android command check

To verify the installed Jarvis includes Android support:

```bash
jarvis android avds
```

### Re-run installation into a repo

```bash
node /path/to/flow-network/tools/flow-install/index.mjs --yes
```

It is designed to be re-runnable and skip already-current parts.

## Publishing Notes

This repo is the hub/source repo for the Flow harness.

- shared skill source: `tools/flow-install/skills/`
- bootstrap entry point: `install.sh`
- Jarvis package source: `Jarvis/`

If you are extending the framework, update the shared source here first, then test installation into a downstream project.
