# Command: install-skills

Install community skills from antigravity-awesome-skills repository.

## Synopsis

```
install-skills [flags]
```

## Description

This command clones or pulls the community skills repository and installs selected skill bundles into your OpenCode skills registry.

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--bundle` | `-b` | string | Bundle name to install (can be specified multiple times) |
| `--all` | `-a` | boolean | Install all community skills |
| `--full` | `-f` | boolean | Install the full community inventory non-interactively |
| `--check` | `-c` | boolean | Check for updates without installing |
| `--list` | `-l` | boolean | List available bundles |
| `--help` | `-h` | boolean | Show help |

## Examples

```bash
# Interactive install (prompts for bundle selection)
install-skills

# Install specific bundle
install-skills --bundle "Web Wizard"

# Install multiple bundles
install-skills --bundle "Web Wizard" --bundle "Security Developer"

# Check for updates
install-skills --check

# List available bundles
install-skills --list

# Install all skills
install-skills --all

# Install the full community inventory
install-skills --full
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Git not found |
| 3 | Network error |
| 4 | Bundle not found |

## Notes

- Requires `git` to be installed
- Community repo cloned to `~/antigravity-skills/`
- Skills installed to `~/.agents/skills/`
- Full-install inventory metadata written to `~/.agents/community-install.json`
- Always prompts user before installing unless `--full` is specified
