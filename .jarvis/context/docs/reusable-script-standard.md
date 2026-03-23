# Reusable Script Standard

## Purpose

Standardize how contributors create reusable automation that can be:

- called directly from the command line,
- wrapped by a skill for agent targeting, or
- promoted into a first-class Jarvis command.

This keeps deterministic logic in one place, makes behavior testable, and avoids duplicating business logic across scripts, skills, and Jarvis.

If a reusable script is intended for terminal use, it must also be exposed as a PATH-callable command via Flow-managed installation into the user-local bin directory.

## Core Rule

Build the deterministic executable first. Then add the thinnest possible integration layer for humans or agents:

1. script for direct CLI usage,
2. skill wrapper for agent targeting,
3. Jarvis command only when the workflow is part of Jarvis's stable product surface.

## Decision Matrix

| Use case | Default implementation | Why |
|---|---|---|
| Humans mostly run it from shell | Script + command contract | Fastest path, easiest to test |
| Agents need to target it semantically | Script + skill wrapper | Preserves one source of truth |
| Core Jarvis workflow used repeatedly | Script + Jarvis subcommand | Keeps Jarvis UX stable without duplicating logic |
| One-off repo lifecycle task | Root `scripts/` utility | Fits existing workspace conventions |
| Skill-owned helper logic (repo-local) | `.agents/skills/<name>/scripts/` | Best for repo-specific automation |
| Skill-owned helper logic (shared/global) | `tools/flow-install/skills/<name>/scripts/` | Best for shared Flow-distributed skills |

## Required Artifacts

Every reusable script should ship with the following artifacts.

### 1. Deterministic executable

- Put repo-level lifecycle utilities in `scripts/`.
- Put skill-owned runtime helpers in `.agents/skills/<skill-name>/scripts/`.
- Prefer Node `.mjs`, Python, or POSIX shell based on the environment the repo already supports.
- Keep orchestration and judgment out of the script when possible.
- If the script should be runnable directly from a shell, name the executable after the final command and make it executable so Flow can install it into the user-local bin directory (`$XDG_BIN_HOME` or `~/.local/bin`).

### 2. Command contract

Document:

- purpose,
- arguments and flags,
- expected input format,
- output format,
- exit codes,
- examples,
- required environment variables,
- side effects.

Use the template in `.jarvis/context/templates/reusable-script/command-contract.md`.

### 3. Validation

- Unit test deterministic behavior where practical.
- Add at least one smoke-test command example.
- Validate both normal text output and `--json` behavior if supported.

### 4. Optional wrapper

- Add a skill wrapper when agents should invoke the script through intent-level language.
- Add a Jarvis command when the feature belongs in Jarvis itself.

## Interface Rules

### CLI behavior

Every reusable script should:

- support `--help`,
- support `--json` when results need agent consumption,
- write machine-readable output to stdout,
- write errors and diagnostics to stderr,
- exit `0` on success and non-zero on failure,
- avoid interactive prompts unless explicitly designed for human-only flows,
- if terminal-callable, resolve to a command installed through the user-local bin directory.

### Input rules

- Prefer explicit flags over positional ambiguity.
- Accept file paths as absolute or workspace-relative paths.
- Fail fast when required inputs are missing.
- Document all required env vars instead of assuming local setup.

### Output rules

- Human-readable mode should be concise and scannable.
- JSON mode should be stable and versionable.
- Include a top-level `ok` field in JSON output when it helps callers branch safely.
- Do not mix human chatter into JSON mode.

## Placement Rules

### Root scripts

Use `scripts/` only for repository-level lifecycle tooling such as setup, registration, validation, sync, or bootstrap flows.

Examples in this repo:

- `scripts/setup-local.mjs`
- `scripts/flow/register-skills.mjs`
- `scripts/flow/validate-skills.mjs`

### Skill-owned scripts

Use `.agents/skills/<skill-name>/scripts/` for repo-local skills and `tools/flow-install/skills/<skill-name>/scripts/` for shared/global Flow skills.

Requirements:

- keep the script narrow and deterministic,
- document the input/output contract in `SKILL.md`,
- reference command docs using installed paths such as `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/<file-name>.md`,
- keep the repository path and manifest `location` aligned with the chosen install scope,
- when terminal-callable, use the final command name as the executable filename so installation can create a PATH-visible command,
- re-run `pnpm skills:register` after adding or updating project-local skills.

### PATH exposure

Flow-managed terminal commands are installed into the user-local bin directory.

- Resolution order: `$XDG_BIN_HOME` if set, otherwise `~/.local/bin`.
- Shared/global skill scripts should be installed there by `flow-install`.
- Repo-local skill scripts should be installed there by `pnpm skills:register`.
- Installers must not overwrite an unrelated existing command in the local bin directory; they should warn and skip instead.
- Avoid filename collisions with lifecycle scripts or existing command shims.
- Command contracts should state the final shell command explicitly.

### Jarvis integration

Promote a script into Jarvis only if at least one of these is true:

- the workflow is part of Jarvis's long-term product surface,
- users will expect it beside existing Jarvis task, journal, plan, or object commands,
- the command benefits from Jarvis config, context, or adapter abstractions.

If you add or change a Jarvis command, update all of:

- `Jarvis/src/jarvis/cli.py`,
- `Jarvis/AGENTS.md`,
- `tools/flow-install/skills/jarvis/commands/jarvis.md`,
- installed artifacts via `pnpm skills:register` and `uv tool install --force ./Jarvis` when behavior materially changes.

## Standard Workflow

1. Define whether the capability is `script-only`, `skill-wrapped`, or `jarvis-native`.
2. Implement deterministic logic in a script.
3. Add `--help` and `--json` support when relevant.
4. Write the command contract.
5. Add tests or smoke-test commands.
6. Add the wrapper layer only if needed.
7. Register skills if a project-local skill was added or changed.
8. Verify the full invocation path.

## Verification Checklist

- Direct CLI invocation works from the documented location.
- `--help` output is accurate.
- `--json` output is valid JSON.
- Errors return non-zero exit codes.
- If terminal-callable, the command is installed into the user-local bin directory and available on `PATH`.
- Wrapper docs point to the same script and do not re-implement logic.
- `pnpm skills:register` has been run if a project-local skill changed.
- Jarvis docs are refreshed if a Jarvis command changed.

## Anti-Patterns

Avoid these:

- writing the same business logic once in a script and again in a skill,
- making agent wrappers call undocumented shell fragments,
- hiding required configuration in personal notes or chat history,
- creating a Jarvis command for a one-off internal helper,
- returning free-form prose when the caller expects machine-readable output,
- putting skill runtime helpers in root `scripts/`.

## Templates

Use the starter files in `.jarvis/context/templates/reusable-script/`:

- `checklist.md`
- `command-contract.md`
- `script-template.mjs`
- `skill-wrapper.SKILL.md`

## Example Promotion Path

1. Start with a deterministic script in `scripts/` or `.agents/skills/<name>/scripts/`.
2. Wrap it with a skill if agents need semantic routing.
3. Promote it into Jarvis only after the workflow proves durable and broadly useful.
