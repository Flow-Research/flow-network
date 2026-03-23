# Reusable Script Templates

Use this folder when creating a new reusable script that should be callable from the CLI and optionally targetable through Jarvis or a skill.

Choose the install scope before scaffolding:

- repo-local skill: `.agents/skills/<skill-name>/`
- shared/global Flow skill: `tools/flow-install/skills/<skill-name>/`

## Files

- `checklist.md` - implementation and review checklist
- `command-contract.md` - command behavior spec
- `script-template.mjs` - deterministic Node CLI starter
- `skill-wrapper.SKILL.md` - skill wrapper template for agent targeting

## Suggested flow

1. Copy `script-template.mjs` into the target location.
2. Fill in `command-contract.md` for the final interface.
3. Use `checklist.md` to verify behavior.
4. If agents should invoke it, adapt `skill-wrapper.SKILL.md` into a real skill.

If the script should be runnable from the terminal, give the executable the final command name so Flow can install it into the user-local bin directory (`$XDG_BIN_HOME` or `~/.local/bin`).
