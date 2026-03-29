# Flow Network — Installation and Distribution

**Date:** 2026-03-16 (started), 2026-03-17 (distribution design added)
**Status:** Phases 0-9 implemented locally. GitHub publication remains the final release step.
**Scope:** Making Flow an installable agent harness, distributed via GitHub
**Resolves:** TD-003 (Jarvis CLI distribution model)

## Objective

Any developer, contributor, or user should be able to set up a complete Flow workspace with one command. Jarvis should be installable independently for use in any project. The workspace comes with skills, scripts, memory, personal context, a shared context vault, and agent instructions — all wired up.

As of 2026-03-19, the local implementation is complete: `flow-install` is the installer, `install.sh` is the bootstrap entry point, shared skills are sourced from `tools/flow-install/skills/`, and pilot projects have both been migrated to the canonical layout. The only remaining external step is publishing the hub repo so the GitHub URLs in this plan become live.

## What "Installing Flow" Means

Flow is an **agent harness** — a reusable infrastructure layer that gives any project:

1. **Jarvis CLI** in the user's PATH
2. **Skills system** (project skills + community skills)
3. **Scripts** for skill registration, validation, and local setup
4. **Memory system** (scoped, hierarchical, persistent across sessions)
5. **Personal context** (gitignored preferences, local paths, private space)
6. **Shared context vault** (`.jarvis/context/` with the knowledge base protocol)
7. **AGENTS.md** at root with project-specific instructions

## Current State

| Component | Location | Git Remote | On GitHub? |
|---|---|---|---|
| Flow Network (workspace root) | `Flow Network/` | Local working tree; hub repo structure ready | Not yet |
| Jarvis CLI | `Flow Network/Jarvis/` | Installable locally, GitHub-ready metadata | Not yet |
| Flow Core (Rust) | `Flow Network/Flow/` | `Flow-Research/Flow` | Yes |
| Flow Platform POC | `Flow Network/Focus/Flow/` | `Flow-Research/work-stream` | Yes |

The workspace root is structured for hub-repo publication, but is not yet pushed to GitHub. Jarvis is installable locally via `uv tool install ./Jarvis`, `flow-install` installs the framework into other projects, and `install.sh` defines the bootstrap flow. Nobody else can install Flow or Jarvis from a URL until the hub repo is published.

## Completed Work (Phases 0-5)

| Phase | Summary | Date | Status |
|---|---|---|---|
| **0: Immediate Fixes** | Fixed Jarvis alias, removed all `CLAUDE.md` files, standardized on `AGENTS.md` | 2026-03-16 | Done |
| **0.5: Pre-existing Issues** | Replaced `.gitignore` (was ignoring entire `.jarvis/`), fixed stale `Flow/CLAUDE.md` reference in AGENTS.md | 2026-03-17 | Done |
| **1: Scripts and Skill Infrastructure** | Created lifecycle scripts (`scripts/`), root `package.json`, and canonical shared skill source in `tools/flow-install/skills/` | 2026-03-17 | Done |
| **2: Core Skills Seeding** | Copied 17 skills from AA + Jarvis skill. Created `_catalog.md` with 18 entries. All validated and registered. | 2026-03-17 | Done |
| **3: Personal Context and Setup** | Created `local.md.example`, personal context protocol doc, `setup-local.mjs` wizard, context subdirectories | 2026-03-17 | Done |
| **5: AGENTS.md Enhancement** | Added skill protocol, tech debt law, personal context section. Created `technical-debt.md` register. | 2026-03-17 | Done |

### Resolved Open Questions from Phases 0-5

| Question | Resolution |
|---|---|
| Root `package.json` for a non-Node workspace? | Yes — minimal `package.json` with lifecycle scripts only. Works well with `pnpm run`. |
| Copy skills from AA or shared repo? | Copy for now. Tracked as TD-001 (drift risk). Shared source repo is the long-term answer. |
| Jarvis skill location? | Consolidated to `tools/flow-install/skills/jarvis/`. |

## Distribution Architecture

### Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | **Hub repo** — workspace root pushed as `Flow-Research/flow-network`. Sub-projects stay in their own repos. | Clean separation. Sub-projects have independent histories. Hub tracks shared infrastructure. |
| Bootstrap mechanism | **Shell script** (`install.sh`) for first-time setup. Jarvis for ongoing management. | Avoids chicken-and-egg problem. Shell script requires only `curl` + `bash`. |
| Jarvis distribution | `uv tool install` from GitHub with `#subdirectory=Jarvis` | Native Python tooling. Isolated install. No PyPI publish needed yet. |

### Target User Experience

**First-time full setup (new machine, new contributor):**

```bash
curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash
```

This single command:
1. Checks for / installs `uv` (Python package manager)
2. Checks for `node` + `pnpm` (warns if missing; needed for skill scripts)
3. Clones `Flow-Research/flow-network` to `~/flow-network/` (or user-specified dir)
4. Installs Jarvis globally: `uv tool install ./Jarvis`
5. Runs `pnpm setup --yes-all` (creates context dirs, personal files)
6. Registers skills: `pnpm skills:register`
7. Optionally clones sub-projects (Flow Core, work-stream) into the workspace
8. Prints summary and next steps

**Installing just Jarvis (for use in other projects like AA):**

```bash
uv tool install "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis"
```

**Updating Jarvis:**

```bash
uv tool install --force "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis"
```

**Running Jarvis without installing (one-off):**

```bash
uvx --from "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis" jarvis --help
```

### GitHub Repo Structure

```
Flow-Research/flow-network (hub repo)
│
├── AGENTS.md                    # Agent instructions for the workspace
├── package.json                 # Lifecycle scripts (setup, skills:register, etc.)
├── install.sh                   # Bootstrap script (the one-liner entry point)
├── .gitignore                   # Excludes sub-project repos + personal context
│
├── scripts/                     # Skill lifecycle scripts
│   ├── skills-root.config.json
│   ├── skills-root.mjs
│   ├── register-opencode-skills.mjs
│   ├── validate-skills.mjs
│   ├── sync-opencode-rules.mjs
│   └── setup-local.mjs
│
├── tools/flow-install/skills/   # 18 shared agent skills (source of truth)
│   ├── build-e2e/
│   ├── brainstorm/
│   ├── jarvis/
│   └── ... (15 more)
│
├── .jarvis/context/             # Shared context vault (tracked)
│   ├── README.md
│   ├── projects.md, status.md, roadmap.md, team.md, decisions.md, ...
│   ├── docs/
│   ├── plans/
│   ├── skills/_catalog.md
│   ├── local.md.example         # Template (tracked)
│   └── local.md                 # Personal (gitignored)
│
├── Jarvis/                      # CLI source (installable via uv tool install)
│   ├── pyproject.toml
│   ├── src/jarvis/
│   └── tests/
│
│  ── Sub-projects (gitignored, cloned separately) ──
├── Flow/                        # → Flow-Research/Flow (Rust P2P engine)
├── Focus/Flow/                  # → Flow-Research/work-stream (POC)
├── knowledge-base/              # → local only for now
└── (experimental dirs)          # → gitignored
```

### `.gitignore` for Hub Repo

```gitignore
# Sub-project repos (separate git repos, cloned into workspace)
Flow/
Focus/
knowledge-base/
anytype/
anytype-automation/
automerge-go/
automerge-repo-quickstart/
flow-demo/
Flow-bkp/

# Personal context (gitignored per personal-context-protocol)
.jarvis/context/local.md
.jarvis/context/private/

# Agent tool working directories
.claude/
.opencode/

# Editor / IDE / OS
.obsidian/
.jarvis/context/.obsidian/
.vscode/
.idea/
.DS_Store

# Environment files
.env
.env.local
.env.*.local

# Dependencies / build
node_modules/
dist/
build/
.next/
target/

# Python
__pycache__/
*.pyc
.venv/
.mypy_cache/
.ruff_cache/
.pytest_cache/
.coverage

# Logs
*.log
```

### `install.sh` Design

**Principles:**
- Idempotent (safe to re-run, skips completed steps)
- Non-destructive (never overwrites without asking)
- Minimal prerequisites (only `curl` + `bash`)
- Works on macOS and Linux
- Inspectable (`curl URL | less` before piping to bash)

**Script flow:**

```
1. Detect platform (macOS / Linux) and architecture
2. Check for uv
   ├── Found → continue
   └── Not found → install via: curl -LsSf https://astral.sh/uv/install.sh | sh
3. Check for node + pnpm
   ├── Found → continue
   └── Not found → warn (skills registration will be skipped)
4. Prompt for install directory (default: ~/flow-network)
5. Clone Flow-Research/flow-network into target dir
   ├── Dir exists with .git → git pull
   └── Dir doesn't exist → git clone
6. Install Jarvis globally
   └── uv tool install --force ./Jarvis
7. Run local setup (if pnpm available)
   └── pnpm setup --yes-all
8. Register project skills (if pnpm available)
   └── pnpm skills:register
9. Install all community skills
   └── node tools/flow-install/skills/community-skills-install/scripts/main.js --full
   └── Installs ~1,250 skills to ~/.agents/skills/ (non-interactive, skips existing)
10. Prompt: clone sub-projects?
   ├── Flow Core (Rust) → git clone Flow-Research/Flow into Flow/
   ├── WorkStream (POC) → git clone Flow-Research/work-stream into Focus/Flow/
   └── Skip
11. Print summary
```

**Environment variables:**

| Var | Default | Purpose |
|---|---|---|
| `FLOW_INSTALL_DIR` | `~/flow-network` | Where to clone the workspace |
| `FLOW_SKIP_SUBPROJECTS` | unset | Set to `1` to skip sub-project clone prompt |
| `FLOW_NONINTERACTIVE` | unset | Set to `1` for fully non-interactive install |

### Jarvis `pyproject.toml` Updates

```toml
[project]
name = "jarvis-scheduler"
description = "AI-powered personal agent CLI for task scheduling, journaling, and economic coordination"

[project.urls]
Homepage = "https://github.com/Flow-Research/flow-network"
Repository = "https://github.com/Flow-Research/flow-network"
Issues = "https://github.com/Flow-Research/flow-network/issues"
Documentation = "https://github.com/Flow-Research/flow-network/tree/main/Jarvis"
```

### AGENTS.md Updates

Add an "Installation" section near the top:

```markdown
## Installation

### Full workspace setup (recommended)

    curl -fsSL https://raw.githubusercontent.com/Flow-Research/flow-network/main/install.sh | bash

### Jarvis CLI only

    uv tool install "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis"

### Prerequisites

- macOS or Linux
- curl and bash (pre-installed on both)
- uv (installed automatically by the bootstrap script)
- node 20+ and pnpm (optional; needed for skill registration)
```

## Execution Plan (Remaining Work)

### Phase 6: Prepare the Hub Repo

1. Initialize git in workspace root: `git init`
2. Update `.gitignore` with sub-project exclusions (as specified above)
3. Update `Jarvis/pyproject.toml` with GitHub URLs
4. Create initial commit with all tracked files
5. Create `Flow-Research/flow-network` repo on GitHub
6. Add remote and push

**Validation:** `git status` is clean. Repo is visible on GitHub. Sub-project dirs are excluded.

### Phase 7: Create Bootstrap Script

1. Write `install.sh` following the design above
2. Make it executable: `chmod +x install.sh`
3. Commit and push

**Validation:** From a fresh directory, `bash install.sh` completes successfully. `jarvis --version` works.

### Phase 8: Test Remote Installation

1. Test `uv tool install "git+https://github.com/Flow-Research/flow-network#subdirectory=Jarvis"` from outside the repo
2. Test `curl ... | bash` bootstrap from a fresh directory
3. Verify Jarvis connects to AnyType after install
4. Verify skills register correctly

**Validation:** All install paths work. `jarvis status` shows connected.

### Phase 9: Update Documentation

1. Add "Installation" section to root AGENTS.md
2. Update `Jarvis/README.md` with install instructions
3. Resolve TD-003 in technical debt register
4. Update the roadmap plan (Phase 1 item 5)

**Validation:** A new contributor can follow the README and have a working environment in under 5 minutes.

### Deferred: Memory System Generalization

The memory spec at `Jarvis/specs/08_agent-memory-system/` has AA-specific scope hierarchies (`org:pilot-project-a`, `project:aa-platform`, `app:admin`). Needs generalization to work for any project.

| # | Task | Notes |
|---|------|-------|
| 1 | Refactor scope model | Replace AA-specific scopes with generic `org:*`, `project:*`, `app:*` patterns |
| 2 | Update `_scopes.yaml` examples | Use Flow Network as default example |
| 3 | Ensure file-based Phase 1 works for any project | Not just AA's monorepo structure |
| 4 | Move generalized spec | Accessible from both Flow and any installed project |

### Community Skills — Done (2026-03-17)

Community skills installation is now part of the bootstrap process. The `community-skills-install` skill was extended with a `--full` flag that installs all ~1,250 community skills from `antigravity-awesome-skills` to `~/.agents/skills/` non-interactively. This runs as step 9 of `install.sh`.

Verified: 1,284 total skills in `~/.agents/skills/` (18 project + ~1,250 community + overlap).

## Open Questions

1. **GitHub visibility:** Should `flow-network` be public from the start? The context vault contains architecture decisions, plans, and competitive positioning. If private, the `curl | bash` install requires authentication.

2. **Jarvis package name:** Currently `jarvis-scheduler`. If we publish to PyPI later, `jarvis` is likely taken. Options: `flow-jarvis`, `jarvis-flow`, `jarvis-agent`. Not urgent since we're installing from GitHub, not PyPI.

3. **Credential in git remotes:** The existing sub-project remotes (`Flow/`, `Focus/Flow/`) have a GitHub PAT embedded in the URL. The install script should use HTTPS without embedded credentials (users authenticate via `gh auth` or SSH).

4. **Node.js dependency:** The skill lifecycle scripts require Node.js. Should we rewrite them in Python (Jarvis can run them) to remove the Node dependency? This would simplify the install to just `uv` + `bash`.

## Technical Debt Impact

| ID | Status Change | Notes |
|---|---|---|
| FN-TD-003 | open → resolved (when Phase 9 completes) | Jarvis distribution via `uv tool install` from GitHub. Bootstrap script for full workspace. |
| FN-TD-001 | unchanged | Skills still copied from AA. Separate source repo question remains. |
| FN-TD-002 | unchanged | Memory system generalization deferred. |

## References

- Flow roadmap: `plans/2026/Mar/17-flow-roadmap.md`
- Flow overview: `docs/flow-overview.md`
- POC architecture: `docs/flow-poc-architecture.md`
- uv tool install docs: https://docs.astral.sh/uv/guides/tools/
- pip VCS subdirectory support: PEP 508 URL fragments
