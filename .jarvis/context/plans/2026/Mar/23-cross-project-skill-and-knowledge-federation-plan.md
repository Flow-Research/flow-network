# Cross-Project Skill and Knowledge Federation Plan

## Status

- Status: deferred
- Date: 2026-03-23
- Owner: Flow maintainer
- Scope: Flow core, installer, shared context, imported sibling projects
- Trigger: need a standard way for the main Flow project to allow and guarantee installation of skills and curated knowledge from other Flow-compatible local repositories such as `~/Documents/Code/Accelerate Africa`

## Why this plan exists

Flow Network already has a strong local model for:

- shared Flow skills distributed from `tools/flow-install/skills/`
- project-local skills in `.agents/skills/`
- repo-local context in `.jarvis/context/`

What it does not yet have is a first-class federation model for trusted sibling repositories. Today, importing skills or knowledge from another Flow-compatible repo is manual, implicit, or routed through promotion into Flow shared skills. That is too narrow for cases where:

- a sibling project already has high-value local skills
- those skills should remain owned by the sibling project
- Flow Network should be able to allow, discover, register, and use them safely
- knowledge should be imported in a curated and deterministic way without loading an entire sibling repo ad hoc

This plan captures the target architecture and rollout path for solving that problem later.

## Problem statement

We need a standard, deterministic, and auditable mechanism that lets Flow Network:

1. declare trusted sibling Flow-compatible repositories as import sources
2. install and expose selected skills from those sources across supported agent surfaces
3. ingest curated knowledge exports from those sources into Flow-readable context
4. preserve clear trust boundaries between shared Flow artifacts, sibling-owned artifacts, and private/local-only material
5. keep behavior reproducible through manifests, lockfiles, validation, and reviewable updates

## Current state

### Flow Network today

- Shared Flow skills are installed from `tools/flow-install/skills/`.
- Project-local registration only covers the current repo's `.agents/skills/`.
- OpenCode registration appends only global skills and the current repo's local skill root.
- Context loading is repo-local and tiered through `.jarvis/context/` and sub-project overrides.
- `flow-install.lock.json` tracks installed Flow components, but not imported sibling projects.

### Accelerate Africa today

- Local skills live in `.agents/skills/` and are copied into `~/.agents/skills/`.
- Project knowledge is structured cleanly under `.jarvis/context/`.
- Context scope resolution is already explicit via `.jarvis/context/scopes/_scopes.yaml`.
- The repo is already Flow-compatible enough to act as a proving ground for imports.

### Main gap

Flow currently supports:

- Flow-shared distribution
- current-repo local skills
- manual promotion of a local skill into Flow core

Flow does not yet support:

- explicit sibling-repo federation
- imported-repo lock state
- imported skill namespacing and conflict resolution
- curated knowledge exports from sibling repos

## Goals

- Make sibling imports explicit and reviewable.
- Guarantee deterministic installation through a registry plus lockfile.
- Keep local development ergonomic.
- Preserve Flow's current shared-skill lifecycle.
- Support both skills and knowledge imports.
- Keep the default trust posture conservative.

## Non-goals

- Do not auto-load arbitrary sibling `.jarvis/context/` trees.
- Do not replace the existing shared Flow skill promotion path.
- Do not allow unaudited external or remote skills by default.
- Do not create a parallel proprietary instruction format when `AGENTS.md` and `SKILL.md` already exist.

## Design principles

1. Explicit over implicit.
2. Narrow export surfaces over whole-repo scraping.
3. Registry plus lockfile over ambient path scanning.
4. Local development speed without giving up reproducibility.
5. Trust tiers for execution-bearing artifacts.
6. Reuse Flow primitives instead of inventing a second framework.

## Recommended model

Use a three-layer model.

### Layer 1: instruction plane

- `AGENTS.md`
- project and sub-project `.jarvis/context/`

This remains the primary source for repo-specific guidance.

### Layer 2: workflow plane

- `SKILL.md`
- skill manifests
- project-local or shared skill directories

This remains the primary unit of reusable agent workflow.

### Layer 3: federation plane

- import registry
- import lockfile
- curated export contract

This new layer governs what Flow may import from sibling repos and under which trust and validation rules.

## Proposed export contract for Flow-compatible sibling repos

Each sibling repo that wants to expose reusable assets should export a narrow, deliberate surface.

Suggested shape:

```text
<repo>/
  AGENTS.md
  .agents/skills/
  .flow-exports/
    manifest.json
    knowledge/
```

### Export rules

- `AGENTS.md` may be exported as reference context.
- `.agents/skills/` is the canonical exported skill surface.
- `.flow-exports/knowledge/` is the canonical exported knowledge surface.
- Full sibling `.jarvis/context/` should not be imported wholesale.
- Exported knowledge must be curated and intentionally normalized for cross-project use.

### Suggested export manifest fields

- `schemaVersion`
- `project`
- `version`
- `compatibility`
- `exports.skills`
- `exports.knowledge`
- `exports.contextFiles`
- `license`
- `maintainer`

## Proposed import contract for Flow Network

Add a first-class registry owned by Flow Network.

Suggested shape:

```text
.agents/
  registry.json
  registry.lock.json
knowledge/
  imports/
```

### `registry.json`

This is the declarative allowlist.

Each entry should define:

- source type: local path first
- canonical sibling repo path
- exported surfaces
- include/exclude lists
- trust tier
- priority
- import mode

Example model:

```json
{
  "schemaVersion": "1.0",
  "imports": [
    {
      "name": "accelerate-africa",
      "source": {
        "type": "path",
        "path": "../Accelerate Africa"
      },
      "exports": {
        "skills": ".agents/skills",
        "knowledge": ".flow-exports/knowledge",
        "agents": "AGENTS.md"
      },
      "includeSkills": [
        "build-e2e",
        "issue-flow"
      ],
      "priority": 40,
      "trust": "internal-reviewed",
      "mode": "metadata-first"
    }
  ]
}
```

### `registry.lock.json`

This is the resolved state.

Each entry should record:

- resolved absolute path
- current git commit if available
- declared version
- digest of exported assets
- resolved timestamp
- trust tier
- selected mode

## Import modes

Support two modes.

### 1. `link`

Use for local development.

- imported skills remain live-linked or directly path-referenced
- fast iteration
- best for active sibling repo development
- lower reproducibility

### 2. `vendor`

Use for stable or reviewable imports.

- import a snapshot into Flow-owned paths
- pin by commit and digest
- reproducible and CI-friendly
- slower iteration

### Recommended default

- `link` for skills during active development
- `vendor` for knowledge exports

This gives fast workflow iteration while keeping cross-project knowledge deterministic.

## Skill naming and collision rules

Imported sibling skills must not silently collide with Flow shared or local skill names.

### Rule

Namespace imported skills by source.

Recommended format:

- `accelerate-africa:build-e2e`
- `accelerate-africa:issue-flow`

### Why

- avoids accidental shadowing
- preserves origin clarity
- allows Flow to promote or wrap imported skills later without ambiguity

## Knowledge import rules

Knowledge imports should be conservative.

### What may be imported

- curated reference docs
- durable architectural notes
- stable operational patterns
- cross-project conventions that are useful from Flow's perspective

### What should not be imported directly

- private notes
- machine-specific paths
- draft scratch documents
- full sibling `.jarvis/context/` trees
- repo-local sprint noise

### Storage in Flow Network

Imported knowledge should land under:

```text
knowledge/imports/<source>/
```

This keeps imported material clearly separate from Flow-authored canonical context.

### Authority rule

Imported knowledge is advisory unless explicitly promoted into tracked Flow context.

Flow's own:

- `AGENTS.md`
- `.jarvis/context/`
- shared docs

remain authoritative for Flow behavior.

## Trust model

Treat instructions, skills, and scripts as different risk classes.

### Risk classes

- instruction plane: `AGENTS.md`, imported context docs
- workflow plane: `SKILL.md`
- execution plane: skill-owned scripts and tool-granting metadata

### Trust tiers

- `managed`
- `internal-reviewed`
- `internal-unreviewed`
- `external-disabled`

### Default safety rules

- no imports without a registry entry
- no script execution from imported skills unless trust policy allows it
- canonicalize paths and reject path escapes
- resolve symlinks before approval
- validate digests and lock state before refresh
- require explicit invocation or higher trust for side-effect-heavy imported skills

## Deterministic loading order

Recommended precedence:

1. managed Flow/org policy
2. user/global skills
3. Flow Network local instructions and local context
4. explicitly imported sibling assets in registry order
5. nearest nested project overrides
6. on-demand supporting references

For imported knowledge, Flow local context should always win.

## Required validation and verification

Add validation for the federation layer.

### Registry validation

- schema validity
- source path exists
- exported paths exist
- no path or symlink escape beyond approved root
- no duplicate import names
- no duplicate imported names after namespacing rules are applied

### Lockfile validation

- lock matches current registry intent
- commit and digest fields are present
- imported snapshot or link target resolves cleanly

### Skill validation

- imported skill namespaced correctly
- manifest consistency
- command/template path rules preserved
- trust policy honored

### Knowledge validation

- no secrets
- no private or machine-specific paths
- clear provenance retained
- imported content remains separate from canonical Flow context unless manually promoted

## Integration points in Flow Network

The likely integration surface is:

- `tools/flow-install/lib/skills.mjs`
  - extend shared-skill install logic to resolve registry-driven sibling sources
- `scripts/flow/register-skills.mjs`
  - extend project-local registration to include imported sibling exports
- `flow-install.lock.json`
  - extend to track imported-project inventory and resolved import state
- OpenCode config update path
  - extend `skills.paths` behavior or generate imported install material deterministically
- `.jarvis/context/docs/skill-promotion-maintainer-playbook.md`
  - keep promotion as a deliberate path alongside federation, not as a replacement

## Rollout plan

### Phase 1: define the contract

Deliverables:

- sibling export manifest schema
- Flow import registry schema
- Flow import lockfile schema
- namespacing and trust policy docs

Success criteria:

- import/export model is documented and reviewable
- no code changes required yet

### Phase 2: implement registry-driven skill imports

Deliverables:

- `registry.json`
- `registry.lock.json`
- import-aware registration command
- imported skill namespacing

Success criteria:

- Flow can register selected sibling skills from one approved local repo
- imported skills appear deterministically across agent surfaces

### Phase 3: implement curated knowledge imports

Deliverables:

- sibling knowledge export contract
- `knowledge/imports/<source>/` materialization path
- validation for imported knowledge

Success criteria:

- Flow can ingest curated sibling knowledge without treating it as authoritative local context

### Phase 4: pilot with Accelerate Africa

Pilot source:

- `~/Documents/Code/Accelerate Africa`

Pilot scope:

- import a small set of proven skills
- import a small curated knowledge slice
- validate namespacing, trust, and update behavior

Success criteria:

- sibling import works end-to-end without manual copy/paste steps
- imported artifacts remain clearly source-owned

### Phase 5: harden and productize

Deliverables:

- CI checks for registry and lock state
- stale lock detection
- stronger collision checks
- docs for maintainers and downstream repos

Success criteria:

- multiple sibling repos can be imported safely
- failures are deterministic and visible

## Pilot recommendation for Accelerate Africa

Use Accelerate Africa as the first proving ground because it already demonstrates:

- real project-local skill usage
- strong `.jarvis/context/` hygiene
- Flow-compatible conventions

Recommended pilot defaults:

- mode: `link` for skills
- mode: `vendor` for exported knowledge
- trust: `internal-reviewed`
- imported skills namespaced with `accelerate-africa:`

## Open questions to resolve during implementation

1. Should imported sibling skills be surfaced only via namespaced commands, or also via local aliases?
2. Should imported `AGENTS.md` content be materialized into `knowledge/imports/` or loaded directly from source path?
3. Should imported skills always be copied into `~/.agents/skills/`, or should some agent surfaces use direct path references?
4. How much of the current `flow-install.lock.json` should be reused versus split into a dedicated registry lockfile?
5. What is the exact review bar for upgrading `internal-unreviewed` imports to `internal-reviewed`?

## Risks and failure modes

- imported skills silently shadow local or shared Flow skills
- sibling repos mutate underneath a live import and create non-reproducible behavior
- imported scripts widen execution privileges unexpectedly
- imported knowledge pollutes canonical Flow context
- registry drift and lock drift cause hard-to-debug surface differences

## Mitigations

- namespacing
- lockfile with digest and commit
- trust-tiered execution rules
- separate storage for imported knowledge
- explicit sync/update commands instead of ambient mutation

## External references used in research

- Anthropic Claude Code skills: `https://docs.anthropic.com/en/docs/claude-code/skills`
- Anthropic Claude Code memory/loading: `https://docs.anthropic.com/en/docs/claude-code/memory`
- AGENTS.md standard: `https://agents.md/`
- Agent Skills specification: `https://agentskills.io/specification`
- XDG Base Directory spec: `https://specifications.freedesktop.org/basedir-spec/latest/`
- Semantic Versioning: `https://semver.org/`
- JSON Schema: `https://json-schema.org/draft/2020-12`

## Follow-on standards created during execution

The execution work for adopting AA's delivery model as a Flow standard introduced supporting Flow docs that should be treated as the correctness and portability contracts for the next implementation waves:

- `.jarvis/context/docs/flow-delivery-profile-standard.md`
- `.jarvis/context/docs/flow-regression-artifact-standard.md`
- `.jarvis/context/docs/flow-delivery-verification-standard.md`
- `.jarvis/context/templates/flow-delivery-profile.json`

## Decision for now

Do not implement this immediately.

The plan is intentionally saved in tracked Flow context so it can be resumed later as a Flow-core change with a proper review path. Until then:

- keep using the existing shared-skill promotion path for universally reusable skills
- keep sibling-repo knowledge sharing manual and curated
- avoid ad hoc hidden federation logic
