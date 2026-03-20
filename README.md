# Flow Network

Flow Network is a reusable agent harness for software projects.

It gives any repository a working AI operating layer with:

- `jarvis` CLI in the user's PATH
- shared Flow skills installed globally
- project-specific skills vendored in `.agents/skills/`
- lifecycle scripts for skill registration, validation, and local setup
- verification tooling for OpenCode and Claude Code parity
- a scoped memory system in `.jarvis/context/scopes/`
- personal context and private space under `.jarvis/context/`
- a shared context vault and knowledge base protocol
- a minimal root `AGENTS.md` pointer plus full protocol in `.jarvis/context/AGENTS.md`

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
│       ├── AGENTS.md
│       ├── technical-debt.md
│       ├── skills/_catalog.md
│       ├── scopes/_scopes.yaml
│       ├── private/<username>/
│       └── ...
└── package.json scripts
    ├── skills:register
    ├── skills:validate
    ├── harness:verify
    └── postinstall
```

Shared/core skills are sourced from `tools/flow-install/skills/` and installed into `~/.agents/skills/`.
Project-specific skills stay in each repo's `.agents/skills/` directory and are copied into `~/.agents/skills/` by the generated scripts, which also refresh Claude Code and OpenCode registration.

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
- installs repo-local lifecycle scripts plus global support directories
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

From the target project root, use in-place mode:

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash -s -- --here
```

This mode:

- treats the current directory as the install target
- installs `jarvis`
- fetches or updates a cached `flow-network` checkout used as installer source
- prompts once per file type for install destinations unless `--yes` is used
- patches the current repository with a minimal `AGENTS.md` pointer block, the context vault, memory scopes, project-local lifecycle scripts, and package scripts
- skips community skill installation by default for a lean existing-project install

You can also target another repo explicitly:

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash -s -- --target "/path/to/project"
```

If you want to rerun the destination prompts for a repo that already has `flow-install.lock.json`:

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash -s -- --here --reconfigure
```

Local equivalent:

```bash
node /path/to/flow-network/tools/flow-install/index.mjs --yes --target /path/to/project
```

Or after cloning this repo locally and running from the project root:

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
pnpm skills:register
pnpm harness:verify
uv tool install --force ./Jarvis
jarvis --help
```

### Core commands

| Command | Purpose |
|---|---|
| `pnpm skills:validate` | Validate shared skill source and catalog consistency |
| `pnpm skills:register` | Copy project-local skills into `~/.agents/skills/` and refresh OpenCode + Claude registration |
| `pnpm skills:register:claude` | Rebuild Claude marketplace metadata from `~/.agents/skills/` |
| `pnpm harness:verify` | Verify repo, OpenCode, and Claude harness parity |
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

`flow-install` installs helper scripts into the project in a configurable folder.

Default:

```text
scripts/flow/
```

These power:

- `skills:register`
- `skills:validate`
- `skills:register:claude`
- `harness:verify`
- `postinstall`

Global convenience scripts are still installed into `$HOME/.scripts/`, but committed project wiring uses repo-local script paths so CI stays portable.

## Harness Verification

The install is only considered complete when both agent surfaces resolve the same harness.

Run:

```bash
pnpm skills:register
pnpm harness:verify
```

`pnpm harness:verify` checks:

- Flow section present in `AGENTS.md`
- full Flow protocol present in `.jarvis/context/AGENTS.md`
- core context and memory files under `.jarvis/context/`
- generated lifecycle scripts exist
- `package.json` wiring is present
- `jarvis` is available in `PATH`
- `~/.agents/skills/` exists
- lockfile components are recorded
- every shipped Flow core skill is installed globally and accessible to both OpenCode and Claude Code
- OpenCode `skills.paths` includes the required paths
- Claude marketplace and enabled plugin state exist
- project-local skills, if present, are visible to both agents
- community skills are checked from `flow-install.lock.json` using warn-or-strict behavior based on `communitySkills.strict`
- `community-skills-install --full` is validated from persisted inventory metadata in `~/.agents/community-install.json` and, when available, `flow-install.lock.json`

### 5. Context vault

Every installed project gets:

```text
.jarvis/context/
```

Important files:

- `README.md` - knowledge base protocol
- `AGENTS.md` - full Flow agent protocol for the installed repo
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

1. From the target repo root, install Flow in place:

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash -s -- --here
```

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

If Flow ships a newer protocol block for `.jarvis/context/AGENTS.md`, reinstall will only notify you.
It will not overwrite that file automatically. To apply the newer managed block explicitly:

```bash
node tools/flow-install/index.mjs --update-context-agents
```

4. Install Jarvis if they want the local CLI:

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-network.git#subdirectory=Jarvis"
```

## Installation Validation

The canonical layout has been validated both in fresh installs and in existing repositories.

That means the installation model is no longer theoretical; it has been exercised in clean bootstrap flows and existing-project installs.

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

If you are extending the framework, update the shared source here first, then test installation into a fresh target repo or sandbox project.
