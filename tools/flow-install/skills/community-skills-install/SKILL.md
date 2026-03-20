---
name: community-skills-install
description: "Install community skills from antigravity-awesome-skills with bundle filtering and catalog merging."
disable-model-invocation: true
allowed-tools: Bash
argument-hint: "[--bundle <name>] [--all] [--full] [--check] [--list]"
---

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/community-skills-install/`.

# Community Skills Install

Install community skills from the [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) repository into your skills registry.

## What This Does

This skill enables you to:

1. **Clone/Pull** the community skills repository (`~/antigravity-skills/`)
2. **Browse Bundles** - View 26 curated skill bundles (Web Wizard, Security Engineer, etc.)
3. **Filter Skills** - Select specific bundles or skill categories
4. **Install Skills** - Copy selected skills to `~/.agents/skills/`
5. **Merge Catalog** - Add community entries to your `_catalog.md`
6. **Validate** - Run skill-validate on new skills

## Configuration

| Setting | Default |
|---------|---------|
| Community repo | `~/antigravity-skills/` |
| Install location | `~/.agents/skills/` |
| Catalog | `.jarvis/context/skills/_catalog.md` (bundle modes only; `--full` skips catalog) |
| Behavior | Prompts before each install (`--full` is non-interactive) |

## Usage

### Interactive Mode (Recommended)

```
/install-skills
```

This will:
1. Check if community repo exists (clone if not)
2. Pull latest changes (if exists)
3. Show available bundles
4. Prompt you to select bundle(s)
5. Install selected skills
6. Update catalog
7. Validate and register

### Command Flags

| Flag | Description |
|------|-------------|
| `--bundle <name>` | Install specific bundle (e.g., "Web Wizard") |
| `--all` | Install all bundled skills (~150 curated) |
| `--full` | Install ALL community skills (~1250). Non-interactive. Used by `install.sh` during Flow setup. |
| `--check` | Check for updates without installing |
| `--list` | List available bundles |

### Examples

```bash
# Interactive - prompts for bundle selection
/install-skills

# Install specific bundle
/install-skills --bundle "Web Wizard"

# Install multiple bundles
/install-skills --bundle "Web Wizard" --bundle "Security Developer"

# Check for updates only
/install-skills --check

# List all available bundles
/install-skills --list

# Install all bundled skills (~150 curated)
/install-skills --all

# Install ALL community skills (~1250, used during Flow install)
/install-skills --full
```

## Available Bundles

| Bundle | Skills | Description |
|--------|--------|-------------|
| Essentials | 5 | Core skills for everyone |
| Security Engineer | 7 | Pentesting & auditing |
| Security Developer | 6 | Secure coding practices |
| Web Wizard | 7 | Modern web apps |
| Web Designer | 6 | Pixel-perfect UI |
| Full-Stack Developer | 7 | End-to-end web dev |
| Agent Architect | 6 | AI agent systems |
| LLM Application Developer | 5 | Production LLM apps |
| Indie Game Dev | 6 | Game development |
| Python Pro | 7 | Backend & data |
| TypeScript & JavaScript | 5 | Modern JS/TS |
| Systems Programming | 5 | Low-level code |
| Startup Founder | 6 | Product & growth |
| Business Analyst | 5 | Data-driven decisions |
| Marketing & Growth | 6 | User acquisition |
| DevOps & Cloud | 7 | Infrastructure |
| Observability & Monitoring | 6 | Production reliability |
| Data & Analytics | 6 | Analytics & SQL |
| Data Engineering | 5 | Data pipelines |
| Creative Director | 6 | Visuals & content |
| QA & Testing | 7 | Quality assurance |
| Mobile Developer | 5 | iOS/Android/React Native |
| Integration & APIs | 5 | Service connections |
| Architecture & Design | 5 | System design |
| DDD & Evented | 8 | Domain-driven design |
| OSS Maintainer | 7 | Open source workflows |
| Skill Author | 6 | Creating skills |

## Output

The skill returns structured JSON:

```json
{
  "success": true,
  "installed": ["frontend-design", "react-best-practices", ...],
  "skipped": ["existing-skill"],
  "catalogUpdated": true,
  "registered": true
}
```

## Dependencies

- `git` - For cloning/pulling the repository
- `skill-validate` - For validating new skills (optional)
- `pnpm skills:register` - For registering skills with OpenCode

## Notes

- In bundle modes (`--all`, `--bundle`), skills are added to the catalog with `type: community` and `owner: community`
- In `--full` mode, catalog merge is skipped (too many entries). Skills are discovered directly from `~/.agents/skills/` and inventory metadata is written to `~/.agents/community-install.json`.
- Existing skills are skipped (not overwritten) to prevent conflicts with project skills
- The community repo is stored at `~/antigravity-skills/` (persistent, user-managed)
- Bundle modes require user confirmation. `--full` mode is non-interactive (designed for automated install scripts).
